<?php
/**
 * EGO LIMITED API — front controller (Milestone 1: Auth & roles).
 * Stack: PHP + MySQL (mysqli — this host has no pdo_mysql). Token auth via
 * Authorization: Bearer <token>. Roles enforced SERVER-SIDE here.
 */
declare(strict_types=1);

$cfg = require __DIR__ . "/config.php";
require __DIR__ . "/lib/job_status.php";
require __DIR__ . "/lib/invoicing.php";
require __DIR__ . "/lib/brand.php";

/* ---------- CORS ---------- */
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $cfg["cors_origins"] ?? [], true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
}
if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") { http_response_code(204); exit; }
header("Content-Type: application/json; charset=utf-8");
// Baseline security headers (JSON API — no caching, no sniffing, no framing).
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: no-referrer");
header("X-Frame-Options: DENY");
header("Cache-Control: no-store");

/* ---------- helpers ---------- */
function send($data, int $code = 200): never { http_response_code($code); echo json_encode($data); exit; }
function fail(string $msg, int $code = 400): never { send(["error" => $msg], $code); }
function body(): array { $j = json_decode(file_get_contents("php://input") ?: "[]", true); return is_array($j) ? $j : []; }
function bearer(): ?string {
    $h = $_SERVER["HTTP_AUTHORIZATION"] ?? $_SERVER["REDIRECT_HTTP_AUTHORIZATION"] ?? "";
    return preg_match('/Bearer\s+(\S+)/i', $h, $m) ? $m[1] : null;
}

/* ---------- db (mysqli) — throw on error so failed writes roll back (no gaps) ---------- */
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error"]);
});
try {
    $db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
} catch (Throwable $e) {
    fail("Database connection failed", 500);
}
$db->set_charset("utf8mb4");

function db_one(mysqli $db, string $sql, string $types = "", ...$args): ?array {
    $st = $db->prepare($sql);
    if ($types) $st->bind_param($types, ...$args);
    $st->execute();
    $res = $st->get_result();
    return $res ? ($res->fetch_assoc() ?: null) : null;
}
function db_all(mysqli $db, string $sql, string $types = "", ...$args): array {
    $st = $db->prepare($sql);
    if ($types) $st->bind_param($types, ...$args);
    $st->execute();
    $res = $st->get_result();
    return $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
}
function db_exec(mysqli $db, string $sql, string $types = "", ...$args): mysqli_stmt {
    $st = $db->prepare($sql);
    if ($types) $st->bind_param($types, ...$args);
    $st->execute();
    return $st;
}

/* ---------- abuse controls + safe errors ---------- */
/** Best-effort client IP (behind Cloudflare in production). */
function client_ip(): string {
    return (string) ($_SERVER["HTTP_CF_CONNECTING_IP"] ?? $_SERVER["REMOTE_ADDR"] ?? "0.0.0.0");
}
/** Persistent sliding-window counter (lazy table). rate_check reads; rate_hit records
 *  a strike. Record strikes on FAILURE only so normal use is never throttled. */
function rate_ensure(mysqli $db): void {
    static $done = false;
    if ($done) return;
    $db->query("CREATE TABLE IF NOT EXISTS ego_rate_hits (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        k VARCHAR(190) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rl (k, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $done = true;
}
function rate_check(mysqli $db, string $key, int $max, int $windowSec): bool {
    rate_ensure($db);
    $n = (int) (db_one($db, "SELECT COUNT(*) c FROM ego_rate_hits WHERE k=? AND created_at > (NOW() - INTERVAL ? SECOND)", "si", $key, $windowSec)["c"] ?? 0);
    return $n < $max;
}
function rate_hit(mysqli $db, string $key): void {
    rate_ensure($db);
    db_exec($db, "INSERT INTO ego_rate_hits (k) VALUES (?)", "s", $key);
    if (random_int(1, 50) === 1) $db->query("DELETE FROM ego_rate_hits WHERE created_at < (NOW() - INTERVAL 1 DAY)");
}
/** Return a user-safe error. DB internals (mysqli_sql_exception) are logged, never echoed;
 *  our own RuntimeExceptions carry deliberate, safe messages and pass through. */
function client_error(Throwable $e, string $fallback = "Something went wrong", int $code = 400): never {
    if ($e instanceof mysqli_sql_exception) { error_log("[ego-db] " . $e->getMessage()); fail($fallback, $code); }
    fail($e->getMessage(), $code);
}

/* ---------- auth helpers ---------- */
function current_user(mysqli $db): ?array {
    $tok = bearer();
    if (!$tok) return null;
    return db_one($db,
        "SELECT u.id,u.name,u.email,u.role,u.active,u.phone,u.available,u.must_change_password,u.totp_enabled
         FROM ego_sessions s JOIN ego_users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.active = 1 AND u.deleted_at IS NULL",
        "s", $tok
    );
}
function require_user(mysqli $db): array { $u = current_user($db); if (!$u) fail("Not authenticated", 401); return $u; }

/* Role hierarchy: founder(4) > manager(3) > office/Employee-Admin(2) > engineer(1). */
const ROLE_RANK = ["engineer" => 1, "office" => 2, "manager" => 3, "founder" => 4];
function role_rank(?string $r): int { return ROLE_RANK[$r ?? ""] ?? 0; }

/**
 * Backwards-compatible role gate.
 * - require_role($db, "admin")     => any OFFICE-class user (office/manager/founder)
 * - require_role($db, "engineer")  => engineers only (field app + ownership endpoints)
 * - require_role($db, "<role>")    => that role OR higher rank
 */
function require_role(mysqli $db, string $need): array {
    $u = require_user($db);
    $r = $u["role"];
    if ($need === "admin")    { if (role_rank($r) >= ROLE_RANK["office"]) return $u; fail("Forbidden", 403); }
    if ($need === "engineer") { if ($r === "engineer") return $u; fail("Forbidden", 403); }
    if ($r !== $need && role_rank($r) < role_rank($need)) fail("Forbidden", 403);
    return $u;
}
/** Require at least the given rank (founder > manager > office > engineer). */
function require_min(mysqli $db, string $need): array {
    $u = require_user($db);
    if (role_rank($u["role"]) < role_rank($need)) fail("Forbidden", 403);
    return $u;
}

function log_activity(mysqli $db, ?int $jobId, ?int $actorId, string $action, array $detail = []): void {
    db_exec($db, "INSERT INTO ego_activity_log (job_id, actor_id, action, detail) VALUES (?,?,?,?)",
        "iiss", $jobId, $actorId, $action, json_encode($detail));
}

/** Integration keys + whether each is a secret (secrets are never echoed to the client). */
function integration_fields(): array {
    return [
        // Outbound email (provider SMTP)
        "smtp_host" => false, "smtp_port" => false, "smtp_user" => false, "smtp_pass" => true,
        "smtp_from" => false, "smtp_from_name" => false, "smtp_secure" => false,
        // Weather
        "openweather_key" => true, "weather_city" => false,
        // AI via OpenRouter — primary model, comma/space-separated backup models, image model, editable brand voice
        "openrouter_key" => true, "openrouter_model" => false, "openrouter_models" => false,
        "openrouter_image_model" => false, "brand_voice" => false,
        "ai_daily_cap" => false, "ai_image_daily_cap" => false,
        // Inbound email (provider IMAP)
        "imap_host" => false, "imap_port" => false, "imap_user" => false, "imap_pass" => true, "imap_secure" => false,
        // Google reviews import (Places API)
        "google_places_key" => true, "google_place_id" => false,
    ];
}
/** Read one integration value (server-side only). */
function integ(mysqli $db, string $key): ?string {
    $r = db_one($db, "SELECT v FROM ego_integrations WHERE k=?", "s", $key);
    return ($r && $r["v"] !== null && $r["v"] !== "") ? $r["v"] : null;
}

/** Ordered model chain: primary (openrouter_model) + backups (openrouter_models,
 *  comma/space/newline separated), de-duped, with a cheap last-resort fallback. */
function ai_models(mysqli $db): array {
    $primary = trim((string) (integ($db, "openrouter_model") ?? "")) ?: "openai/gpt-4o-mini";
    $extra = preg_split('/[\s,]+/', (string) (integ($db, "openrouter_models") ?? ""), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $chain = array_values(array_unique(array_merge([$primary], $extra)));
    if (!in_array("openai/gpt-4o-mini", $chain, true)) $chain[] = "openai/gpt-4o-mini"; // always-available backstop
    return $chain;
}

/** Draft text via OpenRouter with an optional brand system prompt and automatic
 *  model fallback — a busy or unavailable model rolls over to the next backup.
 *  Human always approves before anything sends. */
/** Per-user daily AI spend guard — caps AI calls per user per day so a rogue or
 *  compromised token can't run up the OpenRouter bill. Text and images have separate
 *  caps (images cost more). Set the cap to 0 to disable. Configured in Settings. */
function ai_rate_guard(mysqli $db, string $kind = "text"): void {
    $u = current_user($db);
    $uid = $u ? (int) $u["id"] : 0;
    $cap = (int) ($kind === "image" ? (integ($db, "ai_image_daily_cap") ?? "20") : (integ($db, "ai_daily_cap") ?? "150"));
    if ($cap <= 0) return; // 0 = unlimited
    $key = "ai-$kind:$uid:" . gmdate("Y-m-d");
    if (!rate_check($db, $key, $cap, 86400)) throw new RuntimeException("Daily AI limit reached ($cap $kind requests) — it resets tomorrow, or raise it in Settings → Integrations.");
    rate_hit($db, $key);
}

function ai_draft(mysqli $db, string $prompt, ?string $system = null, int $maxTokens = 900): string {
    $key = integ($db, "openrouter_key");
    if (!$key) throw new RuntimeException("OpenRouter key not set (Settings → Integrations)");
    ai_rate_guard($db, "text");
    if (mb_strlen($prompt) > 8000) $prompt = mb_substr($prompt, 0, 8000); // cap input size (cost + abuse)
    $maxTokens = max(1, min($maxTokens, 1500));                          // cap output size
    $messages = [];
    if ($system !== null && trim($system) !== "") $messages[] = ["role" => "system", "content" => $system];
    $messages[] = ["role" => "user", "content" => $prompt];

    $lastErr = "no model available";
    foreach (ai_models($db) as $model) {
        $payload = json_encode(["model" => $model, "messages" => $messages, "max_tokens" => $maxTokens]);
        $ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 45,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer $key", "Content-Type: application/json",
                "HTTP-Referer: https://egolimited.com", "X-Title: EGO LIMITED",
            ],
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        // A rejected key won't be fixed by another model — stop immediately.
        if ($code === 401 || $code === 403) throw new RuntimeException("AI key rejected — check the OpenRouter key in Settings → Integrations.");
        if ($code === 200) {
            $j = json_decode($resp, true);
            $text = $j["choices"][0]["message"]["content"] ?? "";
            if (trim($text) !== "") return trim($text);
            $lastErr = "model returned no text";
        } else {
            $lastErr = "model $model unavailable ($code)";
        }
        // otherwise fall through to the next backup model
    }
    throw new RuntimeException("AI is unavailable right now ($lastErr) — try again shortly.");
}

/** Generate a marketing image via an OpenRouter image model, save it under
 *  /uploads, and return an absolute URL the email can embed. Best-effort:
 *  needs an image model set in Settings → Integrations. */
function ai_generate_image(mysqli $db, string $prompt): string {
    $key = integ($db, "openrouter_key");
    if (!$key) throw new RuntimeException("OpenRouter key not set (Settings → Integrations)");
    $model = integ($db, "openrouter_image_model");
    if (!$model) throw new RuntimeException("Set an image model in Settings → Integrations (AI) first.");
    ai_rate_guard($db, "image");
    $payload = json_encode([
        "model" => $model,
        "messages" => [["role" => "user", "content" => $prompt]],
        "modalities" => ["image", "text"],
    ]);
    $ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 90,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $key", "Content-Type: application/json",
            "HTTP-Referer: https://egolimited.com", "X-Title: EGO LIMITED",
        ],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code === 401 || $code === 403) throw new RuntimeException("AI key rejected — check the OpenRouter key.");
    if ($code !== 200) throw new RuntimeException("Image model error ($code) — check the model id in Settings.");
    $j = json_decode($resp, true);
    $url = $j["choices"][0]["message"]["images"][0]["image_url"]["url"] ?? "";
    if ($url === "") {
        $content = $j["choices"][0]["message"]["content"] ?? "";
        $hay = is_array($content) ? json_encode($content) : (string) $content;
        if (preg_match('#(data:image/[a-z]+;base64,[A-Za-z0-9+/=]+)#', $hay, $m)) $url = $m[1];
        elseif (preg_match('#(https?://\S+\.(?:png|jpg|jpeg|webp))#i', $hay, $m)) $url = $m[1];
    }
    if ($url === "") throw new RuntimeException("No image came back — try a different image model.");

    $scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
    $host = $_SERVER["HTTP_HOST"] ?? "egolimited.com";
    if (str_starts_with($url, "data:image")) {
        [$meta, $b64] = array_pad(explode(",", $url, 2), 2, "");
        $ext = str_contains($meta, "png") ? "png" : (str_contains($meta, "webp") ? "webp" : "jpg");
        $bin = base64_decode($b64);
        if ($bin === false || strlen($bin) < 64) throw new RuntimeException("Bad image data");
        $dir = __DIR__ . "/uploads";
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        $name = "campaign_" . bin2hex(random_bytes(6)) . ".$ext";
        file_put_contents("$dir/$name", $bin);
        return "$scheme://$host" . dirname($_SERVER["SCRIPT_NAME"]) . "/uploads/$name";
    }
    return $url; // already a hosted URL
}

/** Marketing subscribers/contacts list — created lazily so no manual migration
 *  is needed on deploy. Idempotent. */
function ensure_subscribers_table(mysqli $db): void {
    $db->query("CREATE TABLE IF NOT EXISTS ego_subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL,
        name VARCHAR(160) NULL,
        source VARCHAR(40) NOT NULL DEFAULT 'manual',
        subscribed TINYINT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sub_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/** Mailbox flags (archive/flag) — added lazily so no manual migration on deploy. Idempotent. */
function ensure_message_cols(mysqli $db): void {
    $db->query("ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS archived TINYINT(1) NOT NULL DEFAULT 0");
    $db->query("ALTER TABLE ego_messages ADD COLUMN IF NOT EXISTS flagged TINYINT(1) NOT NULL DEFAULT 0");
}

/** Tombstone of deleted IMAP uids — so an inbox re-sync never resurrects mail the
 *  office already deleted. Idempotent. */
function ensure_deleted_uids(mysqli $db): void {
    $db->query("CREATE TABLE IF NOT EXISTS ego_deleted_uids (
        uid VARCHAR(255) PRIMARY KEY,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
/** Record the uids of the given message ids before they're deleted (so sync skips them). */
function tombstone_uids(mysqli $db, string $idClause, string $types, array $ids): void {
    ensure_deleted_uids($db);
    db_exec($db, "INSERT IGNORE INTO ego_deleted_uids (uid)
                  SELECT uid FROM ego_messages WHERE $idClause AND uid IS NOT NULL AND uid<>''", $types, ...$ids);
}

/** Saved email templates — created + seeded with the EGO brand sequences on first
 *  use, so the office has on-brand starting points. Idempotent. */
function ensure_email_templates(mysqli $db): void {
    $db->query("CREATE TABLE IF NOT EXISTS ego_email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        kind VARCHAR(24) NOT NULL DEFAULT 'campaign',
        subject VARCHAR(255) NULL,
        body MEDIUMTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $has = (int) ($db->query("SELECT COUNT(*) c FROM ego_email_templates")->fetch_assoc()["c"] ?? 0);
    if ($has > 0) return;
    $sig = "\n\nCheers,\n{{sender_name}}\nEGO LTD — general maintenance, homes & commercial\n07539 705576 · hello@egolimited.com\nThe jobs that need doing, done properly.";
    $seed = [
        ["Quote follow-up (homeowner)", "marketing", "Quick one on your quote, {{first_name}}",
         "Hi {{first_name}},\n\nJust checking the quote for {{job_summary}} landed alright.\n\nIf the price or the timing isn't quite right, tell me — I'd rather adjust it than leave you guessing. If you want to go ahead, reply here or call 07539 705576 and I'll book you in." . $sig],
        ["B2B intro (agents)", "marketing", "A reliable maintenance contractor for {{agency_name}}",
         "Hi {{first_name}},\n\nI run EGO LTD — general maintenance across South-East London, homes and commercial. Carpentry, decorating, minor plumbing, tiling: the day-to-day repairs that keep managed properties tidy and tenants quiet.\n\nOne number, fixed prices in writing, and a maintenance record kept per property so you're never starting from scratch. Worth a 10-minute call to take some pressure off {{agency_name}}? I'm on 07539 705576, or just reply." . $sig],
        ["Review request", "marketing", "How did we do on {{job_summary}}?",
         "Hi {{first_name}},\n\nHope you're happy with {{job_summary}} — it was good to get it sorted for you.\n\nIf you've got 30 seconds, a quick honest review helps other people round here find us: {{review_link}}. And if anything's not quite right, tell me first — I'd always rather put it right." . $sig],
        ["Win-back (dormant)", "marketing", "Still here when you need us, {{first_name}}",
         "Hi {{first_name}},\n\nIt's been a while since we last sorted something for you. No agenda here, just a hello.\n\nIf anything around {{property_or_premises}} has been on the 'I'll get to that' list, that's exactly what we're good at — the small jobs, the repairs, the bits that never reach the top of the pile. Reply or call 07539 705576 whenever something crops up." . $sig],
        ["Winter prep (seasonal)", "marketing", "Get ahead of winter before it gets ahead of you",
         "Hi {{first_name}},\n\nCold weather finds every weak spot — draughty doors, dodgy seals, gutters that should've been cleared.\n\nA pre-winter once-over sorts it cheaply now. We'll check the property, fix the small stuff on the spot, and flag anything bigger with a fixed price before we touch it. Reply or call 07539 705576 and I'll book you in for {{seasonal_slot}}." . $sig],
        ["Referral ask", "marketing", "Know anyone who needs a job doing properly?",
         "Hi {{first_name}},\n\nThanks again for having us out for {{job_summary}}.\n\nQuick favour: if a friend, neighbour or family member needs a reliable pair of hands, point them our way. A name from someone like you is worth more than any advert. Just forward this email or pass on 07539 705576." . $sig],
    ];
    $stmt = $db->prepare("INSERT INTO ego_email_templates (name,kind,subject,body) VALUES (?,?,?,?)");
    foreach ($seed as $t) { $stmt->bind_param("ssss", $t[0], $t[1], $t[2], $t[3]); $stmt->execute(); }
}

/** Mint (or reuse) the customer-portal access token for a job. */
function mint_track_token(mysqli $db, int $jobId): array {
    $ex = db_one($db, "SELECT token,short_code FROM ego_customer_access WHERE job_id=? AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY id DESC LIMIT 1", "i", $jobId);
    if ($ex) return $ex;
    $token = bin2hex(random_bytes(20));
    $short = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
    db_exec($db, "INSERT INTO ego_customer_access (job_id,token,short_code) VALUES (?,?,?)", "iss", $jobId, $token, $short);
    return ["token" => $token, "short_code" => $short];
}
/** Public customer-portal URL for a job (mints/reuses the token). Self-hosted, no third party. */
function track_link(mysqli $db, int $jobId): string {
    $t = mint_track_token($db, $jobId);
    return "https://egolimited.com/app/track/" . $t["token"];
}
/** Verify a portal token → the job_id it scopes to (or null). */
function verify_track_token(mysqli $db, string $token): ?int {
    if ($token === "") return null;
    $a = db_one($db, "SELECT job_id FROM ego_customer_access WHERE token=? AND (expires_at IS NULL OR expires_at>NOW())", "s", $token);
    return $a ? (int)$a["job_id"] : null;
}

/** M12: email the office that a job is completed and ready to invoice (best-effort). */
function notify_job_completed(mysqli $db, int $jobId): void {
    $cs = db_one($db, "SELECT company_name,email,notify_on_complete,notify_email FROM ego_company_settings ORDER BY id LIMIT 1");
    if (!$cs || (int)($cs["notify_on_complete"] ?? 1) !== 1) return;
    $to = trim($cs["notify_email"] ?? "") ?: trim($cs["email"] ?? "");
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return;
    $job = db_one($db, "SELECT j.reference,j.title,u.name AS engineer_name,c.name AS customer_name FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id LEFT JOIN ego_users u ON u.id=j.engineer_id WHERE j.id=?", "i", $jobId);
    if (!$job) return;
    require_once __DIR__ . "/lib/mailer.php";
    $inner = "<p><strong>{$job['reference']}</strong> — " . htmlspecialchars($job["title"]) . "</p>"
        . "<p>Customer: " . htmlspecialchars($job["customer_name"]) . "<br>Engineer: " . htmlspecialchars($job["engineer_name"] ?? "—") . "</p>"
        . "<p>Raise the invoice from the job in the admin app.</p>";
    $html = ego_email_shell($db, "Job completed — ready to invoice", $inner);
    try { ego_send_mail($db, $to, $cs["company_name"] ?? null, "Ready to invoice: {$job['reference']}", $html); } catch (Throwable $e) { /* best-effort */ }
}

/** Load a job the actor may touch: admin = any, engineer = only their own. */
function load_owned_job(mysqli $db, array $actor, int $id): array {
    $job = db_one($db, "SELECT * FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $id);
    if (!$job) fail("Job not found", 404);
    if ($actor["role"] === "engineer" && (int)$job["engineer_id"] !== (int)$actor["id"]) fail("Forbidden", 403);
    return $job;
}

/* ---------- route ---------- */
$base = rtrim(str_replace("\\", "/", dirname($_SERVER["SCRIPT_NAME"])), "/");
$path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH) ?? "/";
$route = "/" . trim(substr($path, strlen($base)), "/");
$method = $_SERVER["REQUEST_METHOD"];

// Forced password change is enforced HERE (not just in the UI): a user flagged
// must_change_password can only reach logout, their own identity, and the change route.
$MCP_ALLOW = ["POST /auth/login", "POST /auth/logout", "GET /auth/me", "GET /health", "GET /", "POST /me/change-password"];
if (!in_array("$method $route", $MCP_ALLOW, true)) {
    $cu = current_user($db);
    if ($cu && (int) ($cu["must_change_password"] ?? 0) === 1) fail("Password change required", 403);
}

switch ("$method $route") {

    case "GET /":
    case "GET /health":
        send(["ok" => true, "service" => "ego-api"]);

    case "POST /auth/login": {
        $b = body();
        $email = trim(strtolower($b["email"] ?? ""));
        $pass = (string)($b["password"] ?? "");
        if (!$email || !$pass) fail("Email and password required");
        // Brute-force guard: cap failed attempts per IP and per account (15-min window).
        $ipKey = "login-ip:" . client_ip();
        $emKey = "login-em:" . $email;
        if (!rate_check($db, $ipKey, 30, 900) || !rate_check($db, $emKey, 10, 900)) fail("Too many attempts. Wait 15 minutes and try again.", 429);
        $u = db_one($db, "SELECT * FROM ego_users WHERE email = ? AND active = 1 AND deleted_at IS NULL", "s", $email);
        if (!$u || !$u["password_hash"] || !password_verify($pass, $u["password_hash"])) {
            rate_hit($db, $ipKey); rate_hit($db, $emKey);
            fail("Invalid email or password", 401);
        }
        // 2FA gate (only for users who opted in — additive, never locks others out).
        if ((int)($u["totp_enabled"] ?? 0) === 1) {
            $code = trim((string)($b["totp_code"] ?? $b["code"] ?? ""));
            if ($code === "") send(["totp_required" => true]); // 200: client prompts for code, no token issued
            // Cap 2FA guesses per account so the password-holder can't grind the ±1 code window.
            $tKey = "totp:" . $u["id"];
            if (!rate_check($db, $tKey, 6, 900)) fail("Too many 2FA attempts. Wait 15 minutes.", 429);
            require_once __DIR__ . "/lib/totp.php";
            if (!totp_verify((string)($u["totp_secret"] ?? ""), $code)) { rate_hit($db, $tKey); fail("Invalid 2FA code", 401); }
        }
        $token = bin2hex(random_bytes(32));
        db_exec($db, "INSERT INTO ego_sessions (token,user_id,expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 30 DAY))", "si", $token, $u["id"]);
        send(["token" => $token, "user" => [
            "id" => (int)$u["id"], "name" => $u["name"], "email" => $u["email"], "role" => $u["role"],
            "must_change_password" => (int)($u["must_change_password"] ?? 0),
            "totp_enabled" => (int)($u["totp_enabled"] ?? 0),
        ]]);
    }

    case "GET /auth/me": {
        $u = require_user($db);
        $u["id"] = (int)$u["id"];
        $u["available"] = (int)($u["available"] ?? 1);
        send(["user" => $u]);
    }

    // Engineer sets their own availability (the office sees it on Team + schedule).
    case "POST /me/availability": {
        $me = require_user($db);
        $on = !empty(body()["available"]) ? 1 : 0;
        db_exec($db, "UPDATE ego_users SET available=? WHERE id=?", "ii", $on, (int)$me["id"]);
        log_activity($db, null, (int)$me["id"], "availability", ["available" => $on]);
        send(["ok" => true, "available" => $on]);
    }

    case "POST /auth/logout": {
        $tok = bearer();
        if ($tok) db_exec($db, "DELETE FROM ego_sessions WHERE token = ?", "s", $tok);
        send(["ok" => true]);
    }

    case "GET /engineers": {
        require_role($db, "admin");
        $rows = db_all($db,
            "SELECT id,name,email,phone,active,available,(password_hash IS NULL) AS pending
             FROM ego_users WHERE role='engineer' AND deleted_at IS NULL ORDER BY name");
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; $r["active"] = (int)$r["active"]; $r["available"] = (int)$r["available"]; $r["pending"] = (int)$r["pending"]; }
        send(["engineers" => $rows]);
    }

    case "POST /engineers": {
        require_role($db, "admin");
        $b = body();
        $name = trim($b["name"] ?? "");
        $email = trim(strtolower($b["email"] ?? ""));
        $phone = trim($b["phone"] ?? "");
        if (!$name || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Name and valid email required");
        if (db_one($db, "SELECT id FROM ego_users WHERE email = ?", "s", $email)) fail("That email already exists", 409);
        $invite = bin2hex(random_bytes(24));
        $phoneVal = $phone ?: null;
        db_exec($db, "INSERT INTO ego_users (name,email,phone,role,active,invite_token) VALUES (?,?,?,'engineer',1,?)", "ssss", $name, $email, $phoneVal, $invite);
        send(["id" => (int)$db->insert_id, "invite_token" => $invite], 201);
    }

    case "POST /engineers/deactivate": {
        require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_users SET active=0 WHERE id=? AND role='engineer'", "i", $id);
        db_exec($db, "DELETE FROM ego_sessions WHERE user_id=?", "i", $id);
        send(["ok" => true]);
    }

    case "POST /invite/accept": {
        $b = body();
        $token = trim($b["token"] ?? "");
        $pass = (string)($b["password"] ?? "");
        if (!$token || strlen($pass) < 8) fail("Token and an 8+ char password required");
        $u = db_one($db, "SELECT id FROM ego_users WHERE invite_token = ? AND active=1 AND deleted_at IS NULL", "s", $token);
        if (!$u) fail("Invalid or used invite", 400);
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        db_exec($db, "UPDATE ego_users SET password_hash=?, invite_token=NULL WHERE id=?", "si", $hash, $u["id"]);
        send(["ok" => true]);
    }

    /* ===================== TEAM / USER MANAGEMENT (manager + founder) ===================== */
    // Roles a given actor is allowed to assign (never above their own rank; founder is exclusive).
    case "GET /team": {
        $me = require_min($db, "manager");
        $rows = db_all($db,
            "SELECT id,name,email,phone,role,active,available,(password_hash IS NULL) AS pending,created_at
             FROM ego_users WHERE deleted_at IS NULL ORDER BY FIELD(role,'founder','manager','office','engineer'), name");
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; $r["active"] = (int)$r["active"]; $r["available"] = (int)$r["available"]; $r["pending"] = (int)$r["pending"]; }
        // Roles this actor may grant: strictly below their own rank. A founder may also
        // create another founder (succession / credential rotation before go-live).
        $assignable = $me["role"] === "founder"
            ? ["founder", "manager", "office", "engineer"]
            : array_values(array_filter(["manager","office","engineer"], fn($r) => role_rank($r) < role_rank($me["role"])));
        send(["team" => $rows, "assignable_roles" => $assignable, "my_role" => $me["role"]]);
    }

    case "POST /team": {
        $me = require_min($db, "manager");
        $b = body();
        $name = trim($b["name"] ?? "");
        $email = trim(strtolower($b["email"] ?? ""));
        $role = trim($b["role"] ?? "engineer");
        $phone = trim($b["phone"] ?? "");
        $isFounder = $me["role"] === "founder";
        if (!$name || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Name and valid email required");
        // Only a founder may create another founder; everyone else is capped below their own rank.
        $allowedRoles = $isFounder ? ["founder","manager","office","engineer"] : ["manager","office","engineer"];
        if (!in_array($role, $allowedRoles, true)) fail("Invalid role");
        if (!$isFounder && role_rank($role) >= role_rank($me["role"])) fail("You can't create a user at or above your own role", 403);
        if (db_one($db, "SELECT id FROM ego_users WHERE email = ?", "s", $email)) fail("That email already exists", 409);
        $invite = bin2hex(random_bytes(24));
        db_exec($db, "INSERT INTO ego_users (name,email,phone,role,active,invite_token) VALUES (?,?,?,?,1,?)",
            "sssss", $name, $email, ($phone ?: null), $role, $invite);
        send(["id" => (int)$db->insert_id, "invite_token" => $invite], 201);
    }

    case "POST /team/update": {
        $me = require_min($db, "manager");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        if (!$id) fail("id required");
        $target = db_one($db, "SELECT id,role FROM ego_users WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$target) fail("User not found", 404);
        // You may only manage users strictly below your rank. A founder may manage other
        // founders too (but never below prevents self lock-out — self is always allowed here).
        $isFounder = $me["role"] === "founder";
        if (!$isFounder && role_rank($target["role"]) >= role_rank($me["role"]) && (int)$target["id"] !== (int)$me["id"]) fail("You can't manage this user", 403);
        $set = []; $types = ""; $args = [];
        if (array_key_exists("name", $b))  { $set[] = "name=?";  $types .= "s"; $args[] = trim($b["name"]); }
        if (array_key_exists("phone", $b)) { $set[] = "phone=?"; $types .= "s"; $args[] = trim($b["phone"]) ?: null; }
        if (array_key_exists("active", $b)){ $set[] = "active=?";$types .= "i"; $args[] = (int)!!$b["active"]; }
        if (array_key_exists("role", $b)) {
            $newRole = trim($b["role"]);
            $allowedRoles = $isFounder ? ["founder","manager","office","engineer"] : ["manager","office","engineer"];
            if (!in_array($newRole, $allowedRoles, true)) fail("Invalid role");
            if (!$isFounder && role_rank($newRole) >= role_rank($me["role"])) fail("You can't grant a role at or above your own", 403);
            $set[] = "role=?"; $types .= "s"; $args[] = $newRole;
        }
        if (!$set) send(["ok" => true]);
        $types .= "i"; $args[] = $id;
        db_exec($db, "UPDATE ego_users SET " . implode(",", $set) . " WHERE id=?", $types, ...$args);
        if (array_key_exists("active", $b) && !$b["active"]) db_exec($db, "DELETE FROM ego_sessions WHERE user_id=?", "i", $id);
        send(["ok" => true]);
    }

    case "POST /team/delete": {
        $me = require_min($db, "manager");
        $id = (int)(body()["id"] ?? 0);
        if (!$id) fail("id required");
        $target = db_one($db, "SELECT id,role FROM ego_users WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$target) fail("User not found", 404);
        if ((int)$target["id"] === (int)$me["id"]) fail("You can't remove yourself", 403);
        // A founder may remove other founders (e.g. the demo founder after minting a real
        // one). Self-removal is already blocked above, so the last founder can never be deleted.
        if ($me["role"] !== "founder" && role_rank($target["role"]) >= role_rank($me["role"])) fail("You can't remove this user", 403);
        db_exec($db, "UPDATE ego_users SET active=0, deleted_at=NOW() WHERE id=?", "i", $id);
        db_exec($db, "DELETE FROM ego_sessions WHERE user_id=?", "i", $id);
        send(["ok" => true]);
    }

    /* ===================== M2: CUSTOMERS (admin) ===================== */
    case "GET /customers": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db,
            "SELECT c.id,c.name,c.phone,c.email,c.ref_code,
                (SELECT COUNT(*) FROM ego_jobs j WHERE j.customer_id=c.id AND j.deleted_at IS NULL) AS job_count,
                (SELECT MAX(j.created_at) FROM ego_jobs j WHERE j.customer_id=c.id AND j.deleted_at IS NULL) AS last_job,
                (SELECT COALESCE(SUM(i.total),0) FROM ego_invoices i WHERE i.customer_id=c.id AND i.kind='invoice' AND i.status='sent' AND i.deleted_at IS NULL) AS balance
             FROM ego_customers c
             WHERE c.deleted_at IS NULL AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)
             ORDER BY c.name",
            "sss", $q, $q, $q);
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; $r["job_count"] = (int)$r["job_count"]; $r["balance"] = (float)$r["balance"]; }
        send(["customers" => $rows]);
    }

    case "GET /customers/get": {
        require_role($db, "admin");
        $id = (int)($_GET["id"] ?? 0);
        $c = db_one($db, "SELECT * FROM ego_customers WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$c) fail("Customer not found", 404);
        $c["id"] = (int)$c["id"];
        $c["addresses"] = db_all($db, "SELECT id,line1,line2,city,postcode,is_primary FROM ego_addresses WHERE customer_id=?", "i", $id);
        $c["jobs"] = db_all($db,
            "SELECT id,reference,title,status,priority,quoted_amount,created_at FROM ego_jobs
             WHERE customer_id=? AND deleted_at IS NULL ORDER BY created_at DESC", "i", $id);
        $c["balance"] = (float)(db_one($db, "SELECT COALESCE(SUM(total),0) s FROM ego_invoices WHERE customer_id=? AND kind='invoice' AND status='sent' AND deleted_at IS NULL", "i", $id)["s"] ?? 0);
        send(["customer" => $c]);
    }

    case "POST /customers": {
        require_role($db, "admin");
        $b = body();
        $name = trim($b["name"] ?? "");
        if ($name === "") fail("Name is required");
        $phone = trim($b["phone"] ?? "") ?: null;
        $email = trim($b["email"] ?? "") ?: null;
        $notes = trim($b["notes"] ?? "") ?: null;
        db_exec($db, "INSERT INTO ego_customers (name,phone,email,notes) VALUES (?,?,?,?)", "ssss", $name, $phone, $email, $notes);
        $cid = (int)$db->insert_id;
        $a = $b["address"] ?? null;
        if (is_array($a) && (trim($a["line1"] ?? "") !== "" || trim($a["postcode"] ?? "") !== "")) {
            db_exec($db, "INSERT INTO ego_addresses (customer_id,line1,line2,city,postcode,is_primary) VALUES (?,?,?,?,?,1)",
                "issss", $cid, $a["line1"] ?? null, $a["line2"] ?? null, $a["city"] ?? null, $a["postcode"] ?? null);
        }
        $code = ensure_customer_code($db, $cid); // CODE from name+phone+postcode
        send(["id" => $cid, "ref_code" => $code], 201);
    }

    case "POST /customers/update": {
        require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $name = trim($b["name"] ?? "");
        if (!$id || $name === "") fail("id and name required");
        $phone = trim($b["phone"] ?? "") ?: null;
        $email = trim($b["email"] ?? "") ?: null;
        $notes = trim($b["notes"] ?? "") ?: null;
        db_exec($db, "UPDATE ego_customers SET name=?,phone=?,email=?,notes=? WHERE id=? AND deleted_at IS NULL",
            "ssssi", $name, $phone, $email, $notes, $id);
        $a = $b["address"] ?? null;
        if (is_array($a)) {
            $existing = db_one($db, "SELECT id FROM ego_addresses WHERE customer_id=? AND is_primary=1", "i", $id);
            if ($existing) {
                db_exec($db, "UPDATE ego_addresses SET line1=?,line2=?,city=?,postcode=? WHERE id=?",
                    "ssssi", $a["line1"] ?? null, $a["line2"] ?? null, $a["city"] ?? null, $a["postcode"] ?? null, $existing["id"]);
            } elseif (trim($a["line1"] ?? "") !== "" || trim($a["postcode"] ?? "") !== "") {
                db_exec($db, "INSERT INTO ego_addresses (customer_id,line1,line2,city,postcode,is_primary) VALUES (?,?,?,?,?,1)",
                    "issss", $id, $a["line1"] ?? null, $a["line2"] ?? null, $a["city"] ?? null, $a["postcode"] ?? null);
            }
        }
        send(["ok" => true]);
    }

    case "POST /customers/delete": {
        require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_customers SET deleted_at=NOW() WHERE id=?", "i", $id); // soft-delete
        send(["ok" => true]);
    }

    /* ===================== M3: JOBS ===================== */
    case "GET /jobs": {
        require_role($db, "admin");
        $status = trim($_GET["status"] ?? "");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $sql = "SELECT j.id,j.reference,j.title,j.priority,j.status,j.quoted_amount,j.scheduled_start,
                       c.name AS customer_name, u.name AS engineer_name
                FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
                LEFT JOIN ego_users u ON u.id=j.engineer_id
                WHERE j.deleted_at IS NULL AND (j.reference LIKE ? OR j.title LIKE ? OR c.name LIKE ?)";
        if ($status !== "" && job_status_exists($status)) {
            $rows = db_all($db, $sql . " AND j.status=? ORDER BY j.created_at DESC", "ssss", $q, $q, $q, $status);
        } else {
            $rows = db_all($db, $sql . " ORDER BY j.created_at DESC", "sss", $q, $q, $q);
        }
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; }
        send(["jobs" => $rows]);
    }

    case "GET /jobs/get": {
        require_role($db, "admin");
        $id = (int)($_GET["id"] ?? 0);
        $j = db_one($db,
            "SELECT j.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
                    u.name AS engineer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             LEFT JOIN ego_users u ON u.id=j.engineer_id
             WHERE j.id=? AND j.deleted_at IS NULL", "i", $id);
        if (!$j) fail("Job not found", 404);
        $j["id"] = (int)$j["id"];
        $j["customer_id"] = (int)$j["customer_id"];
        $j["address"] = $j["address_id"] ? db_one($db, "SELECT line1,line2,city,postcode FROM ego_addresses WHERE id=?", "i", (int)$j["address_id"]) : null;
        $j["activity"] = db_all($db,
            "SELECT a.action,a.detail,a.created_at,u.name AS actor_name
             FROM ego_activity_log a LEFT JOIN ego_users u ON u.id=a.actor_id
             WHERE a.job_id=? ORDER BY a.created_at DESC, a.id DESC", "i", $id);
        $j["allowed_targets"] = JOB_TRANSITIONS[$j["status"]] ?? [];
        $j["checklist"] = db_all($db, "SELECT id,label,done FROM ego_job_checklist WHERE job_id=? ORDER BY sort,id", "i", $id);
        foreach ($j["checklist"] as &$ck) { $ck["id"] = (int)$ck["id"]; $ck["done"] = (int)$ck["done"]; }
        $j["invoices"] = db_all($db, "SELECT id,kind,number,status,total FROM ego_invoices WHERE job_id=? AND deleted_at IS NULL ORDER BY id DESC", "i", $id);
        foreach ($j["invoices"] as &$iv) { $iv["id"] = (int)$iv["id"]; }
        $tok = mint_track_token($db, $id); // customer portal link
        $j["track_token"] = $tok["token"];
        $j["track_short"] = $tok["short_code"];
        $j["messages"] = db_all($db,
            "SELECT id,direction,channel,from_name,from_email,subject,body,acknowledged,visible_to_engineer,created_at
             FROM ego_messages WHERE job_id=? ORDER BY id DESC", "i", $id);
        foreach ($j["messages"] as &$mm) { $mm["id"] = (int)$mm["id"]; $mm["acknowledged"] = (int)$mm["acknowledged"]; $mm["visible_to_engineer"] = (int)$mm["visible_to_engineer"]; }
        send(["job" => $j]);
    }

    // Office sets the engineer brief + on-site checklist (human-approved; AI is a draft helper).
    case "POST /jobs/brief": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        if (!$id || !db_one($db, "SELECT id FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Job not found", 404);
        $brief = trim($b["brief"] ?? "") ?: null;
        db_exec($db, "UPDATE ego_jobs SET engineer_brief=? WHERE id=?", "si", $brief, $id);
        if (array_key_exists("summary", $b)) {
            $summary = trim($b["summary"] ?? "") ?: null;
            db_exec($db, "UPDATE ego_jobs SET summary=? WHERE id=?", "si", $summary, $id);
        }
        if (array_key_exists("checklist", $b) && is_array($b["checklist"])) {
            // Preserve done-state for items the engineer already ticked (match by label).
            $doneByLabel = [];
            foreach (db_all($db, "SELECT label,done FROM ego_job_checklist WHERE job_id=?", "i", $id) as $e) $doneByLabel[$e["label"]] = (int)$e["done"];
            db_exec($db, "DELETE FROM ego_job_checklist WHERE job_id=?", "i", $id);
            $sort = 0;
            foreach ($b["checklist"] as $label) {
                $label = trim((string)$label);
                if ($label === "") continue;
                $done = $doneByLabel[$label] ?? 0;
                db_exec($db, "INSERT INTO ego_job_checklist (job_id,label,done,sort) VALUES (?,?,?,?)", "isii", $id, $label, $done, $sort++);
            }
        }
        log_activity($db, $id, (int)$actor["id"], "brief_updated", []);
        send(["ok" => true]);
    }

    // AI drafts an engineer brief + checklist from the job (office reviews before saving).
    case "POST /jobs/ai-brief": {
        require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0);
        $job = db_one($db, "SELECT title,description FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$job) fail("Job not found", 404);
        // Task-aware: EGO engineers do general maintenance — cleaning, gardening, plumbing,
        // electrical, gas, repairs, etc. Infer the trade from the request and tailor the
        // brief + checklist to THAT job (don't give gas-safety steps for a cleaning job).
        $prompt = "You are a senior field-service manager at EGO LIMITED, a UK general maintenance company. "
            . "Engineers handle a wide range of work — cleaning, gardening, plumbing, electrical, gas/heating, carpentry, general repairs.\n\n"
            . "First INFER the type of work from the request below, then write instructions tailored to that specific trade and task. "
            . "Only include safety/compliance notes that genuinely apply to this kind of work.\n\n"
            . "Job title: {$job['title']}\nWhat the customer asked for: " . ($job['description'] ?: "(no detail given — use the title)") . "\n\n"
            . "Return STRICT JSON only (no markdown, no prose): {"
            . "\"summary\":\"one short line (max ~10 words) describing what needs doing, plain English\","
            . "\"brief\":\"2-4 sentence explanation for the engineer: what to do, what good looks like, and any cautions that apply to THIS trade\","
            . "\"checklist\":[\"short, concrete on-site step\",\"...3 to 6 items relevant to this task\"]}";
        try { $text = ai_draft($db, $prompt); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        $clean = trim(preg_replace('/```(json)?|```/', '', $text));
        $parsed = json_decode($clean, true);
        if (!is_array($parsed)) fail("AI returned an unexpected format — try again", 400);
        $checklist = [];
        if (!empty($parsed["checklist"]) && is_array($parsed["checklist"])) {
            foreach ($parsed["checklist"] as $it) { $s = trim((string)$it); if ($s !== "") $checklist[] = $s; }
        }
        send([
            "summary" => trim((string)($parsed["summary"] ?? "")),
            "brief" => trim((string)($parsed["brief"] ?? "")),
            "checklist" => $checklist,
        ]);
    }

    case "POST /jobs": {
        $actor = require_role($db, "admin");
        $b = body();
        $title = trim($b["title"] ?? "");
        if ($title === "") fail("Title is required");
        $priority = $b["priority"] ?? "normal";
        if (!in_array($priority, ["low", "normal", "urgent"], true)) $priority = "normal";
        $quoted = isset($b["quoted_amount"]) && $b["quoted_amount"] !== "" ? (float)$b["quoted_amount"] : null;

        $db->begin_transaction();
        try {
            // customer: existing id or inline-create
            $cid = (int)($b["customer_id"] ?? 0);
            if (!$cid) {
                $cname = trim($b["customer"]["name"] ?? "");
                if ($cname === "") throw new RuntimeException("Customer is required");
                db_exec($db, "INSERT INTO ego_customers (name,phone,email) VALUES (?,?,?)", "sss",
                    $cname, trim($b["customer"]["phone"] ?? "") ?: null, trim($b["customer"]["email"] ?? "") ?: null);
                $cid = (int)$db->insert_id;
            } else {
                if (!db_one($db, "SELECT id FROM ego_customers WHERE id=? AND deleted_at IS NULL", "i", $cid)) {
                    throw new RuntimeException("Customer not found");
                }
            }
            // site address (optional)
            $aid = null;
            $a = $b["address"] ?? null;
            if (is_array($a) && (trim($a["line1"] ?? "") !== "" || trim($a["postcode"] ?? "") !== "")) {
                db_exec($db, "INSERT INTO ego_addresses (customer_id,line1,line2,city,postcode,is_primary) VALUES (?,?,?,?,?,0)",
                    "issss", $cid, $a["line1"] ?? null, $a["line2"] ?? null, $a["city"] ?? null, $a["postcode"] ?? null);
                $aid = (int)$db->insert_id;
            }
            // per-customer reference: CODE-J# (CODE from name+phone+postcode)
            $ref = next_job_reference($db, $cid);
            db_exec($db,
                "INSERT INTO ego_jobs (reference,customer_id,address_id,title,description,priority,status,quoted_amount)
                 VALUES (?,?,?,?,?,?, 'new', ?)",
                "siisssd", $ref, $cid, $aid, $title, trim($b["description"] ?? "") ?: null, $priority, $quoted);
            $jid = (int)$db->insert_id;
            log_activity($db, $jid, (int)$actor["id"], "created", ["reference" => $ref]);
            $db->commit();
            send(["id" => $jid, "reference" => $ref], 201);
        } catch (Throwable $e) {
            $db->rollback();
            client_error($e, "Something went wrong");
        }
    }

    case "GET /schedule": {
        require_role($db, "admin");
        $rows = db_all($db,
            "SELECT j.id,j.reference,j.title,j.status,j.scheduled_start,j.scheduled_end,
                    j.engineer_id, u.name AS engineer_name, c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             LEFT JOIN ego_users u ON u.id=j.engineer_id
             WHERE j.deleted_at IS NULL AND j.scheduled_start IS NOT NULL
             ORDER BY j.scheduled_start");
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; $r["engineer_id"] = $r["engineer_id"] !== null ? (int)$r["engineer_id"] : null; }
        // Waitlist: active jobs awaiting a schedule slot OR an engineer
        $waitlist = db_all($db,
            "SELECT j.id,j.reference,j.title,j.priority,j.status,j.scheduled_start,j.engineer_id,c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             WHERE j.deleted_at IS NULL
               AND j.status NOT IN ('completed','invoiced','paid','closed','cancelled')
               AND (j.scheduled_start IS NULL OR j.engineer_id IS NULL)
             ORDER BY FIELD(j.priority,'urgent','normal','low'), j.created_at");
        foreach ($waitlist as &$w) {
            $w["id"] = (int)$w["id"];
            $w["engineer_id"] = $w["engineer_id"] !== null ? (int)$w["engineer_id"] : null;
            $w["reason"] = $w["scheduled_start"] === null ? "schedule" : "assign";
        }
        send(["jobs" => $rows, "waitlist" => $waitlist]);
    }

    case "POST /jobs/schedule": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $engineerId = isset($b["engineer_id"]) && $b["engineer_id"] !== "" ? (int)$b["engineer_id"] : null;
        $start = trim($b["scheduled_start"] ?? "");
        $end = trim($b["scheduled_end"] ?? "") ?: null;
        if (!$id || $start === "") fail("id and scheduled_start required");
        $job = db_one($db, "SELECT id,status FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$job) fail("Job not found", 404);
        if ($engineerId !== null && !db_one($db, "SELECT id FROM ego_users WHERE id=? AND role='engineer' AND active=1 AND deleted_at IS NULL", "i", $engineerId)) {
            fail("Engineer not found", 400);
        }
        db_exec($db, "UPDATE ego_jobs SET engineer_id=?, scheduled_start=?, scheduled_end=? WHERE id=?",
            "issi", $engineerId, $start, $end, $id);
        $from = $job["status"];
        if (in_array($from, ["new", "on_hold"], true)) {
            db_exec($db, "UPDATE ego_jobs SET status='scheduled' WHERE id=?", "i", $id);
            log_activity($db, $id, (int)$actor["id"], "status_changed", ["from" => $from, "to" => "scheduled"]);
        }
        log_activity($db, $id, (int)$actor["id"], "scheduled", ["start" => $start, "end" => $end, "engineer_id" => $engineerId]);
        send(["ok" => true, "status" => in_array($from, ["new", "on_hold"], true) ? "scheduled" : $from]);
    }

    // Remove a job from the calendar → back onto the waitlist (clears slot + engineer).
    case "POST /jobs/unschedule": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0);
        if (!$id) fail("id required");
        $job = db_one($db, "SELECT id,status FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$job) fail("Job not found", 404);
        // Only meaningful for jobs not yet completed/closed.
        if (in_array($job["status"], ["completed", "invoiced", "paid", "closed", "cancelled"], true)) {
            fail("Can't unschedule a job that's already $job[status]", 422);
        }
        db_exec($db, "UPDATE ego_jobs SET scheduled_start=NULL, scheduled_end=NULL, engineer_id=NULL, status='new' WHERE id=?", "i", $id);
        if ($job["status"] !== "new") {
            log_activity($db, $id, (int)$actor["id"], "status_changed", ["from" => $job["status"], "to" => "new"]);
        }
        log_activity($db, $id, (int)$actor["id"], "unscheduled", []);
        send(["ok" => true, "status" => "new"]);
    }

    case "POST /jobs/status": {
        $actor = require_user($db);
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $to = trim($b["to"] ?? "");
        $note = trim($b["note"] ?? "") ?: null;
        $job = db_one($db, "SELECT id,status,engineer_id FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$job) fail("Job not found", 404);
        // engineers may only act on their own jobs (ownership)
        if ($actor["role"] === "engineer" && (int)$job["engineer_id"] !== (int)$actor["id"]) fail("Forbidden", 403);
        $from = $job["status"];
        if (!job_can_transition($from, $to, $actor["role"])) fail("Transition $from → $to not allowed", 422);
        if ($to === "completed") {
            $signName = trim($b["signoff_name"] ?? "") ?: null;
            $signSig = $b["signoff_signature"] ?? null;
            db_exec($db, "UPDATE ego_jobs SET status='completed', completed_at=NOW(), signoff_name=?, signoff_signature=? WHERE id=?",
                "ssi", $signName, $signSig, $id);
        } elseif ($to === "on_hold") {
            $reason = trim($b["hold_reason"] ?? $b["note"] ?? "") ?: null;
            $parts = !empty($b["parts_required"]) ? 1 : 0;
            $partsNote = trim($b["parts_note"] ?? "") ?: null;
            db_exec($db, "UPDATE ego_jobs SET status='on_hold', hold_reason=?, parts_required=?, parts_note=? WHERE id=?",
                "sisi", $reason, $parts, $partsNote, $id);
            $note = $reason ?: $note;
        } else {
            db_exec($db, "UPDATE ego_jobs SET status=? WHERE id=?", "si", $to, $id);
        }
        log_activity($db, $id, (int)$actor["id"], "status_changed", ["from" => $from, "to" => $to, "note" => $note]);
        if ($to === "completed") {
            log_activity($db, $id, null, "ready_to_invoice", []);
            notify_job_completed($db, $id); // M12: alert the office
        }
        send(["ok" => true, "status" => $to]);
    }

    /* ===================== M5: ENGINEER (own jobs only) ===================== */
    case "GET /me/jobs/today": {
        $me = require_user($db);
        $rows = db_all($db,
            "SELECT j.id,j.reference,j.title,j.status,j.priority,j.scheduled_start,j.scheduled_end,
                    c.name AS customer_name, c.phone AS customer_phone,
                    a.line1,a.city,a.postcode
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             LEFT JOIN ego_addresses a ON a.id=j.address_id
             WHERE j.deleted_at IS NULL AND j.engineer_id=? AND DATE(j.scheduled_start)=CURDATE()
               AND j.status NOT IN ('closed','cancelled','paid','invoiced')
             ORDER BY FIELD(j.priority,'urgent','normal','low'), j.scheduled_start", "i", (int)$me["id"]);
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; }
        send(["jobs" => $rows]);
    }

    case "GET /me/jobs": {
        $me = require_user($db);
        $rows = db_all($db,
            "SELECT j.id,j.reference,j.title,j.status,j.priority,j.scheduled_start,
                    c.name AS customer_name, a.line1,a.city,a.postcode
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             LEFT JOIN ego_addresses a ON a.id=j.address_id
             WHERE j.deleted_at IS NULL AND j.engineer_id=?
               AND j.status NOT IN ('closed','cancelled','paid')
             ORDER BY j.scheduled_start IS NULL, j.scheduled_start", "i", (int)$me["id"]);
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; }
        send(["jobs" => $rows]);
    }

    case "GET /me/jobs/get": {
        $me = require_user($db);
        $job = load_owned_job($db, $me, (int)($_GET["id"] ?? 0));
        $c = db_one($db, "SELECT name,phone,email FROM ego_customers WHERE id=?", "i", (int)$job["customer_id"]);
        $addr = $job["address_id"] ? db_one($db, "SELECT line1,line2,city,postcode FROM ego_addresses WHERE id=?", "i", (int)$job["address_id"]) : null;
        $photos = db_all($db, "SELECT id,url,caption,created_at FROM ego_job_photos WHERE job_id=? ORDER BY id DESC", "i", (int)$job["id"]);
        foreach ($photos as &$ph) { $ph["id"] = (int)$ph["id"]; }
        $notes = db_all($db, "SELECT n.body,n.created_at,u.name AS author FROM ego_job_notes n LEFT JOIN ego_users u ON u.id=n.author_id WHERE n.job_id=? ORDER BY n.id DESC", "i", (int)$job["id"]);
        $checklist = db_all($db, "SELECT id,label,done FROM ego_job_checklist WHERE job_id=? ORDER BY sort,id", "i", (int)$job["id"]);
        foreach ($checklist as &$ck) { $ck["id"] = (int)$ck["id"]; $ck["done"] = (int)$ck["done"]; }
        // Office-shared messages — labelled by ORIGIN so the engineer sees customer
        // messages as from the customer (portal/inbound), office notes as from the office.
        $messages = db_all($db,
            "SELECT direction,channel,from_name,subject,body,created_at FROM ego_messages
             WHERE job_id=? AND visible_to_engineer=1 ORDER BY id DESC", "i", (int)$job["id"]);
        foreach ($messages as &$m) {
            $fromCustomer = ($m["direction"] === "inbound") || in_array($m["channel"], ["portal", "review"], true);
            $m["from"] = $fromCustomer ? ($m["from_name"] ?: ($c["name"] ?? "Customer")) : "Office";
            $m["is_customer"] = $fromCustomer ? 1 : 0;
        }
        send([
            "job" => [
                "id" => (int)$job["id"], "reference" => $job["reference"], "title" => $job["title"],
                "summary" => $job["summary"] ?? null,
                "description" => $job["description"], "engineer_brief" => $job["engineer_brief"] ?? null,
                "status" => $job["status"], "priority" => $job["priority"],
                "scheduled_start" => $job["scheduled_start"], "scheduled_end" => $job["scheduled_end"],
                "customer_name" => $c["name"] ?? null, "customer_phone" => $c["phone"] ?? null, "customer_email" => $c["email"] ?? null,
                "address" => $addr, "photos" => $photos, "notes" => $notes, "checklist" => $checklist,
                "hold_reason" => $job["hold_reason"] ?? null,
                "parts_required" => (int)($job["parts_required"] ?? 0),
                "parts_note" => $job["parts_note"] ?? null,
                "messages" => $messages,
            ],
        ]);
    }

    // Engineer AI helper: tidy a rough on-site note into a clear update for office + customer.
    case "POST /me/note/ai": {
        require_user($db); // engineers allowed (the office's general AI lives on /ai/draft)
        $text = trim(body()["text"] ?? "");
        if ($text === "") fail("Write a few words first");
        $prompt = "You are helping a UK field-service engineer write a clear on-site note for the office and the customer. "
            . "Rewrite the engineer's rough note into 2-3 clear, professional sentences. Keep ONLY the facts given — do not invent details, prices, or promises. Plain text only, no preamble.\n\n"
            . "Rough note: " . $text;
        try { $out = ai_draft($db, $prompt); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        send(["text" => trim($out)]);
    }

    // Engineer ticks an on-site checklist item (must own the job).
    case "POST /jobs/checklist/toggle": {
        $me = require_user($db);
        $b = body();
        $itemId = (int)($b["id"] ?? 0);
        if (!$itemId) fail("id required");
        $row = db_one($db, "SELECT c.id, c.job_id FROM ego_job_checklist c WHERE c.id=?", "i", $itemId);
        if (!$row) fail("Item not found", 404);
        load_owned_job($db, $me, (int)$row["job_id"]); // ownership (admin = any, engineer = own)
        $done = !empty($b["done"]) ? 1 : 0;
        db_exec($db, "UPDATE ego_job_checklist SET done=?, done_at=" . ($done ? "NOW()" : "NULL") . ", done_by=? WHERE id=?",
            "iii", $done, ($done ? (int)$me["id"] : 0), $itemId);
        send(["ok" => true, "done" => $done]);
    }

    // Engineer adds their own checklist item on site (must own the job).
    case "POST /jobs/checklist/add": {
        $me = require_user($db);
        $b = body();
        $jobId = (int)($b["job_id"] ?? 0);
        $label = trim($b["label"] ?? "");
        if (!$jobId || $label === "") fail("job_id and label required");
        load_owned_job($db, $me, $jobId); // ownership
        $sort = (int)(db_one($db, "SELECT COALESCE(MAX(sort),0)+1 s FROM ego_job_checklist WHERE job_id=?", "i", $jobId)["s"] ?? 1);
        db_exec($db, "INSERT INTO ego_job_checklist (job_id,label,sort) VALUES (?,?,?)", "isi", $jobId, $label, $sort);
        send(["ok" => true, "id" => (int)$db->insert_id]);
    }

    case "GET /me/history": {
        $me = require_user($db);
        $rows = db_all($db,
            "SELECT j.id,j.reference,j.title,j.status,j.completed_at,j.scheduled_start,c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             WHERE j.deleted_at IS NULL AND j.engineer_id=? AND j.status IN ('completed','invoiced','paid','closed')
             ORDER BY COALESCE(j.completed_at, j.scheduled_start) DESC LIMIT 100", "i", (int)$me["id"]);
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; }
        $st = db_one($db,
            "SELECT COUNT(*) total,
                    SUM(DATE(completed_at)=CURDATE()) today,
                    SUM(YEARWEEK(completed_at,1)=YEARWEEK(CURDATE(),1)) week
             FROM ego_jobs WHERE engineer_id=? AND status IN ('completed','invoiced','paid','closed')", "i", (int)$me["id"]);
        send(["history" => $rows, "stats" => ["total" => (int)($st["total"] ?? 0), "today" => (int)($st["today"] ?? 0), "week" => (int)($st["week"] ?? 0)]]);
    }

    case "POST /jobs/note": {
        $me = require_user($db);
        $b = body();
        $job = load_owned_job($db, $me, (int)($b["id"] ?? 0));
        $bodyTxt = trim($b["body"] ?? "");
        if ($bodyTxt === "") fail("Note is empty");
        db_exec($db, "INSERT INTO ego_job_notes (job_id,author_id,body) VALUES (?,?,?)", "iis", (int)$job["id"], (int)$me["id"], $bodyTxt);
        log_activity($db, (int)$job["id"], (int)$me["id"], "note", ["body" => $bodyTxt]);
        send(["ok" => true], 201);
    }

    case "POST /jobs/photo": {
        $me = require_user($db);
        $b = body();
        $job = load_owned_job($db, $me, (int)($b["id"] ?? 0));
        $data = $b["data"] ?? "";
        if (!preg_match('#^data:image/(png|jpe?g|webp);base64,(.+)$#', $data, $m)) fail("Invalid image");
        $ext = $m[1] === "jpeg" ? "jpg" : $m[1];
        $bin = base64_decode($m[2], true);
        if ($bin === false || strlen($bin) > 6_000_000) fail("Image too large or invalid");
        $dir = __DIR__ . "/uploads";
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $fname = "job{$job['id']}_" . bin2hex(random_bytes(6)) . ".$ext";
        file_put_contents("$dir/$fname", $bin);
        $url = "/api/uploads/$fname";
        $caption = trim($b["caption"] ?? "") ?: null;
        db_exec($db, "INSERT INTO ego_job_photos (job_id,url,caption,uploaded_by) VALUES (?,?,?,?)", "issi", (int)$job["id"], $url, $caption, (int)$me["id"]);
        log_activity($db, (int)$job["id"], (int)$me["id"], "photo", ["url" => $url]);
        send(["ok" => true, "url" => $url], 201);
    }

    /* ===================== M6/M7: QUOTES + INVOICES (admin) ===================== */
    case "GET /invoices": {
        require_role($db, "admin");
        $kind = $_GET["kind"] ?? "";        // quote | invoice | ''
        $status = $_GET["status"] ?? "";    // draft|sent|overdue|paid|... | ''
        $where = "i.deleted_at IS NULL";
        $types = ""; $args = [];
        if ($kind === "quote" || $kind === "invoice") { $where .= " AND i.kind=?"; $types .= "s"; $args[] = $kind; }
        if ($status === "overdue") { $where .= " AND i.status='sent' AND i.due_date < CURDATE()"; }
        elseif ($status === "sent") { $where .= " AND i.status='sent' AND (i.due_date IS NULL OR i.due_date >= CURDATE())"; }
        elseif ($status !== "") { $where .= " AND i.status=?"; $types .= "s"; $args[] = $status; }
        $rows = db_all($db,
            "SELECT i.id,i.kind,i.number,i.payment_reference,i.status,i.issue_date,i.due_date,i.total,
                    c.name AS customer_name, j.reference AS job_reference
             FROM ego_invoices i JOIN ego_customers c ON c.id=i.customer_id JOIN ego_jobs j ON j.id=i.job_id
             WHERE $where ORDER BY i.created_at DESC", $types, ...$args);
        foreach ($rows as &$r) {
            $r["id"] = (int)$r["id"];
            if ($r["kind"] === "invoice" && $r["status"] === "sent" && $r["due_date"] && $r["due_date"] < date("Y-m-d")) $r["status"] = "overdue";
        }
        send(["invoices" => $rows]);
    }

    case "GET /invoices/get": {
        require_role($db, "admin");
        $id = (int)($_GET["id"] ?? 0);
        $inv = db_one($db,
            "SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                    j.reference AS job_reference, j.title AS job_title
             FROM ego_invoices i JOIN ego_customers c ON c.id=i.customer_id JOIN ego_jobs j ON j.id=i.job_id
             WHERE i.id=? AND i.deleted_at IS NULL", "i", $id);
        if (!$inv) fail("Not found", 404);
        $inv["id"] = (int)$inv["id"];
        $inv["lines"] = db_all($db, "SELECT description,quantity,unit_price,line_total FROM ego_invoice_lines WHERE invoice_id=? ORDER BY sort,id", "i", $id);
        $inv["payments"] = db_all($db, "SELECT amount,paid_on,reference,note FROM ego_payments WHERE invoice_id=? ORDER BY id", "i", $id);
        $cust = db_one($db, "SELECT a.line1,a.line2,a.city,a.postcode FROM ego_addresses a WHERE a.customer_id=? AND a.is_primary=1", "i", (int)$inv["customer_id"]);
        $inv["customer_address"] = $cust;
        $inv["company"] = db_one($db, "SELECT company_name,address,phone,email,vat_number,logo_url,bank_account_name,bank_sort_code,bank_account_number,payment_terms_days FROM ego_company_settings ORDER BY id LIMIT 1");
        if ($inv["kind"] === "invoice" && $inv["status"] === "sent" && $inv["due_date"] && $inv["due_date"] < date("Y-m-d")) $inv["status"] = "overdue";
        send(["invoice" => $inv]);
    }

    case "POST /invoices": {
        $actor = require_role($db, "admin");
        $b = body();
        $jobId = (int)($b["job_id"] ?? 0);
        $kind = ($b["kind"] ?? "invoice") === "quote" ? "quote" : "invoice";
        $job = db_one($db, "SELECT id,customer_id,reference,status FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $jobId);
        if (!$job) fail("Job not found", 404);
        $vatRate = (float)($b["vat_rate"] ?? 20);
        $t = compute_totals($b["lines"] ?? [], $vatRate);
        // Header + lines in one transaction so a mid-loop failure can't leave a document
        // whose stored totals disagree with its lines.
        $db->begin_transaction();
        try {
            db_exec($db,
                "INSERT INTO ego_invoices (kind,job_id,customer_id,payment_reference,status,subtotal,vat_rate,vat_amount,total,notes)
                 VALUES (?,?,?,?, 'draft', ?,?,?,?,?)",
                "siisdddds", $kind, $jobId, (int)$job["customer_id"], $job["reference"], $t["subtotal"], $vatRate, $t["vat_amount"], $t["total"], trim($b["notes"] ?? "") ?: null);
            $invId = (int)$db->insert_id;
            $sort = 0;
            foreach ($t["lines"] as $l) {
                db_exec($db, "INSERT INTO ego_invoice_lines (invoice_id,description,quantity,unit_price,line_total,sort) VALUES (?,?,?,?,?,?)",
                    "isdddi", $invId, $l["description"], $l["quantity"], $l["unit_price"], $l["line_total"], $sort++);
            }
            log_activity($db, $jobId, (int)$actor["id"], $kind === "quote" ? "quote_created" : "invoice_created", ["id" => $invId]);
            $db->commit();
            send(["id" => $invId], 201);
        } catch (Throwable $e) { $db->rollback(); client_error($e, "Could not create the document"); }
    }

    case "POST /invoices/update": {
        require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $inv = db_one($db, "SELECT id,status FROM ego_invoices WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$inv) fail("Not found", 404);
        if ($inv["status"] !== "draft") fail("Only drafts can be edited", 409);
        $vatRate = (float)($b["vat_rate"] ?? 20);
        $t = compute_totals($b["lines"] ?? [], $vatRate);
        db_exec($db, "UPDATE ego_invoices SET vat_rate=?,subtotal=?,vat_amount=?,total=?,notes=? WHERE id=?",
            "ddddsi", $vatRate, $t["subtotal"], $t["vat_amount"], $t["total"], trim($b["notes"] ?? "") ?: null, $id);
        db_exec($db, "DELETE FROM ego_invoice_lines WHERE invoice_id=?", "i", $id);
        $sort = 0;
        foreach ($t["lines"] as $l) {
            db_exec($db, "INSERT INTO ego_invoice_lines (invoice_id,description,quantity,unit_price,line_total,sort) VALUES (?,?,?,?,?,?)",
                "isdddi", $id, $l["description"], $l["quantity"], $l["unit_price"], $l["line_total"], $sort++);
        }
        send(["ok" => true]);
    }

    case "POST /invoices/send": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $db->begin_transaction();
        try {
            $inv = db_one($db, "SELECT id,kind,number,status,job_id FROM ego_invoices WHERE id=? AND deleted_at IS NULL", "i", $id);
            if (!$inv) throw new RuntimeException("Not found");
            $cidForNum = (int)(db_one($db, "SELECT customer_id FROM ego_invoices WHERE id=?", "i", $id)["customer_id"] ?? 0);
            $number = $inv["number"] ?: allocate_doc_number($db, $inv["kind"], $cidForNum); // per-customer, transactional
            $terms = (int)(db_one($db, "SELECT payment_terms_days FROM ego_company_settings ORDER BY id LIMIT 1")["payment_terms_days"] ?? 14);
            db_exec($db, "UPDATE ego_invoices SET number=?, status='sent', issue_date=CURDATE(),
                          due_date=DATE_ADD(CURDATE(), INTERVAL ? DAY), sent_at=NOW() WHERE id=?",
                "sii", $number, $terms, $id);
            // invoice send moves the job completed -> invoiced
            if ($inv["kind"] === "invoice") {
                $job = db_one($db, "SELECT status FROM ego_jobs WHERE id=?", "i", (int)$inv["job_id"]);
                if ($job && $job["status"] === "completed") {
                    db_exec($db, "UPDATE ego_jobs SET status='invoiced' WHERE id=?", "i", (int)$inv["job_id"]);
                    log_activity($db, (int)$inv["job_id"], (int)$actor["id"], "status_changed", ["from" => "completed", "to" => "invoiced"]);
                }
            }
            log_activity($db, (int)$inv["job_id"], (int)$actor["id"], $inv["kind"] === "quote" ? "quote_sent" : "invoice_sent", ["number" => $number]);
            $db->commit();
            send(["ok" => true, "number" => $number]);
        } catch (Throwable $e) { $db->rollback(); client_error($e, "Something went wrong"); }
    }

    case "POST /invoices/void": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $inv = db_one($db, "SELECT id,kind,status,job_id FROM ego_invoices WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$inv) fail("Not found", 404);
        if (in_array($inv["status"], ["paid", "void"], true)) fail("A paid or already-void document can't be voided", 409);
        db_exec($db, "UPDATE ego_invoices SET status='void' WHERE id=?", "i", $id);
        if ($inv["kind"] === "invoice") {
            $job = db_one($db, "SELECT status FROM ego_jobs WHERE id=?", "i", (int)$inv["job_id"]);
            if ($job && $job["status"] === "invoiced") {
                db_exec($db, "UPDATE ego_jobs SET status='completed' WHERE id=?", "i", (int)$inv["job_id"]);
                log_activity($db, (int)$inv["job_id"], (int)$actor["id"], "status_changed", ["from" => "invoiced", "to" => "completed"]);
            }
        }
        send(["ok" => true]);
    }

    case "POST /invoices/pay": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $inv = db_one($db, "SELECT id,kind,status,job_id,total FROM ego_invoices WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$inv) fail("Not found", 404);
        if ($inv["kind"] !== "invoice") fail("Only invoices take payment", 400);
        if (in_array($inv["status"], ["paid", "void"], true)) fail("This invoice is already " . $inv["status"], 409);
        $total = round((float)$inv["total"], 2);
        $amount = round((float)($b["amount"] ?? $inv["total"]), 2);
        if ($amount <= 0) fail("Payment amount must be more than zero");
        $paidOn = trim($b["paid_on"] ?? "") ?: date("Y-m-d");
        $ref = trim($b["reference"] ?? "") ?: null;
        $note = trim($b["note"] ?? "") ?: null;
        // Partial payments are allowed: the invoice only flips to 'paid' (and the job to
        // 'closed') once the summed payments cover the total. Record + update atomically.
        $db->begin_transaction();
        try {
            $already = round((float)(db_one($db, "SELECT COALESCE(SUM(amount),0) s FROM ego_payments WHERE invoice_id=?", "i", $id)["s"] ?? 0), 2);
            if ($amount > $total - $already + 0.01) throw new RuntimeException("That's more than the outstanding balance of £" . number_format(max(0, $total - $already), 2));
            db_exec($db, "INSERT INTO ego_payments (invoice_id,amount,paid_on,reference,note,recorded_by) VALUES (?,?,?,?,?,?)",
                "idsssi", $id, $amount, $paidOn, $ref, $note, (int)$actor["id"]);
            $paidNow = round($already + $amount, 2);
            $fullyPaid = $paidNow >= $total - 0.01;
            if ($fullyPaid) {
                db_exec($db, "UPDATE ego_invoices SET status='paid', paid_at=NOW() WHERE id=?", "i", $id);
                $job = db_one($db, "SELECT status FROM ego_jobs WHERE id=?", "i", (int)$inv["job_id"]);
                if ($job && $job["status"] === "invoiced") {
                    db_exec($db, "UPDATE ego_jobs SET status='closed' WHERE id=?", "i", (int)$inv["job_id"]);
                    log_activity($db, (int)$inv["job_id"], (int)$actor["id"], "status_changed", ["from" => "invoiced", "to" => "closed"]);
                }
            }
            log_activity($db, (int)$inv["job_id"], (int)$actor["id"], "payment_recorded", ["amount" => $amount, "reference" => $ref, "balance" => round(max(0, $total - $paidNow), 2)]);
            $db->commit();
            send(["ok" => true, "paid_in_full" => $fullyPaid, "balance" => round(max(0, $total - $paidNow), 2)]);
        } catch (Throwable $e) { $db->rollback(); client_error($e, "Could not record the payment"); }
    }

    /* ===================== M7: DASHBOARD ===================== */
    case "GET /dashboard": {
        require_role($db, "admin");
        $todayJobs = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_jobs WHERE deleted_at IS NULL AND DATE(scheduled_start)=CURDATE() AND status NOT IN ('closed','cancelled')")["c"] ?? 0);
        $toSchedule = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_jobs WHERE deleted_at IS NULL AND status='new'")["c"] ?? 0);
        // Operational pulse
        $inProgress = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_jobs WHERE deleted_at IS NULL AND status IN ('en_route','on_site')")["c"] ?? 0);
        $completedToday = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_jobs WHERE deleted_at IS NULL AND DATE(completed_at)=CURDATE()")["c"] ?? 0);
        $openJobs = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_jobs WHERE deleted_at IS NULL AND status NOT IN ('closed','cancelled','paid')")["c"] ?? 0);
        // Money
        $unpaid = (float)(db_one($db, "SELECT COALESCE(SUM(total),0) s FROM ego_invoices WHERE deleted_at IS NULL AND kind='invoice' AND status='sent'")["s"] ?? 0);
        $overdue = (float)(db_one($db, "SELECT COALESCE(SUM(total),0) s FROM ego_invoices WHERE deleted_at IS NULL AND kind='invoice' AND status='sent' AND due_date < CURDATE()")["s"] ?? 0);
        $collected30 = (float)(db_one($db, "SELECT COALESCE(SUM(amount),0) s FROM ego_payments WHERE paid_on >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)")["s"] ?? 0);
        // Customer satisfaction
        $rev = db_one($db, "SELECT COUNT(*) n, AVG(rating) avg FROM ego_messages WHERE channel='review'");
        $reviewCount = (int)($rev["n"] ?? 0);
        $reviewAvg = ($rev && $rev["avg"] !== null) ? round((float)$rev["avg"], 2) : null;
        $recent = db_all($db,
            "SELECT a.action,a.detail,a.created_at,a.job_id,j.reference AS job_reference,u.name AS actor_name
             FROM ego_activity_log a LEFT JOIN ego_jobs j ON j.id=a.job_id LEFT JOIN ego_users u ON u.id=a.actor_id
             ORDER BY a.id DESC LIMIT 12");
        $today = db_all($db,
            "SELECT j.id,j.reference,j.title,j.status,j.scheduled_start,c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             WHERE j.deleted_at IS NULL AND DATE(j.scheduled_start)=CURDATE() AND j.status NOT IN ('closed','cancelled')
             ORDER BY j.scheduled_start");
        foreach ($today as &$r) { $r["id"] = (int)$r["id"]; }
        // Waitlist: active jobs awaiting a schedule slot OR an engineer
        $waitlist = db_all($db,
            "SELECT j.id,j.reference,j.title,j.priority,j.status,j.scheduled_start,j.engineer_id,c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             WHERE j.deleted_at IS NULL
               AND j.status NOT IN ('completed','invoiced','paid','closed','cancelled')
               AND (j.scheduled_start IS NULL OR j.engineer_id IS NULL)
             ORDER BY FIELD(j.priority,'urgent','normal','low'), j.created_at");
        foreach ($waitlist as &$w) {
            $w["id"] = (int)$w["id"];
            $w["reason"] = $w["scheduled_start"] === null ? "schedule" : "assign";
        }
        // Customer REVIEWS only (newest first). GDPR: private 1:1 portal messages are NOT
        // surfaced on the shared dashboard — they stay on the specific job they belong to.
        $messages = db_all($db,
            "SELECT m.id,m.from_name,m.body,m.channel,m.rating,m.acknowledged,m.created_at,m.job_id,j.reference AS job_reference,c.name AS customer_name
             FROM ego_messages m LEFT JOIN ego_jobs j ON j.id=m.job_id LEFT JOIN ego_customers c ON c.id=m.customer_id
             WHERE m.direction='inbound' AND m.channel='review'
             ORDER BY m.id DESC LIMIT 8");
        foreach ($messages as &$m) { $m["id"] = (int)$m["id"]; $m["job_id"] = $m["job_id"] !== null ? (int)$m["job_id"] : null; $m["acknowledged"] = (int)$m["acknowledged"]; $m["rating"] = $m["rating"] !== null ? (int)$m["rating"] : null; }
        $unreadMsgs = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_messages WHERE direction='inbound' AND channel='review' AND acknowledged=0")["c"] ?? 0);
        send([
            "today_jobs" => $todayJobs, "to_schedule" => $toSchedule,
            "in_progress" => $inProgress, "completed_today" => $completedToday, "open_jobs" => $openJobs,
            "unpaid_total" => $unpaid, "overdue_total" => $overdue, "collected_30d" => $collected30,
            "review_avg" => $reviewAvg, "review_count" => $reviewCount,
            "today" => $today, "recent" => $recent, "waitlist" => $waitlist,
            "messages" => $messages, "unread_messages" => $unreadMsgs,
        ]);
    }

    /* ===================== TOP-NAV NOTIFICATIONS (recent events) ===================== */
    // Recent things that happened: new emails, client messages, completed jobs, reviews.
    // The badge counts only items NEWER than the last time this user opened the bell.
    case "GET /notifications": {
        $me = require_role($db, "admin");
        $seen = db_one($db, "SELECT notifications_seen_at FROM ego_users WHERE id=?", "i", (int)$me["id"])["notifications_seen_at"] ?? null;
        $items = [];

        // Recent inbound messages → emails, client portal messages, reviews
        $msgs = db_all($db,
            "SELECT m.id,m.channel,m.from_name,m.from_email,m.subject,m.body,m.rating,m.created_at,
                    m.job_id, j.reference AS job_reference, c.name AS customer_name
             FROM ego_messages m
             LEFT JOIN ego_jobs j ON j.id=m.job_id
             LEFT JOIN ego_customers c ON c.id=m.customer_id
             WHERE m.direction='inbound' AND (m.channel IS NULL OR m.channel IN ('email','portal','review','enquiry'))
             ORDER BY m.id DESC LIMIT 15");
        foreach ($msgs as $m) {
            $who = $m["from_name"] ?: ($m["customer_name"] ?: ($m["from_email"] ?: "Customer"));
            if ($m["channel"] === "review") {
                $items[] = ["type" => "review", "tone" => "warning", "created_at" => $m["created_at"],
                    "title" => "New review" . ($m["rating"] ? " · {$m['rating']}★" : ""), "description" => $who, "to" => "/ego/reviews"];
            } elseif ($m["channel"] === "enquiry") {
                $items[] = ["type" => "message", "tone" => "success", "created_at" => $m["created_at"],
                    "title" => "New website enquiry", "description" => $who . ": " . substr((string)$m["body"], 0, 48), "to" => "/apps/email"];
            } elseif ($m["channel"] === "portal") {
                $items[] = ["type" => "message", "tone" => "info", "created_at" => $m["created_at"],
                    "title" => "Client message", "description" => $who . ": " . substr((string)$m["body"], 0, 48),
                    "to" => $m["job_id"] ? "/ego/jobs/detail?id=" . (int)$m["job_id"] : "/apps/email"];
            } else {
                $items[] = ["type" => "email", "tone" => "info", "created_at" => $m["created_at"],
                    "title" => "New email", "description" => $who . ": " . ($m["subject"] ?: "(no subject)"), "to" => "/apps/email"];
            }
        }

        // Recently completed jobs (ready to invoice)
        foreach (db_all($db,
            "SELECT j.id,j.reference,j.completed_at, c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             WHERE j.deleted_at IS NULL AND j.completed_at IS NOT NULL
             ORDER BY j.completed_at DESC LIMIT 10") as $j) {
            $items[] = ["type" => "completed", "tone" => "success", "created_at" => $j["completed_at"],
                "title" => "Job completed", "description" => $j["reference"] . " · " . $j["customer_name"] . " — ready to invoice",
                "to" => "/ego/jobs/detail?id=" . (int)$j["id"]];
        }

        usort($items, fn($a, $b) => strcmp((string)($b["created_at"] ?? ""), (string)($a["created_at"] ?? "")));
        $items = array_slice($items, 0, 12);

        $count = 0;
        foreach ($items as &$it) {
            $it["unread"] = ($seen === null || (string)($it["created_at"] ?? "") > $seen) ? 1 : 0;
            $count += $it["unread"];
        }
        send(["items" => $items, "count" => $count]);
    }

    // Mark the bell as seen → clears the badge for everything already shown.
    case "POST /notifications/seen": {
        $me = require_role($db, "admin");
        db_exec($db, "UPDATE ego_users SET notifications_seen_at=NOW() WHERE id=?", "i", (int)$me["id"]);
        send(["ok" => true]);
    }

    /* ===================== WORKSPACE: ACTIVITY LOG (audit trail) ===================== */
    // The single, append-only company log (who actioned what). NEVER deleted/wiped.
    // Visibility: FOUNDER sees everything (+ filter by any user); every other staff
    // member sees ONLY their own actions (transparency). Paginated, 12 per page.
    case "GET /activity": {
        $me = require_role($db, "admin"); // office+ reach the workspace; scope below
        $isFounder = role_rank($me["role"]) >= ROLE_RANK["founder"];
        $per = 12;
        $page = max(1, (int)($_GET["page"] ?? 1));
        $offset = ($page - 1) * $per;
        $q = trim($_GET["q"] ?? "");

        $where = []; $types = ""; $args = [];
        if (!$isFounder) {
            $where[] = "a.actor_id = ?"; $types .= "i"; $args[] = (int)$me["id"];        // locked to self
        } elseif (isset($_GET["user"]) && $_GET["user"] !== "") {
            $where[] = "a.actor_id = ?"; $types .= "i"; $args[] = (int)$_GET["user"];     // founder filter
        }
        if ($q !== "") {
            $where[] = "(a.action LIKE ? OR a.detail LIKE ? OR j.reference LIKE ? OR u.name LIKE ?)";
            $like = "%$q%"; $types .= "ssss"; array_push($args, $like, $like, $like, $like);
        }
        $wsql = $where ? "WHERE " . implode(" AND ", $where) : "";

        $total = (int)(db_one($db,
            "SELECT COUNT(*) c FROM ego_activity_log a
             LEFT JOIN ego_jobs j ON j.id=a.job_id LEFT JOIN ego_users u ON u.id=a.actor_id $wsql",
            $types, ...$args)["c"] ?? 0);

        $rows = db_all($db,
            "SELECT a.id,a.action,a.detail,a.created_at,a.job_id,a.actor_id,
                    j.reference AS job_reference, u.name AS actor_name
             FROM ego_activity_log a
             LEFT JOIN ego_jobs j ON j.id=a.job_id
             LEFT JOIN ego_users u ON u.id=a.actor_id
             $wsql ORDER BY a.id DESC LIMIT ? OFFSET ?",
            $types . "ii", ...array_merge($args, [$per, $offset]));
        foreach ($rows as &$r) {
            $r["id"] = (int)$r["id"];
            $r["job_id"] = $r["job_id"] !== null ? (int)$r["job_id"] : null;
            $r["actor_id"] = $r["actor_id"] !== null ? (int)$r["actor_id"] : null;
        }

        $resp = [
            "activity" => $rows, "total" => $total, "page" => $page, "per_page" => $per,
            "pages" => (int)ceil($total / $per), "scope" => $isFounder ? "all" : "self",
        ];
        if ($isFounder) {
            $users = db_all($db, "SELECT id,name,role FROM ego_users WHERE deleted_at IS NULL ORDER BY name");
            foreach ($users as &$u) $u["id"] = (int)$u["id"];
            $resp["users"] = $users;
        }
        send($resp);
    }

    /* ===================== WORKSPACE: CUSTOMER REVIEWS (admin) ===================== */
    // Star reviews left via the customer portal (ego_messages, channel='review').
    // Recorded permanently; paginated 12 per page. Average/count are over ALL reviews.
    case "GET /reviews": {
        require_role($db, "admin");
        $per = 12;
        $page = max(1, (int)($_GET["page"] ?? 1));
        $offset = ($page - 1) * $per;
        $rows = db_all($db,
            "SELECT m.id,m.rating,m.body,m.from_name,m.created_at,m.acknowledged,m.job_id,m.source,
                    j.reference AS job_reference, c.name AS customer_name
             FROM ego_messages m
             LEFT JOIN ego_jobs j ON j.id=m.job_id
             LEFT JOIN ego_customers c ON c.id=m.customer_id
             WHERE m.channel='review'
             ORDER BY m.id DESC LIMIT ? OFFSET ?", "ii", $per, $offset);
        foreach ($rows as &$r) {
            $r["id"] = (int)$r["id"];
            $r["rating"] = $r["rating"] !== null ? (int)$r["rating"] : null;
            $r["acknowledged"] = (int)$r["acknowledged"];
            $r["job_id"] = $r["job_id"] !== null ? (int)$r["job_id"] : null;
        }
        $agg = db_one($db, "SELECT COUNT(*) n, AVG(rating) avg FROM ego_messages WHERE channel='review'");
        $count = (int)($agg["n"] ?? 0);
        send([
            "reviews" => $rows,
            "count" => $count,
            "average" => ($agg && $agg["avg"] !== null) ? round((float)$agg["avg"], 2) : null,
            "total" => $count, "page" => $page, "per_page" => $per, "pages" => (int)ceil($count / $per),
        ]);
    }

    /* ===================== M8: SETTINGS (admin) ===================== */
    case "GET /settings": {
        require_role($db, "admin");
        $s = db_one($db, "SELECT * FROM ego_company_settings ORDER BY id LIMIT 1");
        send(["settings" => $s]);
    }

    case "POST /settings": {
        require_min($db, "manager"); // company config: manager + founder only
        $b = body();
        $s = db_one($db, "SELECT id FROM ego_company_settings ORDER BY id LIMIT 1");
        if (!$s) fail("Settings missing", 500);
        $fields = ["company_name","address","phone","email","vat_number","companies_house_no","default_vat_rate","logo_url",
                   "bank_account_name","bank_sort_code","bank_account_number","invoice_prefix","job_prefix","quote_prefix","payment_terms_days",
                   "notify_on_complete","notify_email"];
        $set = []; $types = ""; $args = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $b)) {
                $set[] = "$f=?";
                if (in_array($f, ["default_vat_rate","payment_terms_days","notify_on_complete"], true)) { $types .= "d"; $args[] = (float)$b[$f]; }
                else { $types .= "s"; $args[] = (string)$b[$f]; }
            }
        }
        if ($set) {
            $types .= "i"; $args[] = (int)$s["id"];
            db_exec($db, "UPDATE ego_company_settings SET " . implode(",", $set) . " WHERE id=?", $types, ...$args);
        }
        send(["ok" => true]);
    }

    /* ===================== Phase 2: INTEGRATIONS (admin) ===================== */
    // Secrets live ONLY in MySQL (ego_integrations) — never in the repo / git.
    case "GET /integrations": {
        require_min($db, "founder"); // API keys / secrets: founder only
        $spec = integration_fields();
        $rows = db_all($db, "SELECT k,v FROM ego_integrations");
        $have = [];
        foreach ($rows as $r) $have[$r["k"]] = $r["v"];
        $fields = []; $configured = [];
        foreach ($spec as $key => $secret) {
            if ($secret) {
                $val = $have[$key] ?? "";
                $configured[$key] = $val !== "";
                $fields[$key] = $val !== "" ? "••••" . substr($val, -4) : ""; // masked, never the real value
            } else {
                $fields[$key] = $have[$key] ?? "";
            }
        }
        send(["fields" => $fields, "configured" => $configured]);
    }

    case "POST /integrations": {
        require_min($db, "founder"); // API keys / secrets: founder only
        $b = body();
        $spec = integration_fields();
        $st = $db->prepare("INSERT INTO ego_integrations (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)");
        foreach ($spec as $key => $secret) {
            if (!array_key_exists($key, $b)) continue;
            $val = (string)$b[$key];
            if ($secret && $val === "") continue;          // blank secret = keep existing
            if ($secret && str_starts_with($val, "••••")) continue; // masked placeholder = unchanged
            $st->bind_param("ss", $key, $val);
            $st->execute();
        }
        send(["ok" => true]);
    }

    /* ===================== Phase 2: WEATHER (OpenWeather proxy) ===================== */
    case "GET /weather": {
        require_user($db);
        $key = integ($db, "openweather_key");
        if (!$key) fail("OpenWeather key not set (Settings → Integrations)", 400);
        $city = $_GET["city"] ?? (integ($db, "weather_city") ?? "Birmingham,GB");
        $city = preg_replace('/\s+([A-Za-z]{2})$/', ',$1', trim($city)); // "London GB" -> "London,GB"
        $get = function (string $path) use ($city, $key) {
            $ch = curl_init("https://api.openweathermap.org/data/2.5/$path?q=" . urlencode($city) . "&units=metric&appid=" . urlencode($key));
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12]);
            $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
            return [$c, json_decode($r ?: "null", true)];
        };
        [$code, $w] = $get("weather");
        if ($code !== 200) fail("OpenWeather rejected the request — check the key/city", 400);
        $m = $w["main"] ?? [];
        $t = $m["temp"] ?? null; $h = $m["humidity"] ?? null;
        $dew = ($t !== null && $h !== null) ? round($t - ((100 - $h) / 5), 1) : null; // Magnus approx
        // 5-day / 3-hour forecast → one reading per day (~midday)
        $forecast = [];
        [$fc, $f] = $get("forecast");
        if ($fc === 200 && !empty($f["list"])) {
            $seen = [];
            foreach ($f["list"] as $row) {
                $day = substr($row["dt_txt"] ?? "", 0, 10);
                $hour = substr($row["dt_txt"] ?? "", 11, 2);
                if ($day === "" || isset($seen[$day])) continue;
                if ($hour !== "12" && count($seen) > 0) continue; // prefer midday, but take first of each day
                $seen[$day] = true;
                $forecast[] = [
                    "date" => $day,
                    "temp" => $row["main"]["temp"] ?? null,
                    "icon" => $row["weather"][0]["icon"] ?? "",
                    "desc" => $row["weather"][0]["description"] ?? "",
                ];
                if (count($forecast) >= 6) break;
            }
        }
        send([
            "city" => $w["name"] ?? $city,
            "country" => $w["sys"]["country"] ?? "",
            "temp" => $t, "feels_like" => $m["feels_like"] ?? null,
            "temp_min" => $m["temp_min"] ?? null, "temp_max" => $m["temp_max"] ?? null,
            "pressure" => $m["pressure"] ?? null, "sea_level" => $m["sea_level"] ?? null, "grnd_level" => $m["grnd_level"] ?? null,
            "humidity" => $h, "dew_point" => $dew,
            "wind" => $w["wind"]["speed"] ?? null,
            "desc" => $w["weather"][0]["description"] ?? "", "icon" => $w["weather"][0]["icon"] ?? "",
            "forecast" => $forecast,
        ]);
    }

    /* ===================== M9: EMAIL an invoice/quote (SMTP) ===================== */
    case "POST /invoices/email": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $inv = db_one($db,
            "SELECT i.*, c.name AS customer_name, c.email AS customer_email, j.reference AS job_reference
             FROM ego_invoices i JOIN ego_customers c ON c.id=i.customer_id JOIN ego_jobs j ON j.id=i.job_id
             WHERE i.id=? AND i.deleted_at IS NULL", "i", $id);
        if (!$inv) fail("Not found", 404);
        $to = trim($b["to"] ?? ($inv["customer_email"] ?? ""));
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) fail("No valid recipient email");
        // Emailing a DRAFT invoice first turns it into a real, numbered, sent invoice —
        // a customer must never receive an un-numbered "VAT invoice". (Quotes may go as drafts.)
        if ($inv["kind"] === "invoice" && $inv["status"] === "draft") {
            $db->begin_transaction();
            try {
                $number = allocate_doc_number($db, "invoice", (int)$inv["customer_id"]);
                $terms = (int)(db_one($db, "SELECT payment_terms_days FROM ego_company_settings ORDER BY id LIMIT 1")["payment_terms_days"] ?? 14);
                db_exec($db, "UPDATE ego_invoices SET number=?, status='sent', issue_date=CURDATE(),
                              due_date=DATE_ADD(CURDATE(), INTERVAL ? DAY), sent_at=NOW() WHERE id=?", "sii", $number, $terms, $id);
                $job = db_one($db, "SELECT status FROM ego_jobs WHERE id=?", "i", (int)$inv["job_id"]);
                if ($job && $job["status"] === "completed") {
                    db_exec($db, "UPDATE ego_jobs SET status='invoiced' WHERE id=?", "i", (int)$inv["job_id"]);
                    log_activity($db, (int)$inv["job_id"], (int)$actor["id"], "status_changed", ["from" => "completed", "to" => "invoiced"]);
                }
                $db->commit();
            } catch (Throwable $e) { $db->rollback(); client_error($e, "Could not finalise the invoice"); }
            $inv["number"] = $number; $inv["status"] = "sent"; // reflect it in the emailed doc + log
        }
        $company = db_one($db, "SELECT * FROM ego_company_settings ORDER BY id LIMIT 1");
        require __DIR__ . "/lib/mailer.php";
        $label = $inv["kind"] === "quote" ? "Quote" : "Invoice";
        $subject = "$label " . ($inv["number"] ?? $inv["payment_reference"]) . " from " . ($company["company_name"] ?? "EGO LIMITED");
        $html = render_invoice_email($inv, $company, track_link($db, (int)$inv["job_id"]));
        try {
            ego_send_mail($db, $to, $inv["customer_name"], $subject, $html);
        } catch (Throwable $e) {
            client_error($e, "Email failed — check the SMTP settings", 400);
        }
        log_activity($db, (int)$inv["job_id"], (int)$actor["id"], "emailed", ["to" => $to, "doc" => $inv["number"] ?? $inv["payment_reference"]]);
        send(["ok" => true, "to" => $to, "number" => $inv["number"] ?? null]);
    }

    /* ===================== Email any client + AI draft ===================== */
    case "POST /email/send": {
        $actor = require_role($db, "admin");
        $b = body();
        $to = trim($b["to"] ?? "");
        $subject = trim($b["subject"] ?? "");
        $bodyText = trim($b["body"] ?? "");
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) fail("Valid recipient email required");
        if ($subject === "" || $bodyText === "") fail("Subject and body required");
        require __DIR__ . "/lib/mailer.php";
        $html = ego_email_shell($db, "", nl2br(htmlspecialchars($bodyText)));
        try { ego_send_mail($db, $to, trim($b["to_name"] ?? "") ?: null, $subject, $html); }
        catch (Throwable $e) { client_error($e, "Email failed — check the SMTP settings", 400); }
        $jobId = isset($b["job_id"]) && $b["job_id"] !== "" ? (int)$b["job_id"] : null;
        $cid = isset($b["customer_id"]) && $b["customer_id"] !== "" ? (int)$b["customer_id"] : null;
        db_exec($db, "INSERT INTO ego_messages (customer_id,job_id,direction,channel,to_email,subject,body,status) VALUES (?,?, 'outbound','email', ?,?,?, 'sent')",
            "iisss", $cid, $jobId, $to, $subject, $bodyText);
        log_activity($db, $jobId, (int)$actor["id"], "emailed", ["to" => $to, "subject" => $subject]);
        send(["ok" => true, "to" => $to]);
    }

    case "POST /invoices/remind": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0);
        $inv = db_one($db,
            "SELECT i.*, c.name AS customer_name, c.email AS customer_email
             FROM ego_invoices i JOIN ego_customers c ON c.id=i.customer_id
             WHERE i.id=? AND i.deleted_at IS NULL", "i", $id);
        if (!$inv) fail("Not found", 404);
        if ($inv["kind"] !== "invoice") fail("Only invoices take reminders", 400);
        $to = trim($inv["customer_email"] ?? "");
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) fail("Customer has no email");
        $co = db_one($db, "SELECT * FROM ego_company_settings ORDER BY id LIMIT 1");
        require_once __DIR__ . "/lib/mailer.php";
        $html = render_invoice_email($inv, $co, track_link($db, (int)$inv["job_id"])); // amount + bank + ref + tracker
        try {
            ego_send_mail($db, $to, $inv["customer_name"], "Payment reminder: " . ($inv["number"] ?? $inv["payment_reference"]), $html);
        } catch (Throwable $e) { client_error($e, "Email failed — check the SMTP settings", 400); }
        db_exec($db, "UPDATE ego_invoices SET reminded_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, (int)$inv["job_id"], (int)$actor["id"], "invoice_reminder", ["to" => $to, "number" => $inv["number"]]);
        send(["ok" => true, "to" => $to]);
    }

    case "POST /ai/draft": {
        require_role($db, "admin");
        $b = body();
        $prompt = trim($b["prompt"] ?? "");
        if ($prompt === "") fail("Prompt required");
        try { $text = ai_draft($db, $prompt); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        send(["text" => $text]);
    }

    /* ===================== AI DRAFT HELPERS (brand-voice) ===================== */
    case "POST /announcements/draft": {
        require_role($db, "manager");
        $b = body();
        $brief = trim($b["brief"] ?? ""); if ($brief === "") fail("Describe the announcement");
        $audience = trim($b["audience"] ?? "") ?: "the team";
        $task = "Write a short internal announcement for $audience. Owner's brief: $brief\n\n"
            . "Return EXACTLY as:\nTitle: <one clear line>\n\n<body, 1-3 short paragraphs>";
        try { $text = ai_draft($db, $task, ego_brand_voice($db), 500); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        $title = ""; $bodyTxt = trim($text);
        if (preg_match('/^\s*title:\s*(.+?)\r?\n+(.*)$/is', $text, $m)) { $title = trim($m[1]); $bodyTxt = trim($m[2]); }
        send(["title" => $title, "body" => $bodyTxt]);
    }
    case "POST /tasks/draft": {
        require_role($db, "admin");
        $b = body();
        $brief = trim($b["brief"] ?? ""); if ($brief === "") fail("Describe the task");
        $task = "Turn this into a clear, short internal task for a maintenance team — easy to understand at a glance. "
            . "Owner's note: $brief\n\nReturn EXACTLY as:\nTitle: <max 8 words>\n\n<one or two sentences: what to do and what 'done' looks like>";
        try { $text = ai_draft($db, $task, ego_brand_voice($db), 300); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        $title = ""; $desc = trim($text);
        if (preg_match('/^\s*title:\s*(.+?)\r?\n+(.*)$/is', $text, $m)) { $title = trim($m[1]); $desc = trim($m[2]); }
        send(["title" => $title, "description" => $desc]);
    }
    case "POST /incidents/polish": {
        require_role($db, "admin");
        $b = body();
        $text = trim($b["text"] ?? ""); if ($text === "") fail("Nothing to polish yet");
        $field = trim($b["field"] ?? "") ?: "incident report";
        $task = "Rewrite this $field clearly and factually for a health-and-safety record. Keep every fact; do not add or invent anything. "
            . "Neutral, complete sentences, plain English.\n\nDRAFT:\n$text\n\nReturn only the rewritten text.";
        try { $out = ai_draft($db, $task, ego_brand_voice($db), 600); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        send(["text" => $out]);
    }
    case "POST /procurement/draft": {
        require_role($db, "admin");
        $b = body();
        $kind = trim($b["kind"] ?? "") ?: "item";
        $name = trim($b["name"] ?? "");
        $brief = trim($b["brief"] ?? "");
        if ($name === "" && $brief === "") fail("Add a name or a short brief first");
        $task = "Write clear, well-detailed procurement notes for a UK maintenance company's $kind"
            . ($name !== "" ? " named \"$name\"" : "") . ". "
            . ($brief !== "" ? "Details so far: $brief. " : "")
            . "Cover what it is or what they do, typical use, and anything useful to record (specs, trades, lead time, terms) — only where reasonable to infer. "
            . "Never invent specifics like exact prices, certificate numbers or phone numbers. A few short lines.\n\nReturn only the notes text.";
        try { $out = ai_draft($db, $task, ego_brand_voice($db), 500); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        send(["text" => $out]);
    }
    case "POST /email/compose": {
        // One-to-one brand-voice email draft for the inbox composer.
        require_role($db, "admin");
        $b = body();
        $brief = trim($b["brief"] ?? ""); if ($brief === "") fail("Describe the email");
        $to = trim($b["to_name"] ?? "");
        $task = "Write a one-to-one email" . ($to !== "" ? " to $to" : "") . " for EGO LTD. Owner's brief: $brief\n\n"
            . "Return EXACTLY as:\nSubject: <subject line>\n\n<email body>";
        try { $text = ai_draft($db, $task, ego_brand_voice($db)); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        $subject = ""; $bodyTxt = trim($text);
        if (preg_match('/^\s*subject:\s*(.+?)\r?\n+(.*)$/is', $text, $m)) { $subject = trim($m[1]); $bodyTxt = trim($m[2]); }
        send(["subject" => $subject, "body" => $bodyTxt]);
    }
    case "POST /ai/image": {
        // Generate a marketing header image for an email (makes a campaign read like a post).
        require_role($db, "admin");
        $b = body();
        $prompt = trim($b["prompt"] ?? ""); if ($prompt === "") fail("Describe the image");
        $full = "A clean, professional marketing image for a UK property maintenance company (EGO LTD). "
            . "Warm, grounded, premium, not stocky or cheesy. Landscape banner suitable for an email header. " . $prompt;
        try { $url = ai_generate_image($db, $full); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        send(["url" => $url]);
    }

    /* ===================== EMAIL TEMPLATES (saved brand sequences) ===================== */
    case "GET /email-templates": {
        require_role($db, "admin");
        ensure_email_templates($db);
        $rows = db_all($db, "SELECT id,name,kind,subject,body,created_at FROM ego_email_templates ORDER BY name");
        foreach ($rows as &$r) $r["id"] = (int)$r["id"];
        send(["templates" => $rows]);
    }
    case "POST /email-templates": {
        require_role($db, "admin");
        ensure_email_templates($db);
        $b = body();
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name required");
        $subject = trim($b["subject"] ?? "");
        $bodyTxt = trim($b["body"] ?? ""); if ($bodyTxt === "") fail("Body required");
        $kind = trim($b["kind"] ?? "") ?: "campaign";
        $id = (int)($b["id"] ?? 0);
        if ($id) {
            db_exec($db, "UPDATE ego_email_templates SET name=?,kind=?,subject=?,body=? WHERE id=?", "ssssi", $name, $kind, $subject, $bodyTxt, $id);
        } else {
            db_exec($db, "INSERT INTO ego_email_templates (name,kind,subject,body) VALUES (?,?,?,?)", "ssss", $name, $kind, $subject, $bodyTxt);
            $id = (int)$db->insert_id;
        }
        send(["id" => $id], 201);
    }
    case "POST /email-templates/delete": {
        require_role($db, "admin");
        ensure_email_templates($db);
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "DELETE FROM ego_email_templates WHERE id=?", "i", $id);
        send(["ok" => true]);
    }

    /* ===================== M15: INBOUND EMAIL (IMAP) ===================== */
    case "POST /inbox/sync": {
        require_role($db, "admin");
        require __DIR__ . "/lib/inbox.php";
        ensure_deleted_uids($db); // tombstone table must exist before sync reads it
        ensure_message_cols($db); // archived/flagged columns — bounces arrive pre-archived
        try { $n = inbox_sync($db); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        send(["synced" => $n]);
    }

    case "GET /inbox": {
        require_role($db, "admin");
        ensure_message_cols($db);
        $rows = db_all($db,
            "SELECT m.id,m.direction,m.channel,m.from_email,m.from_name,m.to_email,m.subject,m.status,m.acknowledged,m.archived,m.flagged,m.created_at,
                    m.customer_id,m.job_id, c.name AS customer_name, j.reference AS job_reference
             FROM ego_messages m
             LEFT JOIN ego_customers c ON c.id=m.customer_id
             LEFT JOIN ego_jobs j ON j.id=m.job_id
             WHERE (m.channel IS NULL OR m.channel <> 'portal')
             ORDER BY m.id DESC LIMIT 200");
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; $r["acknowledged"] = (int)($r["acknowledged"] ?? 0); $r["archived"] = (int)($r["archived"] ?? 0); $r["flagged"] = (int)($r["flagged"] ?? 0); $r["customer_id"] = $r["customer_id"] !== null ? (int)$r["customer_id"] : null; $r["job_id"] = $r["job_id"] !== null ? (int)$r["job_id"] : null; }
        send(["messages" => $rows]);
    }

    case "GET /inbox/get": {
        require_role($db, "admin");
        // Same scope as the inbox list: never expose private customer↔office portal threads
        // here (those belong to the job record, not the shared mailbox).
        $m = db_one($db,
            "SELECT m.*, c.name AS customer_name, j.reference AS job_reference
             FROM ego_messages m LEFT JOIN ego_customers c ON c.id=m.customer_id LEFT JOIN ego_jobs j ON j.id=m.job_id
             WHERE m.id=? AND (m.channel IS NULL OR m.channel <> 'portal')", "i", (int)($_GET["id"] ?? 0));
        if (!$m) fail("Not found", 404);
        $m["id"] = (int)$m["id"];
        send(["message" => $m]);
    }

    /* ===================== Messages: acknowledge + engineer visibility (admin) ===================== */
    case "POST /messages/ack": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0);
        if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_messages SET acknowledged=1 WHERE id=?", "i", $id);
        send(["ok" => true]);
    }

    // Office replies to a customer's portal message. The reply lands on the customer's
    // /track thread (outbound portal message) and the original is marked acknowledged
    // (double-tick on their side). Best-effort email too, if we have one.
    case "POST /messages/reply": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $bodyTxt = trim($b["body"] ?? "");
        if (!$id || $bodyTxt === "") fail("id and body required");
        $orig = db_one($db, "SELECT id,job_id,customer_id FROM ego_messages WHERE id=?", "i", $id);
        if (!$orig) fail("Message not found", 404);
        db_exec($db,
            "INSERT INTO ego_messages (customer_id,job_id,direction,channel,from_name,subject,body,status)
             VALUES (?,?, 'outbound','portal', 'Office', 'Reply', ?, 'sent')",
            "iis", $orig["customer_id"] !== null ? (int)$orig["customer_id"] : null, $orig["job_id"] !== null ? (int)$orig["job_id"] : null, $bodyTxt);
        db_exec($db, "UPDATE ego_messages SET acknowledged=1 WHERE id=?", "i", $id);
        log_activity($db, $orig["job_id"] !== null ? (int)$orig["job_id"] : null, (int)$actor["id"], "portal_reply", []);
        // best-effort email to the customer if we have an address
        $cust = $orig["customer_id"] ? db_one($db, "SELECT name,email FROM ego_customers WHERE id=?", "i", (int)$orig["customer_id"]) : null;
        if ($cust && filter_var($cust["email"] ?? "", FILTER_VALIDATE_EMAIL)) {
            require_once __DIR__ . "/lib/mailer.php";
            $inner = "<p style='margin:0 0 10px'>Hi " . htmlspecialchars($cust["name"] ?? "there") . ",</p><p style='margin:0'>" . nl2br(htmlspecialchars($bodyTxt)) . "</p>";
            $html = ego_email_shell($db, "", $inner);
            try { ego_send_mail($db, $cust["email"], $cust["name"] ?? null, "Re: your message", $html); } catch (Throwable $e) { /* best-effort */ }
        }
        send(["ok" => true]);
    }
    case "POST /messages/visibility": {
        $actor = require_role($db, "admin");
        $b = body();
        $id = (int)($b["id"] ?? 0);
        $vis = !empty($b["visible"]) ? 1 : 0;
        if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_messages SET visible_to_engineer=? WHERE id=?", "ii", $vis, $id);
        send(["ok" => true, "visible" => $vis]);
    }

    /* ===================== PUBLIC: WEBSITE ENQUIRY (landing page lead) ===================== */
    // No auth — the marketing site posts here. Lands in the office inbox + notifies them.
    case "POST /enquiry": {
        $b = body();
        $name = trim($b["name"] ?? "");
        // Accept the full website contact form (name/email/phone/address/service/message).
        $email = trim($b["email"] ?? "");
        $email = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : (filter_var(trim($b["contact"] ?? ""), FILTER_VALIDATE_EMAIL) ? trim($b["contact"]) : null);
        $phone = trim($b["phone"] ?? "");
        $address = trim($b["address"] ?? "");
        $service = trim($b["service"] ?? "");
        $message = trim($b["message"] ?? "");
        if ($name === "" || $message === "") fail("Name and message required");
        // Public, unauthenticated endpoint: throttle per IP and cap lengths (anti-spam / DB bloat).
        if (!rate_check($db, "enquiry:" . client_ip(), 5, 3600)) fail("Too many enquiries from your connection. Please try again later or call us.", 429);
        rate_hit($db, "enquiry:" . client_ip());
        if (mb_strlen($name) > 120 || mb_strlen($message) > 5000 || mb_strlen($address) > 300 || mb_strlen($service) > 120 || mb_strlen($phone) > 40) fail("One of your fields is too long.");

        // Newsletter signups are explicit consent — add them to the marketing list.
        if (($b["source"] ?? "") === "newsletter" && $email) {
            ensure_subscribers_table($db);
            $em = strtolower($email);
            db_exec($db, "INSERT INTO ego_subscribers (email,name,source) VALUES (?,?, 'newsletter')
                          ON DUPLICATE KEY UPDATE subscribed=1", "ss", $em, $name === "Newsletter signup" ? null : $name);
        }

        // Detail block the office sees in the inbox + notification email.
        $lines = [];
        if ($email)   $lines[] = "Email: $email";
        if ($phone)   $lines[] = "Phone: $phone";
        if ($address) $lines[] = "Address: $address";
        if ($service) $lines[] = "Service: $service";
        $bodyText = ($lines ? implode("\n", $lines) . "\n\n" : "") . $message;
        $subject = $service !== "" ? "Website enquiry: $service" : "Website enquiry";

        db_exec($db,
            "INSERT INTO ego_messages (direction,channel,from_name,from_email,subject,body,status)
             VALUES ('inbound','enquiry',?,?,?,?, 'received')",
            "ssss", $name, $email, $subject, $bodyText);

        $cs = db_one($db, "SELECT company_name,email,notify_email FROM ego_company_settings ORDER BY id LIMIT 1");
        $to = trim($cs["notify_email"] ?? "") ?: trim($cs["email"] ?? "");
        if (filter_var($to, FILTER_VALIDATE_EMAIL)) {
            require_once __DIR__ . "/lib/mailer.php";
            $detail = "<p style='margin:0 0 4px'><strong>" . htmlspecialchars($name) . "</strong></p>"
                . "<table style='border-collapse:collapse;font-size:14px;color:#1f2937'>"
                . ($email ? "<tr><td style='padding:2px 12px 2px 0;color:#6b7280'>Email</td><td>" . htmlspecialchars($email) . "</td></tr>" : "")
                . ($phone ? "<tr><td style='padding:2px 12px 2px 0;color:#6b7280'>Phone</td><td>" . htmlspecialchars($phone) . "</td></tr>" : "")
                . ($address ? "<tr><td style='padding:2px 12px 2px 0;color:#6b7280'>Address</td><td>" . htmlspecialchars($address) . "</td></tr>" : "")
                . ($service ? "<tr><td style='padding:2px 12px 2px 0;color:#6b7280'>Service</td><td>" . htmlspecialchars($service) . "</td></tr>" : "")
                . "</table><p style='margin:14px 0 0'>" . nl2br(htmlspecialchars($message)) . "</p>";
            try { ego_send_mail($db, $to, $cs["company_name"] ?? null, $subject, ego_email_shell($db, "New website enquiry", $detail)); } catch (Throwable $e) { /* best-effort */ }
        }
        send(["ok" => true], 201);
    }

    /* ===================== M11: CUSTOMER PORTAL (public, token-scoped) ===================== */
    // Public job tracker for the marketing site: reference + surname -> live
    // status, plus a one-tap link into the customer's own portal (token URL).
    // No auth: the surname is the shared secret that gates the reference.
    case "POST /track/lookup": {
        $b = body();
        $ref = strtoupper(trim($b["reference"] ?? ""));
        $surname = trim($b["surname"] ?? "");
        if ($ref === "" || $surname === "") fail("Enter your job reference and the surname on the booking.");
        // Rate-limit public lookups to blunt reference/surname enumeration.
        if (!rate_check($db, "track:" . client_ip(), 15, 900)) fail("Too many attempts. Please wait a few minutes and try again.", 429);
        // Generic message either way so the form can't be used to enumerate refs.
        $notFound = "We couldn't find a job with that reference and surname. Check your booking confirmation, or give us a call.";
        $job = db_one($db,
            "SELECT j.id, j.reference, j.title, j.status, j.scheduled_start, j.updated_at,
                    u.name AS engineer_name, c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             LEFT JOIN ego_users u ON u.id=j.engineer_id
             WHERE UPPER(j.reference)=? AND j.deleted_at IS NULL LIMIT 1", "s", $ref);
        if (!$job) fail($notFound, 404);
        // Verify the surname against any token of the customer's name (case-insensitive).
        $name = strtolower($job["customer_name"] ?? "");
        $sn = strtolower($surname);
        $tokens = preg_split('/\s+/', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $ok = in_array($sn, $tokens, true) || ($sn !== "" && str_contains($name, $sn));
        if (!$ok) fail($notFound, 404);

        // Canonical 7-stage customer-facing track. on_hold pauses at "On site".
        $order  = ["new"=>0,"scheduled"=>1,"en_route"=>2,"on_site"=>3,"on_hold"=>3,"completed"=>4,"invoiced"=>5,"paid"=>6,"closed"=>6];
        $labels = ["Booked in","Scheduled","En route","On site","Completed","Invoiced","Paid"];
        $status = $job["status"];
        $cancelled = $status === "cancelled";
        $step = $order[$status] ?? 0;
        $statusLabel = $cancelled ? "Cancelled" : ($status === "on_hold" ? "On hold" : ($labels[$step] ?? "In progress"));

        send([
            "reference"     => $job["reference"],
            "title"         => $job["title"],
            "status"        => $status,
            "status_label"  => $statusLabel,
            "step"          => $step,
            "stages"        => $labels,
            "scheduled_for" => $job["scheduled_start"],
            "engineer"      => $job["engineer_name"],
            "updated_at"    => $job["updated_at"],
            "cancelled"     => $cancelled,
            // One-tap deep link into the customer's own portal (mints/reuses token).
            "portal_url"    => track_link($db, (int)$job["id"]),
        ]);
    }

    case "GET /track": {
        $jobId = verify_track_token($db, $_GET["token"] ?? "");
        if (!$jobId) fail("This link has expired or is invalid", 404);
        $job = db_one($db,
            "SELECT j.reference,j.title,j.description,j.status,j.scheduled_start,j.scheduled_end,
                    u.name AS engineer_name, c.name AS customer_name
             FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
             LEFT JOIN ego_users u ON u.id=j.engineer_id
             WHERE j.id=? AND j.deleted_at IS NULL", "i", $jobId);
        if (!$job) fail("Not found", 404);
        $company = db_one($db, "SELECT company_name,logo_url,phone,email,bank_account_name,bank_sort_code,bank_account_number FROM ego_company_settings ORDER BY id LIMIT 1");
        $inv = db_one($db,
            "SELECT number,total,status,payment_reference,due_date FROM ego_invoices
             WHERE job_id=? AND kind='invoice' AND deleted_at IS NULL AND status NOT IN ('void','draft') ORDER BY id DESC LIMIT 1", "i", $jobId);
        if ($inv && $inv["status"] === "sent" && $inv["due_date"] && $inv["due_date"] < date("Y-m-d")) $inv["status"] = "overdue";
        // all quotes + invoices the customer should see for this job
        $docs = db_all($db,
            "SELECT id,kind,number,total,status,payment_reference,issue_date,due_date FROM ego_invoices
             WHERE job_id=? AND deleted_at IS NULL AND status NOT IN ('draft','void') ORDER BY id DESC", "i", $jobId);
        foreach ($docs as &$d0) { $d0["id"] = (int)$d0["id"]; } unset($d0);
        foreach ($docs as &$dd) { if ($dd["kind"] === "invoice" && $dd["status"] === "sent" && $dd["due_date"] && $dd["due_date"] < date("Y-m-d")) $dd["status"] = "overdue"; }
        // timeline progress from the job status
        $order = ["new" => 0, "scheduled" => 1, "en_route" => 2, "on_site" => 3, "completed" => 4, "invoiced" => 4, "paid" => 5, "closed" => 5];
        // conversation the customer should see: their own portal notes + the office's replies.
        // `acknowledged` drives the read-receipt tick on the customer's own messages.
        $messages = db_all($db,
            "SELECT direction, from_name, body, acknowledged, created_at FROM ego_messages
             WHERE job_id=? AND (channel='portal' OR direction='outbound') ORDER BY id ASC", "i", $jobId);
        foreach ($messages as &$mm) { $mm["acknowledged"] = (int)$mm["acknowledged"]; }
        $completed = in_array($job["status"], ["completed", "invoiced", "paid", "closed"], true);
        $review = db_one($db, "SELECT rating, body, created_at FROM ego_messages WHERE job_id=? AND channel='review' ORDER BY id DESC LIMIT 1", "i", $jobId);
        if ($review) $review["rating"] = (int)$review["rating"];
        send([
            "job" => $job,
            "company" => ["company_name" => $company["company_name"] ?? "EGO LIMITED", "logo_url" => $company["logo_url"] ?? null, "phone" => $company["phone"] ?? null, "email" => $company["email"] ?? null],
            "bank" => $inv ? ["account_name" => $company["bank_account_name"] ?? "", "sort_code" => $company["bank_sort_code"] ?? "", "account_number" => $company["bank_account_number"] ?? ""] : null,
            "invoice" => $inv,
            "documents" => $docs,
            "messages" => $messages,
            "step" => $order[$job["status"]] ?? 0,
            "cancelled" => $job["status"] === "cancelled",
            "completed" => $completed,
            "review" => $review,
        ]);
    }

    case "GET /track/document": {
        // Customer downloads one of their own quotes/invoices from the portal.
        // Scoped to the job the access token unlocks; drafts/voids never exposed.
        $jobId = verify_track_token($db, $_GET["token"] ?? "");
        if (!$jobId) fail("Invalid link", 404);
        $id = (int)($_GET["id"] ?? 0);
        $inv = db_one($db,
            "SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                    j.reference AS job_reference, j.title AS job_title
             FROM ego_invoices i JOIN ego_customers c ON c.id=i.customer_id JOIN ego_jobs j ON j.id=i.job_id
             WHERE i.id=? AND i.job_id=? AND i.deleted_at IS NULL AND i.status NOT IN ('draft','void')",
            "ii", $id, $jobId);
        if (!$inv) fail("Not found", 404);
        $inv["id"] = (int)$inv["id"];
        $inv["lines"] = db_all($db, "SELECT description,quantity,unit_price,line_total FROM ego_invoice_lines WHERE invoice_id=? ORDER BY sort,id", "i", $id);
        $cust = db_one($db, "SELECT a.line1,a.line2,a.city,a.postcode FROM ego_addresses a WHERE a.customer_id=? AND a.is_primary=1", "i", (int)$inv["customer_id"]);
        $inv["customer_address"] = $cust;
        $inv["company"] = db_one($db, "SELECT company_name,address,phone,email,vat_number,logo_url,bank_account_name,bank_sort_code,bank_account_number,payment_terms_days FROM ego_company_settings ORDER BY id LIMIT 1");
        if ($inv["kind"] === "invoice" && $inv["status"] === "sent" && $inv["due_date"] && $inv["due_date"] < date("Y-m-d")) $inv["status"] = "overdue";
        send(["invoice" => $inv]);
    }

    case "POST /track/review": {
        $jobId = verify_track_token($db, ($_GET["token"] ?? "") ?: (body()["token"] ?? ""));
        if (!$jobId) fail("Invalid link", 404);
        $job = db_one($db, "SELECT customer_id,status FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $jobId);
        if (!$job) fail("Not found", 404);
        if (!in_array($job["status"], ["completed", "invoiced", "paid", "closed"], true)) fail("You can review once the job is complete", 400);
        $b = body();
        $rating = max(1, min(5, (int)($b["rating"] ?? 0)));
        if ($rating < 1) fail("Pick a star rating");
        $bodyTxt = trim($b["body"] ?? "");
        $name = trim($b["name"] ?? "") ?: null;
        $existing = db_one($db, "SELECT id FROM ego_messages WHERE job_id=? AND channel='review' ORDER BY id DESC LIMIT 1", "i", $jobId);
        if ($existing) {
            db_exec($db, "UPDATE ego_messages SET rating=?, body=?, from_name=?, acknowledged=0 WHERE id=?",
                "issi", $rating, $bodyTxt, $name, (int)$existing["id"]);
        } else {
            db_exec($db,
                "INSERT INTO ego_messages (customer_id,job_id,direction,channel,from_name,subject,body,rating,status)
                 VALUES (?,?, 'inbound','review', ?,?,?,?, 'received')",
                "iisssi", (int)$job["customer_id"], $jobId, $name, "Customer review", $bodyTxt, $rating);
        }
        log_activity($db, $jobId, null, "review", ["rating" => $rating]);
        send(["ok" => true], 201);
    }

    case "POST /track/message": {
        $jobId = verify_track_token($db, ($_GET["token"] ?? "") ?: (body()["token"] ?? ""));
        if (!$jobId) fail("Invalid link", 404);
        $b = body();
        $msg = trim($b["body"] ?? "");
        if ($msg === "") fail("Message is empty");
        if (mb_strlen($msg) > 5000) fail("Message is too long");
        $job = db_one($db, "SELECT customer_id FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $jobId);
        if (!$job) fail("This link has expired", 404);
        $name = trim($b["name"] ?? "") ?: null;
        db_exec($db,
            "INSERT INTO ego_messages (customer_id,job_id,direction,channel,from_name,subject,body,status)
             VALUES (?,?, 'inbound','portal', ?,?,?, 'received')",
            "iisss", (int)$job["customer_id"], $jobId, $name, "Message via tracking portal", $msg);
        log_activity($db, $jobId, null, "portal_message", ["from" => $name]);
        send(["ok" => true], 201);
    }

    /* ===================== M13: RECURRING / MAINTENANCE PLANS (admin) ===================== */
    case "GET /recurring": {
        require_role($db, "admin");
        $rows = db_all($db,
            "SELECT r.*, c.name AS customer_name, (r.next_due <= CURDATE()) AS is_due
             FROM ego_recurring_plans r JOIN ego_customers c ON c.id=r.customer_id
             WHERE r.active=1 ORDER BY r.next_due");
        foreach ($rows as &$x) { $x["id"] = (int)$x["id"]; $x["customer_id"] = (int)$x["customer_id"]; $x["interval_count"] = (int)$x["interval_count"]; $x["is_due"] = (int)$x["is_due"]; }
        send(["plans" => $rows]);
    }

    case "POST /recurring": {
        require_role($db, "admin");
        $b = body();
        $cid = (int)($b["customer_id"] ?? 0);
        $title = trim($b["title"] ?? "");
        $unit = in_array($b["interval_unit"] ?? "month", ["day", "week", "month"], true) ? ($b["interval_unit"] ?? "month") : "month";
        $count = max(1, (int)($b["interval_count"] ?? 1));
        $next = trim($b["next_due"] ?? "") ?: date("Y-m-d");
        if (!$cid || $title === "") fail("Customer and title required");
        $prio = in_array($b["priority"] ?? "normal", ["low", "normal", "urgent"], true) ? ($b["priority"] ?? "normal") : "normal";
        $quote = isset($b["quoted_amount"]) && $b["quoted_amount"] !== "" ? (float)$b["quoted_amount"] : null;
        db_exec($db,
            "INSERT INTO ego_recurring_plans (customer_id,title,description,priority,quoted_amount,interval_unit,interval_count,next_due)
             VALUES (?,?,?,?,?,?,?,?)",
            "isssdsis", $cid, $title, trim($b["description"] ?? "") ?: null, $prio, $quote, $unit, $count, $next);
        send(["id" => (int)$db->insert_id], 201);
    }

    case "POST /recurring/delete": {
        require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0);
        if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_recurring_plans SET active=0 WHERE id=?", "i", $id);
        send(["ok" => true]);
    }

    case "POST /recurring/generate": {
        $actor = require_role($db, "admin");
        // Skip plans whose customer has been deleted (no orphaned jobs/invoices).
        $due = db_all($db, "SELECT r.* FROM ego_recurring_plans r JOIN ego_customers c ON c.id=r.customer_id
                            WHERE r.active=1 AND r.next_due <= CURDATE() AND c.deleted_at IS NULL");
        $created = [];
        foreach ($due as $p) {
            $db->begin_transaction();
            try {
                $cid = (int)$p["customer_id"];
                $ref = next_job_reference($db, $cid);
                $quote = $p["quoted_amount"] !== null ? (float)$p["quoted_amount"] : null;
                db_exec($db,
                    "INSERT INTO ego_jobs (reference,customer_id,title,description,priority,status,quoted_amount)
                     VALUES (?,?,?,?,?, 'new', ?)",
                    "sisssd", $ref, $cid, $p["title"], $p["description"], $p["priority"], $quote);
                $jid = (int)$db->insert_id;
                log_activity($db, $jid, (int)$actor["id"], "created", ["reference" => $ref, "recurring" => true]);
                // Hard-whitelist the interval unit at the point of interpolation (never trust the stored value).
                $unit = ["day" => "DAY", "week" => "WEEK", "month" => "MONTH"][$p["interval_unit"]] ?? "MONTH";
                db_exec($db,
                    "UPDATE ego_recurring_plans SET next_due = DATE_ADD(next_due, INTERVAL ? $unit), last_generated=NOW() WHERE id=?",
                    "ii", (int)$p["interval_count"], (int)$p["id"]);
                $db->commit();
                $created[] = $ref;
            } catch (Throwable $e) { $db->rollback(); }
        }
        send(["count" => count($created), "created" => $created]);
    }

    /* ===================== Task board (kanban) — any staff; workers assign to each other ===================== */
    case "GET /tasks": {
        require_user($db);
        $rows = db_all($db,
            "SELECT t.id,t.title,t.description,t.status,t.accent,t.sort,t.assignee_id,u.name AS assignee_name
             FROM ego_tasks t LEFT JOIN ego_users u ON u.id=t.assignee_id
             ORDER BY t.status, t.sort, t.id");
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; $r["sort"] = (int)$r["sort"]; $r["assignee_id"] = $r["assignee_id"] !== null ? (int)$r["assignee_id"] : null; }
        // Staff list so workers can pick an assignee (colour-coded on the board)
        $staff = db_all($db, "SELECT id,name,role FROM ego_users WHERE active=1 AND deleted_at IS NULL ORDER BY name");
        foreach ($staff as &$s) { $s["id"] = (int)$s["id"]; }
        send(["tasks" => $rows, "staff" => $staff]);
    }
    case "POST /tasks": {
        require_user($db);
        $b = body();
        $title = trim($b["title"] ?? "");
        if ($title === "") fail("Title required");
        $status = trim($b["status"] ?? "backlog") ?: "backlog";
        $assignee = isset($b["assignee_id"]) && $b["assignee_id"] !== "" ? (int)$b["assignee_id"] : null;
        db_exec($db, "INSERT INTO ego_tasks (title,description,status,accent,assignee_id) VALUES (?,?,?,?,?)",
            "ssssi", $title, trim($b["description"] ?? "") ?: null, $status, trim($b["accent"] ?? "") ?: null, $assignee);
        send(["id" => (int)$db->insert_id], 201);
    }
    case "POST /tasks/update": {
        require_user($db);
        $b = body();
        $id = (int)($b["id"] ?? 0);
        if (!$id) fail("id required");
        $title = trim($b["title"] ?? "");
        if ($title === "") fail("Title required");
        $assignee = array_key_exists("assignee_id", $b) ? ($b["assignee_id"] !== "" && $b["assignee_id"] !== null ? (int)$b["assignee_id"] : null) : false;
        if ($assignee === false) {
            db_exec($db, "UPDATE ego_tasks SET title=?, description=? WHERE id=?",
                "ssi", $title, trim($b["description"] ?? "") ?: null, $id);
        } else {
            db_exec($db, "UPDATE ego_tasks SET title=?, description=?, assignee_id=? WHERE id=?",
                "ssii", $title, trim($b["description"] ?? "") ?: null, $assignee, $id);
        }
        send(["ok" => true]);
    }
    case "POST /tasks/assign": {
        require_user($db);
        $b = body();
        $id = (int)($b["id"] ?? 0);
        if (!$id) fail("id required");
        $assignee = isset($b["assignee_id"]) && $b["assignee_id"] !== "" && $b["assignee_id"] !== null ? (int)$b["assignee_id"] : null;
        db_exec($db, "UPDATE ego_tasks SET assignee_id=? WHERE id=?", "ii", $assignee, $id);
        send(["ok" => true]);
    }
    case "POST /tasks/move": {
        require_user($db);
        $b = body();
        $id = (int)($b["id"] ?? 0);
        if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_tasks SET status=?, sort=? WHERE id=?", "sii", trim($b["status"] ?? "backlog"), (int)($b["sort"] ?? 0), $id);
        send(["ok" => true]);
    }
    case "POST /tasks/delete": {
        require_user($db);
        $id = (int)(body()["id"] ?? 0);
        if ($id) db_exec($db, "DELETE FROM ego_tasks WHERE id=?", "i", $id);
        send(["ok" => true]);
    }

    /* ============================ PROCUREMENT — Suppliers ============================ */
    case "GET /suppliers": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db,
            "SELECT id,name,contact,phone,email,account_ref,category,active
             FROM ego_suppliers WHERE deleted_at IS NULL
               AND (name LIKE ? OR contact LIKE ? OR email LIKE ? OR category LIKE ?)
             ORDER BY name", "ssss", $q, $q, $q, $q);
        foreach ($rows as &$r) { $r["id"] = (int)$r["id"]; $r["active"] = (int)$r["active"]; }
        send(["suppliers" => $rows]);
    }
    case "GET /suppliers/get": {
        require_role($db, "admin");
        $s = db_one($db, "SELECT * FROM ego_suppliers WHERE id=? AND deleted_at IS NULL", "i", (int)($_GET["id"] ?? 0));
        if (!$s) fail("Supplier not found", 404);
        $s["id"] = (int)$s["id"]; $s["active"] = (int)$s["active"];
        send(["supplier" => $s]);
    }
    case "POST /suppliers": {
        $actor = require_role($db, "admin");
        $b = body();
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name is required");
        $email = trim($b["email"] ?? "") ?: null;
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Invalid email");
        db_exec($db, "INSERT INTO ego_suppliers (name,contact,phone,email,account_ref,category,address,notes,active) VALUES (?,?,?,?,?,?,?,?,?)",
            "ssssssssi", $name, trim($b["contact"] ?? "") ?: null, trim($b["phone"] ?? "") ?: null, $email,
            trim($b["account_ref"] ?? "") ?: null, trim($b["category"] ?? "") ?: null, trim($b["address"] ?? "") ?: null,
            trim($b["notes"] ?? "") ?: null, (int)($b["active"] ?? 1));
        $id = (int)$db->insert_id;
        log_activity($db, null, (int)$actor["id"], "supplier_created", ["id" => $id, "name" => $name]);
        send(["id" => $id], 201);
    }
    case "POST /suppliers/update": {
        $actor = require_role($db, "admin");
        $b = body(); $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
        if (!db_one($db, "SELECT id FROM ego_suppliers WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Supplier not found", 404);
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name is required");
        $email = trim($b["email"] ?? "") ?: null;
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Invalid email");
        db_exec($db, "UPDATE ego_suppliers SET name=?,contact=?,phone=?,email=?,account_ref=?,category=?,address=?,notes=?,active=? WHERE id=?",
            "ssssssssii", $name, trim($b["contact"] ?? "") ?: null, trim($b["phone"] ?? "") ?: null, $email,
            trim($b["account_ref"] ?? "") ?: null, trim($b["category"] ?? "") ?: null, trim($b["address"] ?? "") ?: null,
            trim($b["notes"] ?? "") ?: null, (int)($b["active"] ?? 1), $id);
        log_activity($db, null, (int)$actor["id"], "supplier_updated", ["id" => $id]);
        send(["ok" => true]);
    }
    case "POST /suppliers/delete": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_suppliers SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "supplier_deleted", ["id" => $id]);
        send(["ok" => true]);
    }

    /* ========================== PROCUREMENT — Subcontractors ========================== */
    case "GET /subcontractors": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db,
            "SELECT id,name,company,trades,coverage_areas,phone,email,insurance_expiry,day_rate,rating,status
             FROM ego_subcontractors WHERE deleted_at IS NULL
               AND (name LIKE ? OR company LIKE ? OR trades LIKE ? OR coverage_areas LIKE ?)
             ORDER BY name", "ssss", $q, $q, $q, $q);
        foreach ($rows as &$r) {
            $r["id"] = (int)$r["id"];
            $r["rating"] = $r["rating"] !== null ? (int)$r["rating"] : null;
            $r["day_rate"] = $r["day_rate"] !== null ? (float)$r["day_rate"] : null;
        }
        send(["subcontractors" => $rows]);
    }
    case "GET /subcontractors/get": {
        require_role($db, "admin");
        $s = db_one($db, "SELECT * FROM ego_subcontractors WHERE id=? AND deleted_at IS NULL", "i", (int)($_GET["id"] ?? 0));
        if (!$s) fail("Subcontractor not found", 404);
        $s["id"] = (int)$s["id"];
        send(["subcontractor" => $s]);
    }
    case "POST /subcontractors": {
        $actor = require_role($db, "admin");
        $b = body();
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name is required");
        $email = trim($b["email"] ?? "") ?: null;
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Invalid email");
        $ins = trim($b["insurance_expiry"] ?? "") ?: null;
        $dr = ($b["day_rate"] ?? "") !== "" ? (float)$b["day_rate"] : null;
        $rating = ($b["rating"] ?? "") !== "" ? (int)$b["rating"] : null;
        $status = in_array($b["status"] ?? "active", ["active","pending","suspended"], true) ? ($b["status"] ?? "active") : "active";
        db_exec($db, "INSERT INTO ego_subcontractors (name,company,trades,coverage_areas,phone,email,insurance_expiry,qualifications,day_rate,rating,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            "ssssssssdiss", $name, trim($b["company"] ?? "") ?: null, trim($b["trades"] ?? "") ?: null, trim($b["coverage_areas"] ?? "") ?: null,
            trim($b["phone"] ?? "") ?: null, $email, $ins, trim($b["qualifications"] ?? "") ?: null, $dr, $rating, $status, trim($b["notes"] ?? "") ?: null);
        $id = (int)$db->insert_id;
        log_activity($db, null, (int)$actor["id"], "subcontractor_created", ["id" => $id, "name" => $name]);
        send(["id" => $id], 201);
    }
    case "POST /subcontractors/update": {
        $actor = require_role($db, "admin");
        $b = body(); $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
        if (!db_one($db, "SELECT id FROM ego_subcontractors WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Subcontractor not found", 404);
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name is required");
        $email = trim($b["email"] ?? "") ?: null;
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Invalid email");
        $ins = trim($b["insurance_expiry"] ?? "") ?: null;
        $dr = ($b["day_rate"] ?? "") !== "" ? (float)$b["day_rate"] : null;
        $rating = ($b["rating"] ?? "") !== "" ? (int)$b["rating"] : null;
        $status = in_array($b["status"] ?? "active", ["active","pending","suspended"], true) ? ($b["status"] ?? "active") : "active";
        db_exec($db, "UPDATE ego_subcontractors SET name=?,company=?,trades=?,coverage_areas=?,phone=?,email=?,insurance_expiry=?,qualifications=?,day_rate=?,rating=?,status=?,notes=? WHERE id=?",
            "ssssssssdissi", $name, trim($b["company"] ?? "") ?: null, trim($b["trades"] ?? "") ?: null, trim($b["coverage_areas"] ?? "") ?: null,
            trim($b["phone"] ?? "") ?: null, $email, $ins, trim($b["qualifications"] ?? "") ?: null, $dr, $rating, $status, trim($b["notes"] ?? "") ?: null, $id);
        log_activity($db, null, (int)$actor["id"], "subcontractor_updated", ["id" => $id]);
        send(["ok" => true]);
    }
    case "POST /subcontractors/delete": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_subcontractors SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "subcontractor_deleted", ["id" => $id]);
        send(["ok" => true]);
    }

    /* ============================ PROCUREMENT — Parts / pricebook ============================ */
    case "GET /parts": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $low = ($_GET["low"] ?? "") === "1";
        $lowSql = $low ? "AND p.stock_qty <= p.reorder_level AND p.reorder_level > 0" : "";
        $rows = db_all($db,
            "SELECT p.id,p.sku,p.name,p.category,p.unit,p.cost_price,p.sale_price,p.stock_qty,p.reorder_level,p.active,
                    p.supplier_id, s.name AS supplier_name
             FROM ego_parts p LEFT JOIN ego_suppliers s ON s.id = p.supplier_id
             WHERE p.deleted_at IS NULL $lowSql
               AND (p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ?)
             ORDER BY p.name", "sss", $q, $q, $q);
        foreach ($rows as &$r) {
            $r["id"] = (int)$r["id"]; $r["active"] = (int)$r["active"];
            $r["supplier_id"] = $r["supplier_id"] !== null ? (int)$r["supplier_id"] : null;
            foreach (["cost_price","sale_price","stock_qty","reorder_level"] as $k) $r[$k] = (float)$r[$k];
        }
        send(["parts" => $rows]);
    }
    case "GET /parts/get": {
        require_role($db, "admin");
        $p = db_one($db, "SELECT * FROM ego_parts WHERE id=? AND deleted_at IS NULL", "i", (int)($_GET["id"] ?? 0));
        if (!$p) fail("Part not found", 404);
        $p["id"] = (int)$p["id"]; $p["active"] = (int)$p["active"];
        $p["supplier_id"] = $p["supplier_id"] !== null ? (int)$p["supplier_id"] : null;
        send(["part" => $p]);
    }
    case "POST /parts": {
        $actor = require_role($db, "admin");
        $b = body();
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name is required");
        $supplierId = ($b["supplier_id"] ?? "") !== "" ? (int)$b["supplier_id"] : null;
        db_exec($db, "INSERT INTO ego_parts (sku,name,description,category,supplier_id,unit,cost_price,sale_price,stock_qty,reorder_level,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            "ssssisddddi",
            trim($b["sku"] ?? "") ?: null, $name, trim($b["description"] ?? "") ?: null, trim($b["category"] ?? "") ?: null,
            $supplierId, trim($b["unit"] ?? "") ?: "each",
            (float)($b["cost_price"] ?? 0), (float)($b["sale_price"] ?? 0), (float)($b["stock_qty"] ?? 0),
            (float)($b["reorder_level"] ?? 0), (int)($b["active"] ?? 1));
        $id = (int)$db->insert_id;
        log_activity($db, null, (int)$actor["id"], "part_created", ["id" => $id, "name" => $name]);
        send(["id" => $id], 201);
    }
    case "POST /parts/update": {
        $actor = require_role($db, "admin");
        $b = body(); $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
        if (!db_one($db, "SELECT id FROM ego_parts WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Part not found", 404);
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name is required");
        $supplierId = ($b["supplier_id"] ?? "") !== "" ? (int)$b["supplier_id"] : null;
        db_exec($db, "UPDATE ego_parts SET sku=?,name=?,description=?,category=?,supplier_id=?,unit=?,cost_price=?,sale_price=?,stock_qty=?,reorder_level=?,active=? WHERE id=?",
            "ssssisddddii",
            trim($b["sku"] ?? "") ?: null, $name, trim($b["description"] ?? "") ?: null, trim($b["category"] ?? "") ?: null,
            $supplierId, trim($b["unit"] ?? "") ?: "each",
            (float)($b["cost_price"] ?? 0), (float)($b["sale_price"] ?? 0), (float)($b["stock_qty"] ?? 0),
            (float)($b["reorder_level"] ?? 0), (int)($b["active"] ?? 1), $id);
        log_activity($db, null, (int)$actor["id"], "part_updated", ["id" => $id]);
        send(["ok" => true]);
    }
    case "POST /parts/delete": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_parts SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "part_deleted", ["id" => $id]);
        send(["ok" => true]);
    }

    /* ===================== PROCUREMENT — Purchase orders + stock ===================== */
    case "GET /purchase-orders": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db,
            "SELECT po.id,po.reference,po.status,po.order_date,po.expected_date,po.received_date,po.total,
                    po.supplier_id, s.name AS supplier_name
             FROM ego_purchase_orders po JOIN ego_suppliers s ON s.id = po.supplier_id
             WHERE po.deleted_at IS NULL AND (po.reference LIKE ? OR s.name LIKE ?)
             ORDER BY po.id DESC", "ss", $q, $q);
        foreach ($rows as &$r) { $r["id"]=(int)$r["id"]; $r["supplier_id"]=(int)$r["supplier_id"]; $r["total"]=(float)$r["total"]; }
        send(["purchase_orders" => $rows]);
    }
    case "GET /purchase-orders/get": {
        require_role($db, "admin");
        $id = (int)($_GET["id"] ?? 0);
        $po = db_one($db, "SELECT * FROM ego_purchase_orders WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$po) fail("Purchase order not found", 404);
        $po["id"]=(int)$po["id"]; $po["supplier_id"]=(int)$po["supplier_id"];
        $po["subtotal"]=(float)$po["subtotal"]; $po["total"]=(float)$po["total"];
        $items = db_all($db, "SELECT id,part_id,description,qty,unit_cost,line_total FROM ego_po_items WHERE po_id=? ORDER BY sort,id", "i", $id);
        foreach ($items as &$it) {
            $it["id"]=(int)$it["id"]; $it["part_id"]=$it["part_id"]!==null?(int)$it["part_id"]:null;
            foreach (["qty","unit_cost","line_total"] as $k) $it[$k]=(float)$it[$k];
        }
        $po["items"] = $items;
        send(["purchase_order" => $po]);
    }
    case "POST /purchase-orders":
    case "POST /purchase-orders/update": {
        $actor = require_role($db, "admin");
        $b = body();
        $supplierId = (int)($b["supplier_id"] ?? 0);
        if (!$supplierId) fail("Supplier is required");
        $status = in_array($b["status"] ?? "draft", ["draft","ordered"], true) ? ($b["status"] ?? "draft") : "draft";
        $items = is_array($b["items"] ?? null) ? $b["items"] : [];
        $subtotal = 0.0;
        foreach ($items as $it) { $subtotal += round((float)($it["qty"] ?? 0) * (float)($it["unit_cost"] ?? 0), 2); }
        $orderDate = trim($b["order_date"] ?? "") ?: null;
        $expDate = trim($b["expected_date"] ?? "") ?: null;
        $notes = trim($b["notes"] ?? "") ?: null;

        $db->begin_transaction();
        try {
            $editing = $route === "/purchase-orders/update";
            if ($editing) {
                $id = (int)($b["id"] ?? 0);
                $cur = db_one($db, "SELECT status FROM ego_purchase_orders WHERE id=? AND deleted_at IS NULL", "i", $id);
                if (!$cur) throw new RuntimeException("Purchase order not found");
                if (!in_array($cur["status"], ["draft","ordered"], true)) throw new RuntimeException("Only draft/ordered POs can be edited");
                db_exec($db, "UPDATE ego_purchase_orders SET supplier_id=?,status=?,order_date=?,expected_date=?,notes=?,subtotal=?,total=? WHERE id=?",
                    "issssddi", $supplierId, $status, $orderDate, $expDate, $notes, $subtotal, $subtotal, $id);
                db_exec($db, "DELETE FROM ego_po_items WHERE po_id=?", "i", $id);
            } else {
                db_exec($db, "INSERT INTO ego_purchase_orders (supplier_id,status,order_date,expected_date,notes,subtotal,total) VALUES (?,?,?,?,?,?,?)",
                    "issssdd", $supplierId, $status, $orderDate, $expDate, $notes, $subtotal, $subtotal);
                $id = (int)$db->insert_id;
                $ref = "PO-" . str_pad((string)$id, 4, "0", STR_PAD_LEFT);
                db_exec($db, "UPDATE ego_purchase_orders SET reference=? WHERE id=?", "si", $ref, $id);
            }
            $sort = 0;
            foreach ($items as $it) {
                $desc = trim($it["description"] ?? ""); if ($desc === "") continue;
                $qty = (float)($it["qty"] ?? 0); $uc = (float)($it["unit_cost"] ?? 0);
                $partId = ($it["part_id"] ?? "") !== "" ? (int)$it["part_id"] : null;
                db_exec($db, "INSERT INTO ego_po_items (po_id,part_id,description,qty,unit_cost,line_total,sort) VALUES (?,?,?,?,?,?,?)",
                    "iisdddi", $id, $partId, $desc, $qty, $uc, round($qty * $uc, 2), $sort++);
            }
            log_activity($db, null, (int)$actor["id"], $editing ? "po_updated" : "po_created", ["id" => $id]);
            $db->commit();
            send(["id" => $id], $editing ? 200 : 201);
        } catch (Throwable $e) {
            $db->rollback();
            client_error($e, "Something went wrong");
        }
    }
    case "POST /purchase-orders/receive": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        $db->begin_transaction();
        try {
            $po = db_one($db, "SELECT id,reference,status FROM ego_purchase_orders WHERE id=? AND deleted_at IS NULL", "i", $id);
            if (!$po) throw new RuntimeException("Purchase order not found");
            if (!in_array($po["status"], ["draft","ordered"], true)) throw new RuntimeException("PO already {$po['status']}");
            foreach (db_all($db, "SELECT part_id,qty FROM ego_po_items WHERE po_id=? AND part_id IS NOT NULL", "i", $id) as $it) {
                $pid = (int)$it["part_id"]; $qty = (float)$it["qty"];
                db_exec($db, "INSERT INTO ego_stock_movements (part_id,qty_delta,reason,reference,actor_id) VALUES (?,?,?,?,?)",
                    "idssi", $pid, $qty, "purchase", $po["reference"], (int)$actor["id"]);
                db_exec($db, "UPDATE ego_parts SET stock_qty = stock_qty + ? WHERE id=?", "di", $qty, $pid);
            }
            db_exec($db, "UPDATE ego_purchase_orders SET status='received', received_date=CURDATE() WHERE id=?", "i", $id);
            log_activity($db, null, (int)$actor["id"], "po_received", ["id" => $id, "reference" => $po["reference"]]);
            $db->commit();
            send(["ok" => true]);
        } catch (Throwable $e) {
            $db->rollback();
            client_error($e, "Something went wrong");
        }
    }
    case "POST /purchase-orders/cancel": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_purchase_orders SET status='cancelled' WHERE id=? AND status IN ('draft','ordered')", "i", $id);
        log_activity($db, null, (int)$actor["id"], "po_cancelled", ["id" => $id]);
        send(["ok" => true]);
    }
    case "GET /stock-movements": {
        require_role($db, "admin");
        $partId = (int)($_GET["part_id"] ?? 0);
        if ($partId) {
            $rows = db_all($db, "SELECT id,part_id,qty_delta,reason,reference,note,created_at FROM ego_stock_movements WHERE part_id=? ORDER BY id DESC LIMIT 100", "i", $partId);
        } else {
            $rows = db_all($db, "SELECT m.id,m.part_id,m.qty_delta,m.reason,m.reference,m.note,m.created_at,p.name AS part_name
                                 FROM ego_stock_movements m JOIN ego_parts p ON p.id=m.part_id ORDER BY m.id DESC LIMIT 100");
        }
        foreach ($rows as &$r) { $r["id"]=(int)$r["id"]; $r["part_id"]=(int)$r["part_id"]; $r["qty_delta"]=(float)$r["qty_delta"]; }
        send(["movements" => $rows]);
    }

    /* ============================ ASSET MANAGEMENT (M-C) ============================ */
    case "GET /assets": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $due = ($_GET["due"] ?? "") === "1";
        $dueSql = $due ? "AND a.next_service_date IS NOT NULL AND a.next_service_date <= CURDATE()" : "";
        $rows = db_all($db,
            "SELECT a.id,a.name,a.asset_tag,a.type,a.location,a.status,a.next_service_date,
                    a.customer_id, c.name AS customer_name
             FROM ego_assets a LEFT JOIN ego_customers c ON c.id = a.customer_id
             WHERE a.deleted_at IS NULL $dueSql
               AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.serial LIKE ? OR a.location LIKE ?)
             ORDER BY a.name", "ssss", $q, $q, $q, $q);
        foreach ($rows as &$r) { $r["id"]=(int)$r["id"]; $r["customer_id"]=$r["customer_id"]!==null?(int)$r["customer_id"]:null; }
        send(["assets" => $rows]);
    }
    case "GET /assets/get": {
        require_role($db, "admin");
        $id = (int)($_GET["id"] ?? 0);
        $a = db_one($db, "SELECT * FROM ego_assets WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$a) fail("Asset not found", 404);
        $a["id"]=(int)$a["id"]; $a["customer_id"]=$a["customer_id"]!==null?(int)$a["customer_id"]:null;
        $svcs = db_all($db,
            "SELECT s.id,s.service_date,s.outcome,s.notes,s.next_due,s.job_id,u.name AS engineer
             FROM ego_asset_services s LEFT JOIN ego_users u ON u.id = s.engineer_id
             WHERE s.asset_id=? ORDER BY s.service_date DESC, s.id DESC", "i", $id);
        foreach ($svcs as &$s) { $s["id"]=(int)$s["id"]; }
        $a["services"] = $svcs;
        send(["asset" => $a]);
    }
    case "POST /assets":
    case "POST /assets/update": {
        $actor = require_role($db, "admin");
        $b = body();
        $name = trim($b["name"] ?? ""); if ($name === "") fail("Name is required");
        $customerId = ($b["customer_id"] ?? "") !== "" ? (int)$b["customer_id"] : null;
        $status = in_array($b["status"] ?? "ok", ["ok","due","fault","retired"], true) ? ($b["status"] ?? "ok") : "ok";
        $install = trim($b["install_date"] ?? "") ?: null;
        $next = trim($b["next_service_date"] ?? "") ?: null;
        $cols = "name=?,asset_tag=?,customer_id=?,location=?,type=?,make=?,model=?,serial=?,status=?,install_date=?,next_service_date=?,notes=?";
        $types = "ssisssssssss";
        $args = [$name, trim($b["asset_tag"] ?? "") ?: null, $customerId, trim($b["location"] ?? "") ?: null,
                 trim($b["type"] ?? "") ?: null, trim($b["make"] ?? "") ?: null, trim($b["model"] ?? "") ?: null,
                 trim($b["serial"] ?? "") ?: null, $status, $install, $next, trim($b["notes"] ?? "") ?: null];
        if ($route === "/assets/update") {
            $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
            if (!db_one($db, "SELECT id FROM ego_assets WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Asset not found", 404);
            db_exec($db, "UPDATE ego_assets SET $cols WHERE id=?", $types . "i", ...array_merge($args, [$id]));
            log_activity($db, null, (int)$actor["id"], "asset_updated", ["id" => $id]);
            send(["ok" => true]);
        }
        db_exec($db, "INSERT INTO ego_assets (name,asset_tag,customer_id,location,type,make,model,serial,status,install_date,next_service_date,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            $types, ...$args);
        $id = (int)$db->insert_id;
        log_activity($db, null, (int)$actor["id"], "asset_created", ["id" => $id, "name" => $name]);
        send(["id" => $id], 201);
    }
    case "POST /assets/delete": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_assets SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "asset_deleted", ["id" => $id]);
        send(["ok" => true]);
    }
    case "POST /assets/service": {
        $actor = require_role($db, "admin");
        $b = body();
        $assetId = (int)($b["asset_id"] ?? 0); if (!$assetId) fail("asset_id required");
        if (!db_one($db, "SELECT id FROM ego_assets WHERE id=? AND deleted_at IS NULL", "i", $assetId)) fail("Asset not found", 404);
        $date = trim($b["service_date"] ?? "") ?: date("Y-m-d");
        $outcome = in_array($b["outcome"] ?? "ok", ["ok","repaired","fault"], true) ? ($b["outcome"] ?? "ok") : "ok";
        $next = trim($b["next_due"] ?? "") ?: null;
        $jobId = ($b["job_id"] ?? "") !== "" ? (int)$b["job_id"] : null;
        db_exec($db, "INSERT INTO ego_asset_services (asset_id,job_id,service_date,engineer_id,outcome,notes,next_due) VALUES (?,?,?,?,?,?,?)",
            "iisisss", $assetId, $jobId, $date, (int)$actor["id"], $outcome, trim($b["notes"] ?? "") ?: null, $next);
        // Roll the asset's status + next service forward from the latest service.
        $newStatus = $outcome === "fault" ? "fault" : "ok";
        db_exec($db, "UPDATE ego_assets SET status=?, next_service_date=COALESCE(?, next_service_date) WHERE id=?",
            "ssi", $newStatus, $next, $assetId);
        log_activity($db, null, (int)$actor["id"], "asset_serviced", ["asset_id" => $assetId, "outcome" => $outcome]);
        send(["ok" => true], 201);
    }

    /* ============================ PLATFORM — Announcements (M-A) ============================ */
    case "GET /announcements": {
        $me = require_user($db);
        // Engineers see 'engineers'+'all'; office-class see 'office'+'all'.
        $mine = $me["role"] === "engineer" ? "engineers" : "office";
        $rows = db_all($db,
            "SELECT id,title,body,audience,pinned,created_at
             FROM ego_announcements
             WHERE deleted_at IS NULL AND active=1 AND audience IN ('all', ?)
             ORDER BY pinned DESC, id DESC LIMIT 50", "s", $mine);
        foreach ($rows as &$r) { $r["id"]=(int)$r["id"]; $r["pinned"]=(int)$r["pinned"]; }
        send(["announcements" => $rows]);
    }
    case "GET /announcements/manage": {
        require_min($db, "manager");
        $rows = db_all($db,
            "SELECT a.id,a.title,a.body,a.audience,a.pinned,a.active,a.created_at,u.name AS author
             FROM ego_announcements a LEFT JOIN ego_users u ON u.id=a.author_id
             WHERE a.deleted_at IS NULL ORDER BY a.pinned DESC, a.id DESC", "");
        foreach ($rows as &$r) { $r["id"]=(int)$r["id"]; $r["pinned"]=(int)$r["pinned"]; $r["active"]=(int)$r["active"]; }
        send(["announcements" => $rows]);
    }
    case "GET /announcements/get": {
        require_min($db, "manager");
        $a = db_one($db, "SELECT * FROM ego_announcements WHERE id=? AND deleted_at IS NULL", "i", (int)($_GET["id"] ?? 0));
        if (!$a) fail("Announcement not found", 404);
        $a["id"]=(int)$a["id"]; $a["pinned"]=(int)$a["pinned"]; $a["active"]=(int)$a["active"];
        send(["announcement" => $a]);
    }
    case "POST /announcements":
    case "POST /announcements/update": {
        $actor = require_min($db, "manager");
        $b = body();
        $title = trim($b["title"] ?? ""); if ($title === "") fail("Title is required");
        $audience = in_array($b["audience"] ?? "all", ["all","engineers","office"], true) ? ($b["audience"] ?? "all") : "all";
        $body = trim($b["body"] ?? "") ?: null;
        $pinned = (int)!!($b["pinned"] ?? 0);
        $active = isset($b["active"]) ? (int)!!$b["active"] : 1;
        if ($route === "/announcements/update") {
            $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
            if (!db_one($db, "SELECT id FROM ego_announcements WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Announcement not found", 404);
            db_exec($db, "UPDATE ego_announcements SET title=?,body=?,audience=?,pinned=?,active=? WHERE id=?",
                "sssiii", $title, $body, $audience, $pinned, $active, $id);
            log_activity($db, null, (int)$actor["id"], "announcement_updated", ["id" => $id]);
            send(["ok" => true]);
        }
        db_exec($db, "INSERT INTO ego_announcements (title,body,audience,pinned,active,author_id) VALUES (?,?,?,?,?,?)",
            "sssiii", $title, $body, $audience, $pinned, $active, (int)$actor["id"]);
        $id = (int)$db->insert_id;
        log_activity($db, null, (int)$actor["id"], "announcement_created", ["id" => $id, "title" => $title]);
        send(["id" => $id], 201);
    }
    case "POST /announcements/delete": {
        $actor = require_min($db, "manager");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_announcements SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "announcement_deleted", ["id" => $id]);
        send(["ok" => true]);
    }

    /* ============================ CONTRACTS / PPM (M-D) ============================ */
    case "GET /contracts": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db,
            "SELECT ct.id,ct.reference,ct.title,ct.status,ct.value,ct.renewal_date,ct.next_service,ct.next_bill_date,
                    ct.customer_id, c.name AS customer_name
             FROM ego_contracts ct LEFT JOIN ego_customers c ON c.id = ct.customer_id
             WHERE ct.deleted_at IS NULL AND (ct.title LIKE ? OR ct.reference LIKE ? OR c.name LIKE ?)
             ORDER BY ct.id DESC", "sss", $q, $q, $q);
        foreach ($rows as &$r) { $r["id"]=(int)$r["id"]; $r["customer_id"]=$r["customer_id"]!==null?(int)$r["customer_id"]:null; $r["value"]=(float)$r["value"]; }
        send(["contracts" => $rows]);
    }
    case "GET /contracts/get": {
        require_role($db, "admin");
        $id = (int)($_GET["id"] ?? 0);
        $ct = db_one($db, "SELECT * FROM ego_contracts WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$ct) fail("Contract not found", 404);
        $ct["id"]=(int)$ct["id"]; $ct["customer_id"]=$ct["customer_id"]!==null?(int)$ct["customer_id"]:null;
        foreach (["value","bill_amount"] as $k) $ct[$k]=$ct[$k]!==null?(float)$ct[$k]:null;
        $allocs = db_all($db, "SELECT id,kind,person_name,role,hours_per_week,rate,notes FROM ego_contract_allocations WHERE contract_id=? ORDER BY sort,id", "i", $id);
        foreach ($allocs as &$a) { $a["id"]=(int)$a["id"]; $a["hours_per_week"]=$a["hours_per_week"]!==null?(float)$a["hours_per_week"]:null; $a["rate"]=$a["rate"]!==null?(float)$a["rate"]:null; }
        $ct["allocations"] = $allocs;
        send(["contract" => $ct]);
    }
    case "POST /contracts":
    case "POST /contracts/update": {
        $actor = require_role($db, "admin");
        $b = body();
        $title = trim($b["title"] ?? ""); if ($title === "") fail("Title is required");
        $customerId = ($b["customer_id"] ?? "") !== "" ? (int)$b["customer_id"] : null;
        $status = in_array($b["status"] ?? "active", ["active","pending","expired","cancelled"], true) ? ($b["status"] ?? "active") : "active";
        $ni = fn($k) => ($b[$k] ?? "") !== "" ? (int)$b[$k] : null;
        $nd = fn($k) => trim($b[$k] ?? "") ?: null;
        $nf = fn($k) => ($b[$k] ?? "") !== "" ? (float)$b[$k] : null;
        $cols = "customer_id=?,title=?,value=?,status=?,start_date=?,renewal_date=?,sla_response_hours=?,sla_fix_hours=?,ppm_every_days=?,next_service=?,bill_every_days=?,next_bill_date=?,bill_amount=?,notes=?";
        $types = "isdsssiiisisds";
        $args = [$customerId, $title, (float)($b["value"] ?? 0), $status, $nd("start_date"), $nd("renewal_date"),
                 $ni("sla_response_hours"), $ni("sla_fix_hours"), $ni("ppm_every_days"), $nd("next_service"),
                 $ni("bill_every_days"), $nd("next_bill_date"), $nf("bill_amount"), $nd("notes")];
        $allocs = is_array($b["allocations"] ?? null) ? $b["allocations"] : [];

        $db->begin_transaction();
        try {
            if ($route === "/contracts/update") {
                $id = (int)($b["id"] ?? 0); if (!$id) throw new RuntimeException("id required");
                if (!db_one($db, "SELECT id FROM ego_contracts WHERE id=? AND deleted_at IS NULL", "i", $id)) throw new RuntimeException("Contract not found");
                db_exec($db, "UPDATE ego_contracts SET $cols WHERE id=?", $types . "i", ...array_merge($args, [$id]));
                db_exec($db, "DELETE FROM ego_contract_allocations WHERE contract_id=?", "i", $id);
            } else {
                db_exec($db, "INSERT INTO ego_contracts (customer_id,title,value,status,start_date,renewal_date,sla_response_hours,sla_fix_hours,ppm_every_days,next_service,bill_every_days,next_bill_date,bill_amount,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    $types, ...$args);
                $id = (int)$db->insert_id;
                db_exec($db, "UPDATE ego_contracts SET reference=? WHERE id=?", "si", "CT-" . str_pad((string)$id, 4, "0", STR_PAD_LEFT), $id);
            }
            $sort = 0;
            foreach ($allocs as $a) {
                $person = trim($a["person_name"] ?? ""); if ($person === "") continue;
                $kind = in_array($a["kind"] ?? "employee", ["employee","subcontractor"], true) ? $a["kind"] : "employee";
                db_exec($db, "INSERT INTO ego_contract_allocations (contract_id,kind,person_name,role,hours_per_week,rate,notes,sort) VALUES (?,?,?,?,?,?,?,?)",
                    "isssddsi", $id, $kind, $person, trim($a["role"] ?? "") ?: null,
                    ($a["hours_per_week"] ?? "") !== "" ? (float)$a["hours_per_week"] : null,
                    ($a["rate"] ?? "") !== "" ? (float)$a["rate"] : null, trim($a["notes"] ?? "") ?: null, $sort++);
            }
            log_activity($db, null, (int)$actor["id"], $route === "/contracts/update" ? "contract_updated" : "contract_created", ["id" => $id]);
            $db->commit();
            send(["id" => $id], $route === "/contracts/update" ? 200 : 201);
        } catch (Throwable $e) {
            $db->rollback();
            client_error($e, "Something went wrong");
        }
    }
    case "POST /contracts/delete": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_contracts SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "contract_deleted", ["id" => $id]);
        send(["ok" => true]);
    }
    case "POST /contracts/bill": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        $ct = db_one($db, "SELECT id,bill_every_days,bill_amount FROM ego_contracts WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$ct) fail("Contract not found", 404);
        $days = (int)($ct["bill_every_days"] ?? 0);
        db_exec($db, "UPDATE ego_contracts SET last_billed=CURDATE(), next_bill_date = IF(?>0, DATE_ADD(CURDATE(), INTERVAL ? DAY), next_bill_date) WHERE id=?",
            "iii", $days, $days, $id);
        log_activity($db, null, (int)$actor["id"], "contract_billed", ["id" => $id, "amount" => (float)($ct["bill_amount"] ?? 0)]);
        send(["ok" => true]);
    }
    case "POST /contracts/service-done": {
        $actor = require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        $ct = db_one($db, "SELECT id,ppm_every_days FROM ego_contracts WHERE id=? AND deleted_at IS NULL", "i", $id);
        if (!$ct) fail("Contract not found", 404);
        $days = (int)($ct["ppm_every_days"] ?? 0);
        db_exec($db, "UPDATE ego_contracts SET last_service=CURDATE(), next_service = IF(?>0, DATE_ADD(CURDATE(), INTERVAL ? DAY), next_service) WHERE id=?",
            "iii", $days, $days, $id);
        log_activity($db, null, (int)$actor["id"], "contract_service_done", ["id" => $id]);
        send(["ok" => true]);
    }

    /* ============================ COMPLIANCE — RAMS (M-E) ============================ */
    case "GET /rams": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db, "SELECT id,title,trade,reference,review_date FROM ego_rams_documents WHERE deleted_at IS NULL AND (title LIKE ? OR trade LIKE ? OR reference LIKE ?) ORDER BY title", "sss", $q, $q, $q);
        foreach ($rows as &$r) $r["id"] = (int)$r["id"];
        send(["rams" => $rows]);
    }
    case "GET /rams/get": {
        require_role($db, "admin");
        $r = db_one($db, "SELECT * FROM ego_rams_documents WHERE id=? AND deleted_at IS NULL", "i", (int)($_GET["id"] ?? 0));
        if (!$r) fail("RAMS not found", 404);
        $r["id"] = (int)$r["id"];
        send(["rams" => $r]);
    }
    case "POST /rams":
    case "POST /rams/update": {
        $actor = require_role($db, "admin");
        $b = body(); $title = trim($b["title"] ?? ""); if ($title === "") fail("Title is required");
        $args = [$title, trim($b["trade"] ?? "") ?: null, trim($b["reference"] ?? "") ?: null, trim($b["review_date"] ?? "") ?: null, trim($b["content"] ?? "") ?: null];
        if ($route === "/rams/update") {
            $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
            db_exec($db, "UPDATE ego_rams_documents SET title=?,trade=?,reference=?,review_date=?,content=? WHERE id=?", "sssssi", ...array_merge($args, [$id]));
            log_activity($db, null, (int)$actor["id"], "rams_updated", ["id" => $id]); send(["ok" => true]);
        }
        db_exec($db, "INSERT INTO ego_rams_documents (title,trade,reference,review_date,content) VALUES (?,?,?,?,?)", "sssss", ...$args);
        $id = (int)$db->insert_id; log_activity($db, null, (int)$actor["id"], "rams_created", ["id" => $id]); send(["id" => $id], 201);
    }
    case "POST /rams/delete": {
        $actor = require_role($db, "admin"); $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_rams_documents SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "rams_deleted", ["id" => $id]); send(["ok" => true]);
    }

    /* ============================ COMPLIANCE — Incidents (M-E) ============================ */
    case "GET /incidents": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db, "SELECT id,incident_date,type,severity,location,person,status FROM ego_incidents WHERE deleted_at IS NULL AND (location LIKE ? OR person LIKE ? OR description LIKE ?) ORDER BY incident_date DESC, id DESC", "sss", $q, $q, $q);
        foreach ($rows as &$r) $r["id"] = (int)$r["id"];
        send(["incidents" => $rows]);
    }
    case "GET /incidents/get": {
        require_role($db, "admin");
        $r = db_one($db, "SELECT * FROM ego_incidents WHERE id=? AND deleted_at IS NULL", "i", (int)($_GET["id"] ?? 0));
        if (!$r) fail("Incident not found", 404); $r["id"] = (int)$r["id"];
        send(["incident" => $r]);
    }
    case "POST /incidents":
    case "POST /incidents/update": {
        $actor = require_role($db, "admin"); $b = body();
        $type = in_array($b["type"] ?? "near_miss", ["accident","near_miss","injury","property","environmental","other"], true) ? ($b["type"] ?? "near_miss") : "near_miss";
        $sev = in_array($b["severity"] ?? "low", ["low","medium","high","riddor"], true) ? ($b["severity"] ?? "low") : "low";
        $status = in_array($b["status"] ?? "open", ["open","investigating","closed"], true) ? ($b["status"] ?? "open") : "open";
        $args = [trim($b["incident_date"] ?? "") ?: null, $type, $sev, trim($b["location"] ?? "") ?: null, trim($b["person"] ?? "") ?: null,
                 trim($b["description"] ?? "") ?: null, trim($b["action_taken"] ?? "") ?: null, trim($b["reported_by"] ?? "") ?: null, $status];
        if ($route === "/incidents/update") {
            $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
            db_exec($db, "UPDATE ego_incidents SET incident_date=?,type=?,severity=?,location=?,person=?,description=?,action_taken=?,reported_by=?,status=? WHERE id=?", "sssssssssi", ...array_merge($args, [$id]));
            log_activity($db, null, (int)$actor["id"], "incident_updated", ["id" => $id]); send(["ok" => true]);
        }
        db_exec($db, "INSERT INTO ego_incidents (incident_date,type,severity,location,person,description,action_taken,reported_by,status) VALUES (?,?,?,?,?,?,?,?,?)", "sssssssss", ...$args);
        $id = (int)$db->insert_id; log_activity($db, null, (int)$actor["id"], "incident_created", ["id" => $id, "severity" => $sev]); send(["id" => $id], 201);
    }
    case "POST /incidents/delete": {
        $actor = require_role($db, "admin"); $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_incidents SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "incident_deleted", ["id" => $id]); send(["ok" => true]);
    }

    /* ============================ COMPLIANCE — Certificates (M-E) ============================ */
    case "GET /certificates": {
        require_role($db, "admin");
        $q = "%" . trim($_GET["q"] ?? "") . "%";
        $rows = db_all($db, "SELECT c.id,c.title,c.holder,c.type,c.reference,c.issued_date,c.expiry_date,c.engineer_id,u.name AS engineer
                             FROM ego_certificates c LEFT JOIN ego_users u ON u.id=c.engineer_id
                             WHERE c.deleted_at IS NULL AND (c.title LIKE ? OR c.holder LIKE ? OR c.type LIKE ?) ORDER BY c.expiry_date IS NULL, c.expiry_date", "sss", $q, $q, $q);
        $today = new DateTime("today");
        foreach ($rows as &$r) {
            $r["id"] = (int)$r["id"]; $r["engineer_id"] = $r["engineer_id"] !== null ? (int)$r["engineer_id"] : null;
            $r["status"] = "valid";
            if ($r["expiry_date"]) {
                $exp = new DateTime($r["expiry_date"]); $days = (int)$today->diff($exp)->format("%r%a");
                $r["status"] = $days < 0 ? "expired" : ($days <= 30 ? "expiring" : "valid");
            }
        }
        send(["certificates" => $rows]);
    }
    case "GET /certificates/get": {
        require_role($db, "admin");
        $r = db_one($db, "SELECT * FROM ego_certificates WHERE id=? AND deleted_at IS NULL", "i", (int)($_GET["id"] ?? 0));
        if (!$r) fail("Certificate not found", 404);
        $r["id"] = (int)$r["id"]; $r["engineer_id"] = $r["engineer_id"] !== null ? (int)$r["engineer_id"] : null;
        send(["certificate" => $r]);
    }
    case "POST /certificates":
    case "POST /certificates/update": {
        $actor = require_role($db, "admin"); $b = body();
        $title = trim($b["title"] ?? ""); if ($title === "") fail("Title is required");
        $engId = ($b["engineer_id"] ?? "") !== "" ? (int)$b["engineer_id"] : null;
        $args = [$title, trim($b["holder"] ?? "") ?: null, $engId, trim($b["type"] ?? "") ?: null, trim($b["reference"] ?? "") ?: null,
                 trim($b["issued_date"] ?? "") ?: null, trim($b["expiry_date"] ?? "") ?: null];
        if ($route === "/certificates/update") {
            $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
            db_exec($db, "UPDATE ego_certificates SET title=?,holder=?,engineer_id=?,type=?,reference=?,issued_date=?,expiry_date=? WHERE id=?", "ssissssi", ...array_merge($args, [$id]));
            log_activity($db, null, (int)$actor["id"], "certificate_updated", ["id" => $id]); send(["ok" => true]);
        }
        db_exec($db, "INSERT INTO ego_certificates (title,holder,engineer_id,type,reference,issued_date,expiry_date) VALUES (?,?,?,?,?,?,?)", "ssissss", ...$args);
        $id = (int)$db->insert_id; log_activity($db, null, (int)$actor["id"], "certificate_created", ["id" => $id]); send(["id" => $id], 201);
    }
    case "POST /certificates/delete": {
        $actor = require_role($db, "admin"); $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "UPDATE ego_certificates SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "certificate_deleted", ["id" => $id]); send(["ok" => true]);
    }

    /* ============================ ACCOUNT SECURITY + TOTP 2FA (M-A) ============================ */
    case "POST /me/change-password": {
        $me = require_user($db); $b = body();
        $cur = (string)($b["current_password"] ?? ""); $new = (string)($b["new_password"] ?? "");
        if (strlen($new) < 8) fail("New password must be at least 8 characters");
        $row = db_one($db, "SELECT password_hash FROM ego_users WHERE id=?", "i", (int)$me["id"]);
        if (!$row || !$row["password_hash"] || !password_verify($cur, $row["password_hash"])) fail("Current password is incorrect", 403);
        db_exec($db, "UPDATE ego_users SET password_hash=?, must_change_password=0, password_changed_at=NOW() WHERE id=?",
            "si", password_hash($new, PASSWORD_DEFAULT), (int)$me["id"]);
        // Revoke every other session so a stolen/older token can't survive a password change.
        db_exec($db, "DELETE FROM ego_sessions WHERE user_id=? AND token<>?", "si", (int)$me["id"], (string)bearer());
        log_activity($db, null, (int)$me["id"], "password_changed", []);
        send(["ok" => true]);
    }
    case "POST /me/totp/setup": {
        $me = require_user($db);
        // Require the current password so a hijacked session can't pivot the 2FA secret.
        $row = db_one($db, "SELECT password_hash FROM ego_users WHERE id=?", "i", (int)$me["id"]);
        if (!$row || !$row["password_hash"] || !password_verify((string)(body()["password"] ?? ""), $row["password_hash"])) fail("Confirm your password to set up 2FA", 403);
        require_once __DIR__ . "/lib/totp.php";
        $secret = totp_secret();
        db_exec($db, "UPDATE ego_users SET totp_secret=?, totp_enabled=0 WHERE id=?", "si", $secret, (int)$me["id"]);
        send(["secret" => $secret, "otpauth" => totp_uri($secret, (string)$me["email"])]);
    }
    case "POST /me/totp/enable": {
        $me = require_user($db);
        require_once __DIR__ . "/lib/totp.php";
        $row = db_one($db, "SELECT totp_secret FROM ego_users WHERE id=?", "i", (int)$me["id"]);
        if (!$row || !$row["totp_secret"]) fail("Run 2FA setup first");
        if (!totp_verify((string)$row["totp_secret"], trim((string)(body()["code"] ?? "")))) fail("Invalid code — check your authenticator", 400);
        db_exec($db, "UPDATE ego_users SET totp_enabled=1 WHERE id=?", "i", (int)$me["id"]);
        log_activity($db, null, (int)$me["id"], "totp_enabled", []);
        send(["ok" => true]);
    }
    case "POST /me/totp/disable": {
        $me = require_user($db);
        $row = db_one($db, "SELECT password_hash FROM ego_users WHERE id=?", "i", (int)$me["id"]);
        if (!$row || !password_verify((string)(body()["password"] ?? ""), $row["password_hash"])) fail("Password incorrect", 403);
        db_exec($db, "UPDATE ego_users SET totp_enabled=0, totp_secret=NULL WHERE id=?", "i", (int)$me["id"]);
        log_activity($db, null, (int)$me["id"], "totp_disabled", []);
        send(["ok" => true]);
    }
    // Manager+ can force a staff member to set a new password at next login.
    case "POST /team/force-password-change": {
        $actor = require_min($db, "manager");
        $uid = (int)(body()["id"] ?? 0); if (!$uid) fail("id required");
        db_exec($db, "UPDATE ego_users SET must_change_password=1 WHERE id=? AND deleted_at IS NULL", "i", $uid);
        log_activity($db, null, (int)$actor["id"], "force_password_change", ["user_id" => $uid]);
        send(["ok" => true]);
    }

    /* ============================ ADMIN DELETE (manager+) ============================ */
    case "POST /jobs/delete": {
        $actor = require_min($db, "manager");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        if (!db_one($db, "SELECT id FROM ego_jobs WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Job not found", 404);
        db_exec($db, "UPDATE ego_jobs SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, $id, (int)$actor["id"], "job_deleted", []);
        send(["ok" => true]);
    }
    case "POST /invoices/delete": {
        $actor = require_min($db, "manager");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        if (!db_one($db, "SELECT id FROM ego_invoices WHERE id=? AND deleted_at IS NULL", "i", $id)) fail("Not found", 404);
        db_exec($db, "UPDATE ego_invoices SET deleted_at=NOW() WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "invoice_deleted", ["id" => $id]);
        send(["ok" => true]);
    }
    case "POST /payments/delete": {
        $actor = require_min($db, "manager");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        $p = db_one($db, "SELECT id, invoice_id FROM ego_payments WHERE id=?", "i", $id);
        if (!$p) fail("Payment not found", 404);
        db_exec($db, "DELETE FROM ego_payments WHERE id=?", "i", $id);
        log_activity($db, null, (int)$actor["id"], "payment_deleted", ["id" => $id, "invoice_id" => (int)$p["invoice_id"]]);
        send(["ok" => true]);
    }

    /* ============================ MAIL — drafts + notes ============================ */
    case "POST /email/draft": {
        $actor = require_role($db, "admin");
        $b = body();
        $to = trim($b["to"] ?? "") ?: null;
        $subject = trim($b["subject"] ?? "");
        $bodyTxt = trim($b["body"] ?? "");
        if ($subject === "" && $bodyTxt === "") fail("Nothing to save");
        $id = (int)($b["id"] ?? 0);
        if ($id) {
            db_exec($db, "UPDATE ego_messages SET to_email=?,subject=?,body=? WHERE id=? AND status='draft'", "sssi", $to, $subject, $bodyTxt, $id);
            send(["id" => $id]);
        }
        db_exec($db, "INSERT INTO ego_messages (direction,channel,to_email,subject,body,status) VALUES ('outbound','email',?,?,?, 'draft')",
            "sss", $to, $subject, $bodyTxt);
        log_activity($db, null, (int)$actor["id"], "draft_saved", []);
        send(["id" => (int)$db->insert_id], 201);
    }

    /* ===================== MARKETING: SUBSCRIBERS + CAMPAIGNS ===================== */
    // Newsletter signups (landing) and admin-added contacts live in ego_subscribers;
    // customers come from ego_customers. Admins compose + send bulk email to any
    // audience, with an AI draft helper. Human always approves before send.
    case "GET /subscribers": {
        require_role($db, "admin");
        ensure_subscribers_table($db);
        $subs = db_all($db, "SELECT id,email,name,source,subscribed,created_at FROM ego_subscribers ORDER BY id DESC");
        $cust = (int)(db_one($db, "SELECT COUNT(*) c FROM ego_customers WHERE email IS NOT NULL AND email<>'' AND deleted_at IS NULL")["c"] ?? 0);
        send(["subscribers" => $subs, "subscriber_count" => count(array_filter($subs, fn($s) => (int)$s["subscribed"] === 1)), "customer_email_count" => $cust]);
    }
    case "POST /subscribers": {
        $actor = require_role($db, "admin");
        ensure_subscribers_table($db);
        $b = body();
        $email = strtolower(trim($b["email"] ?? ""));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail("A valid email is required");
        $name = trim($b["name"] ?? "") ?: null;
        $src = trim($b["source"] ?? "") ?: "manual";
        db_exec($db, "INSERT INTO ego_subscribers (email,name,source) VALUES (?,?,?)
                      ON DUPLICATE KEY UPDATE name=COALESCE(VALUES(name),name), subscribed=1", "sss", $email, $name, $src);
        log_activity($db, null, (int)$actor["id"], "subscriber_added", ["email" => $email]);
        send(["ok" => true], 201);
    }
    case "POST /subscribers/delete": {
        require_role($db, "admin");
        ensure_subscribers_table($db);
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        db_exec($db, "DELETE FROM ego_subscribers WHERE id=?", "i", $id);
        send(["ok" => true]);
    }
    case "POST /campaigns/draft": {
        require_role($db, "admin");
        $b = body();
        $brief = trim($b["brief"] ?? ""); if ($brief === "") fail("Describe what the message should say");
        $kind = trim($b["kind"] ?? "marketing") ?: "marketing";
        $co = db_one($db, "SELECT company_name FROM ego_company_settings ORDER BY id LIMIT 1");
        $name = $co["company_name"] ?? "EGO LIMITED";
        $task = "Write a $kind email for $name. A short, punchy subject line, then the body in a few short paragraphs, signed off as the $name team. "
            . "Owner's brief: $brief\n\nReturn EXACTLY as:\nSubject: <subject line>\n\n<email body>";
        try { $text = ai_draft($db, $task, ego_brand_voice($db)); }
        catch (Throwable $e) { client_error($e, "Something went wrong"); }
        $subject = ""; $bodyTxt = trim($text);
        if (preg_match('/^\s*subject:\s*(.+?)\r?\n+(.*)$/is', $text, $m)) { $subject = trim($m[1]); $bodyTxt = trim($m[2]); }
        send(["subject" => $subject, "body" => $bodyTxt]);
    }
    case "POST /campaigns/send": {
        $actor = require_role($db, "admin");
        ensure_subscribers_table($db);
        $b = body();
        $subject = trim($b["subject"] ?? ""); $bodyTxt = trim($b["body"] ?? "");
        $audience = (string)($b["audience"] ?? "subscribers");
        if ($subject === "" || $bodyTxt === "") fail("A subject and message are required");
        // De-duped recipient map: email => name.
        $rows = [];
        if ($audience === "list") {
            foreach ((array)($b["emails"] ?? []) as $e) {
                $e = strtolower(trim((string)$e));
                if (filter_var($e, FILTER_VALIDATE_EMAIL)) $rows[$e] = $rows[$e] ?? null;
            }
        } else {
            if ($audience === "subscribers" || $audience === "all")
                foreach (db_all($db, "SELECT email,name FROM ego_subscribers WHERE subscribed=1") as $r) $rows[strtolower($r["email"])] = $r["name"];
            if ($audience === "customers" || $audience === "all")
                foreach (db_all($db, "SELECT email,name FROM ego_customers WHERE email IS NOT NULL AND email<>'' AND deleted_at IS NULL") as $r)
                    $rows[strtolower($r["email"])] = $rows[strtolower($r["email"])] ?? $r["name"];
        }
        // Honour opt-outs across EVERY audience (suppression list) — UK PECR.
        foreach (db_all($db, "SELECT email FROM ego_subscribers WHERE subscribed=0") as $r) unset($rows[strtolower($r["email"])]);
        if (!$rows) fail("No recipients for that audience yet");
        require_once __DIR__ . "/lib/mailer.php";
        // Optional header image makes the campaign read like a post, not a plain email.
        $img = trim($b["image_url"] ?? "");
        $imgHtml = ($img !== "" && filter_var($img, FILTER_VALIDATE_URL))
            ? "<img src='" . htmlspecialchars($img) . "' alt='' style='display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:0 0 18px'>"
            : "";
        $bodyHtml = $imgHtml . nl2br(htmlspecialchars($bodyTxt));
        $coName = htmlspecialchars((db_one($db, "SELECT company_name FROM ego_company_settings ORDER BY id LIMIT 1")["company_name"] ?? "") ?: "EGO LIMITED");
        $scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
        $unsubBase = "$scheme://" . ($_SERVER["HTTP_HOST"] ?? "egolimited.com") . "$base/unsubscribe";
        $sent = 0; $failed = 0;
        foreach ($rows as $email => $name) {
            // Throttle so a big send doesn't saturate the SMTP relay (~8/sec).
            if ($sent + $failed > 0) usleep(120000);
            // Per-recipient unsubscribe link so every marketing email carries a real opt-out.
            $link = htmlspecialchars($unsubBase . "?e=" . rawurlencode($email) . "&t=" . ego_unsub_token($email));
            $foot = "<p style='margin:18px 0 0;color:#9ca3af;font-size:12px'>You're receiving this from $coName. "
                . "<a href='$link' style='color:#9ca3af'>Unsubscribe</a>.</p>";
            $html = ego_email_shell($db, "", $bodyHtml . $foot);
            try {
                ego_send_mail($db, $email, $name ?: null, $subject, $html);
                $sent++;
                db_exec($db, "INSERT INTO ego_messages (direction,channel,to_email,subject,body,status) VALUES ('outbound','campaign',?,?,?, 'sent')", "sss", $email, $subject, $bodyTxt);
            } catch (Throwable $e) { $failed++; }
        }
        log_activity($db, null, (int)$actor["id"], "campaign_sent", ["audience" => $audience, "sent" => $sent, "failed" => $failed]);
        send(["ok" => true, "sent" => $sent, "failed" => $failed, "recipients" => count($rows)]);
    }
    case "POST /notes": {
        $actor = require_role($db, "admin");
        $b = body();
        $bodyTxt = trim($b["body"] ?? ""); if ($bodyTxt === "") fail("Note is empty");
        $title = trim($b["title"] ?? "") ?: "Note";
        db_exec($db, "INSERT INTO ego_messages (direction,channel,from_name,subject,body,status) VALUES ('outbound','note',?,?,?, 'note')",
            "sss", $actor["name"], $title, $bodyTxt);
        log_activity($db, null, (int)$actor["id"], "note_added", ["title" => $title]);
        send(["id" => (int)$db->insert_id], 201);
    }
    case "POST /messages/delete": {
        require_role($db, "admin");
        $id = (int)(body()["id"] ?? 0); if (!$id) fail("id required");
        // Office can clear anything from their own mailbox (inbox/sent/drafts/notes).
        // Portal threads stay (they belong to the customer's job record).
        tombstone_uids($db, "id=?", "i", [$id]); // keep it deleted across re-syncs
        require_once __DIR__ . "/lib/inbox.php";
        try { inbox_delete_remote($db, [$id]); } catch (Throwable $e) { /* best-effort: also delete on the IMAP server */ }
        db_exec($db, "DELETE FROM ego_messages WHERE id=? AND (channel IS NULL OR channel <> 'portal')", "i", $id);
        send(["ok" => true]);
    }
    case "POST /messages/archive": {
        require_role($db, "admin");
        ensure_message_cols($db);
        $b = body(); $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
        $on = (int)!!($b["archived"] ?? 1);
        db_exec($db, "UPDATE ego_messages SET archived=? WHERE id=?", "ii", $on, $id);
        send(["ok" => true]);
    }
    case "POST /messages/flag": {
        require_role($db, "admin");
        ensure_message_cols($db);
        $b = body(); $id = (int)($b["id"] ?? 0); if (!$id) fail("id required");
        $on = (int)!!($b["flagged"] ?? 1);
        db_exec($db, "UPDATE ego_messages SET flagged=? WHERE id=?", "ii", $on, $id);
        send(["ok" => true]);
    }
    case "POST /messages/bulk": {
        // Multiselect actions: delete | archive | unarchive | flag | unflag.
        require_role($db, "admin");
        ensure_message_cols($db);
        $b = body();
        $action = (string)($b["action"] ?? "");
        $ids = array_values(array_filter(array_map("intval", (array)($b["ids"] ?? [])), fn($n) => $n > 0));
        if (!$ids) fail("Select at least one message");
        if (count($ids) > 500) fail("Too many at once");
        $place = implode(",", array_fill(0, count($ids), "?"));
        $types = str_repeat("i", count($ids));
        switch ($action) {
            case "delete":
                tombstone_uids($db, "id IN ($place)", $types, $ids);
                require_once __DIR__ . "/lib/inbox.php";
                try { inbox_delete_remote($db, $ids); } catch (Throwable $e) { /* best-effort server-side delete */ }
                $sql = "DELETE FROM ego_messages WHERE id IN ($place) AND (channel IS NULL OR channel <> 'portal')"; break;
            case "archive":   $sql = "UPDATE ego_messages SET archived=1 WHERE id IN ($place)"; break;
            case "unarchive": $sql = "UPDATE ego_messages SET archived=0 WHERE id IN ($place)"; break;
            case "flag":      $sql = "UPDATE ego_messages SET flagged=1 WHERE id IN ($place)"; break;
            case "unflag":    $sql = "UPDATE ego_messages SET flagged=0 WHERE id IN ($place)"; break;
            default: fail("Unknown action");
        }
        db_exec($db, $sql, $types, ...$ids);
        send(["ok" => true, "count" => count($ids)]);
    }

    /* ============================ PUBLIC (landing — no auth) ============================ */
    case "GET /unsubscribe": {
        // One-click marketing opt-out (UK PECR). Token is HMAC-derived from the email,
        // so the link is stable and not trivially guessable. Idempotent.
        require_once __DIR__ . "/lib/mailer.php";
        ensure_subscribers_table($db);
        $e = strtolower(trim((string)($_GET["e"] ?? "")));
        $t = (string)($_GET["t"] ?? "");
        $ok = filter_var($e, FILTER_VALIDATE_EMAIL) && hash_equals(ego_unsub_token($e), $t);
        if ($ok) db_exec($db, "INSERT INTO ego_subscribers (email,source,subscribed) VALUES (?,'unsubscribe',0)
                               ON DUPLICATE KEY UPDATE subscribed=0", "s", $e);
        $co = htmlspecialchars((db_one($db, "SELECT company_name FROM ego_company_settings ORDER BY id LIMIT 1")["company_name"] ?? "") ?: "EGO LIMITED");
        $msg = $ok
            ? "<h2 style='color:#171816;margin:0 0 8px'>You're unsubscribed</h2><p style='color:#4b5563'>You won't receive any more marketing emails from $co. You'll still get essential messages about jobs you book with us.</p>"
            : "<h2 style='color:#171816;margin:0 0 8px'>Link not valid</h2><p style='color:#4b5563'>This unsubscribe link has expired or is incorrect. Reply to any email from us and we'll remove you.</p>";
        header("Content-Type: text/html; charset=UTF-8");
        echo "<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Unsubscribe</title></head>"
            . "<body style='margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif'>"
            . "<div style='max-width:480px;margin:48px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden'>"
            . "<div style='background:#171816;padding:16px 24px'><span style='color:#fff;font-weight:700;letter-spacing:.05em'>$co</span>"
            . "<span style='display:inline-block;width:24px;height:3px;background:#EF9F27;border-radius:2px;margin-left:10px;vertical-align:middle'></span></div>"
            . "<div style='padding:28px 24px'>$msg</div></div></body></html>";
        exit;
    }
    case "GET /public/company": {
        $cs = db_one($db, "SELECT company_name,phone,email,address,vat_number,companies_house_no FROM ego_company_settings ORDER BY id LIMIT 1") ?? [];
        send(["company" => [
            "company_name"       => $cs["company_name"] ?? "",
            "company_phone"      => $cs["phone"] ?? "",
            "company_email"      => $cs["email"] ?? "",
            "company_address"    => $cs["address"] ?? "",
            "vat_number"         => $cs["vat_number"] ?? "",
            "companies_house_no" => $cs["companies_house_no"] ?? "",
        ]]);
    }
    case "GET /public/reviews": {
        // Published customer reviews (4-star+ with text) that feed the landing
        // testimonials. App reviews + any imported Google reviews (source column).
        $rows = db_all($db,
            "SELECT m.rating, m.body, m.from_name, m.created_at, m.source, c.name AS customer_name
             FROM ego_messages m
             LEFT JOIN ego_customers c ON c.id = m.customer_id
             WHERE m.channel='review' AND m.rating >= 4 AND m.body IS NOT NULL AND TRIM(m.body) <> ''
             ORDER BY m.id DESC LIMIT 12", "");
        $reviews = []; $sum = 0;
        foreach ($rows as $r) {
            $sum += (int)$r["rating"];
            $reviews[] = [
                "name"   => trim($r["from_name"] ?? "") ?: ($r["customer_name"] ?? "Customer"),
                "quote"  => $r["body"],
                "score"  => (int)$r["rating"],
                "date"   => $r["created_at"],
                "source" => $r["source"] ?: "app",
            ];
        }
        $count = count($reviews);
        send([
            "source"  => "app",
            "rating"  => $count ? round($sum / $count, 1) : null,
            "count"   => $count,
            "reviews" => $reviews,
        ]);
    }

    /* ============================ REVIEWS HUB — add / import Google ============================ */
    case "POST /reviews/add": {
        $actor = require_role($db, "admin");
        $b = body();
        $rating = max(0, min(5, (int)($b["rating"] ?? 0)));
        $bodyTxt = trim($b["body"] ?? "");
        $name = trim($b["name"] ?? "") ?: "Customer";
        $source = in_array($b["source"] ?? "google", ["app","google"], true) ? $b["source"] : "google";
        if ($rating < 1 || $bodyTxt === "") fail("Rating and review text required");
        db_exec($db,
            "INSERT INTO ego_messages (direction,channel,from_name,body,rating,status,source,acknowledged)
             VALUES ('inbound','review',?,?,?, 'received',?,1)",
            "ssis", $name, $bodyTxt, $rating, $source);
        log_activity($db, null, (int)$actor["id"], "review_added", ["source" => $source]);
        send(["id" => (int)$db->insert_id], 201);
    }
    case "POST /reviews/import-google": {
        $actor = require_min($db, "manager");
        $key = integ($db, "google_places_key");
        $place = integ($db, "google_place_id");
        if (!$key || !$place) fail("Add a Google Places API key and Place ID in Settings → Integrations first", 400);
        $url = "https://maps.googleapis.com/maps/api/place/details/json?place_id=" . urlencode($place)
             . "&fields=reviews&reviews_no_translations=true&key=" . urlencode($key);
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
        $resp = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($code !== 200) fail("Google API error ($code) — check the key/Place ID", 400);
        $data = json_decode($resp ?: "[]", true);
        $revs = $data["result"]["reviews"] ?? [];
        $n = 0;
        foreach ($revs as $r) {
            $rating = (int)($r["rating"] ?? 0); if ($rating < 1) continue;
            $text = trim($r["text"] ?? ""); if ($text === "") continue;
            $name = trim($r["author_name"] ?? "") ?: "Google user";
            $uid = "google:" . md5($name . ($r["time"] ?? "") . $text);
            if (db_one($db, "SELECT id FROM ego_messages WHERE uid=?", "s", $uid)) continue; // dedupe
            db_exec($db,
                "INSERT INTO ego_messages (direction,channel,from_name,body,rating,status,source,uid,acknowledged)
                 VALUES ('inbound','review',?,?,?, 'received','google',?,1)",
                "ssis", $name, $text, $rating, $uid);
            $n++;
        }
        log_activity($db, null, (int)$actor["id"], "google_reviews_imported", ["count" => $n]);
        send(["imported" => $n]);
    }

    default:
        fail("Not found: $method $route", 404);
}
