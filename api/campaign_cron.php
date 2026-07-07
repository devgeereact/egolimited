<?php
/**
 * EGO LIMITED — M17 lead-drip cron (CLI). Sends the next small batch of APPROVED,
 * not-yet-emailed leads using the message saved in Settings → Campaigns → Automation.
 * Does nothing (exits quietly) if automation is off or there's nothing new to send —
 * never re-emails the same person twice. Schedule every 1-2h in cPanel:
 *   php /home/.../egolimited.com/api/campaign_cron.php
 */
declare(strict_types=1);
if (PHP_SAPI !== "cli") { http_response_code(404); exit; } // CLI only — never web-triggerable
$cfg = require __DIR__ . "/config.php";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");
date_default_timezone_set("Europe/London"); // server is US/Eastern — run on UK time
@$db->query("SET time_zone = '" . date("P") . "'");

function db_one(mysqli $db, string $sql, string $t = "", ...$a): ?array {
    $s = $db->prepare($sql); if ($t) $s->bind_param($t, ...$a); $s->execute();
    $r = $s->get_result(); return $r ? ($r->fetch_assoc() ?: null) : null;
}
function db_all(mysqli $db, string $sql, string $t = "", ...$a): array {
    $s = $db->prepare($sql); if ($t) $s->bind_param($t, ...$a); $s->execute();
    $r = $s->get_result(); return $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
}
function db_exec(mysqli $db, string $sql, string $t = "", ...$a): void {
    $s = $db->prepare($sql); if ($t) $s->bind_param($t, ...$a); $s->execute();
}
function integ(mysqli $db, string $key): ?string {
    $r = db_one($db, "SELECT v FROM ego_integrations WHERE k=?", "s", $key);
    return ($r && $r["v"] !== null && $r["v"] !== "") ? $r["v"] : null;
}
require __DIR__ . "/lib/mailer.php";

// Self-heal: tables may not exist yet on a fresh deploy (same idiom as cron.php M-tasks).
$db->query("CREATE TABLE IF NOT EXISTS ego_leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NULL, company VARCHAR(190) NULL, email VARCHAR(190) NULL,
    website VARCHAR(255) NULL, source_url VARCHAR(500) NULL, note VARCHAR(500) NULL,
    status ENUM('found','approved','rejected','emailed') NOT NULL DEFAULT 'found',
    search_query VARCHAR(255) NULL, found_by INT NULL, emailed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lead_email (email), INDEX idx_ego_lead_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$db->query("CREATE TABLE IF NOT EXISTS ego_campaign_automation (
    id INT PRIMARY KEY DEFAULT 1, enabled TINYINT NOT NULL DEFAULT 0,
    subject VARCHAR(255) NULL, body MEDIUMTEXT NULL, image_url VARCHAR(500) NULL,
    batch_size INT NOT NULL DEFAULT 25,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, updated_by INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$db->query("INSERT IGNORE INTO ego_campaign_automation (id, enabled) VALUES (1, 0)");

$auto = db_one($db, "SELECT * FROM ego_campaign_automation WHERE id=1");
if (!$auto || (int)$auto["enabled"] !== 1) { echo "automation: off\n"; exit; }

// Business-hours guard (Europe/London): only drip 08:00–17:59, Mon–Fri, never on an England
// & Wales bank holiday. Cron can be scheduled hourly; it simply no-ops outside the window.
$dow = (int) date("N");            // 1 Mon … 7 Sun
$hour = (int) date("G");           // 0 … 23
$today = date("Y-m-d");
$BANK_HOLIDAYS = [
    // England & Wales (gov.uk). Extend yearly.
    "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
    "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
];
if ($dow >= 6) { echo "automation: weekend — skipped\n"; exit; }
if (in_array($today, $BANK_HOLIDAYS, true)) { echo "automation: bank holiday — skipped\n"; exit; }
if ($hour < 8 || $hour >= 18) { echo "automation: outside 8am–6pm — skipped\n"; exit; }

$batch = max(1, min(100, (int)($auto["batch_size"] ?? 25)));

// Self-heal the sequence tables (cron runs standalone; index.php may not have created them yet).
$db->query("CREATE TABLE IF NOT EXISTS ego_campaign_steps (
    id INT AUTO_INCREMENT PRIMARY KEY, step_no INT NOT NULL, delay_days INT NOT NULL DEFAULT 0,
    subject VARCHAR(255) NULL, body MEDIUMTEXT NULL, image_url VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_step_no (step_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$db->query("CREATE TABLE IF NOT EXISTS ego_campaign_sends (
    lead_id INT NOT NULL, step_no INT NOT NULL, sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lead_step (lead_id, step_no), INDEX idx_send_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
// Fold a legacy single message into step 1 if the sequence is empty.
if ((int)($db->query("SELECT COUNT(*) c FROM ego_campaign_steps")->fetch_assoc()["c"] ?? 0) === 0
    && trim((string)($auto["subject"] ?? "")) !== "" && trim((string)($auto["body"] ?? "")) !== "") {
    $s = $db->prepare("INSERT INTO ego_campaign_steps (step_no,delay_days,subject,body,image_url) VALUES (1,0,?,?,?)");
    $s->bind_param("sss", $auto["subject"], $auto["body"], $auto["image_url"]); $s->execute();
}

$steps = db_all($db, "SELECT * FROM ego_campaign_steps WHERE subject<>'' AND body<>'' ORDER BY step_no");
if (!$steps) { echo "automation: no steps configured\n"; exit; }
$lastStepNo = (int)$steps[count($steps) - 1]["step_no"];

$co = db_one($db, "SELECT company_name FROM ego_company_settings ORDER BY id LIMIT 1");
$coNamePlain = ($co["company_name"] ?? "") ?: "EGO LIMITED";
$coName = htmlspecialchars($coNamePlain);
$unsubBase = "https://egolimited.com/api/unsubscribe";

// Approved, valid-email, not-opted-out leads still in the sequence. We send at most $batch
// touches this run — the next DUE step for whichever leads have waited their delay.
$leads = db_all($db,
    "SELECT l.* FROM ego_leads l
     LEFT JOIN ego_subscribers s ON s.email = l.email AND s.subscribed = 0
     WHERE l.status='approved' AND l.email IS NOT NULL AND s.email IS NULL
     ORDER BY l.id ASC LIMIT 1000");
if (!$leads) { echo "leads: none in sequence\n"; exit; }

$sent = 0; $failed = 0; $completed = 0;
foreach ($leads as $lead) {
    if ($sent >= $batch) break; // per-run cap
    $lid = (int)$lead["id"];
    $email = strtolower(trim((string)$lead["email"]));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) continue;

    // Steps already delivered to this lead + when the last one went.
    $sentNos = []; $lastSentAt = (string)$lead["created_at"];
    foreach (db_all($db, "SELECT step_no, sent_at FROM ego_campaign_sends WHERE lead_id=?", "i", $lid) as $sr) {
        $sentNos[(int)$sr["step_no"]] = true;
        if ((string)$sr["sent_at"] > $lastSentAt) $lastSentAt = (string)$sr["sent_at"];
    }
    // Next unsent step, in order.
    $next = null;
    foreach ($steps as $st) { if (!isset($sentNos[(int)$st["step_no"]])) { $next = $st; break; } }
    if ($next === null) { // whole sequence delivered
        db_exec($db, "UPDATE ego_leads SET status='emailed', emailed_at=NOW() WHERE id=?", "i", $lid);
        $completed++; continue;
    }
    // Due only once the step's delay has passed since the previous touch (or approval).
    if (time() < strtotime($lastSentAt) + ((int)$next["delay_days"]) * 86400) continue;

    if ($sent + $failed > 0) usleep(120000); // ~8/sec — don't saturate the SMTP relay
    $name = trim((string)($lead["name"] ?? "")) ?: trim((string)($lead["company"] ?? ""));
    $first = $name !== "" ? (preg_split('/\s+/', $name)[0] ?? "") : "";
    // company_name = the LEAD's business (personalises {{company}}/{{agency_name}}); sender = us.
    $ctx = ["first_name" => $first !== "" ? $first : "there", "name" => $name,
            "sender_name" => $coNamePlain, "company_name" => trim((string)($lead["company"] ?? "")),
            "website" => trim((string)($lead["website"] ?? ""))];
    $subjR = ego_merge_tokens((string)$next["subject"], $ctx);
    $bodyR = ego_merge_tokens((string)$next["body"], $ctx);
    $img = trim((string)($next["image_url"] ?? ""));
    $imgHtml = ($img !== "" && filter_var($img, FILTER_VALIDATE_URL))
        ? "<img src='" . htmlspecialchars($img) . "' alt='' style='display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:0 0 18px'>"
        : "";
    $link = htmlspecialchars($unsubBase . "?e=" . rawurlencode($email) . "&t=" . ego_unsub_token($email));
    $foot = "<p style='margin:18px 0 0;color:#9ca3af;font-size:12px'>You're receiving this from $coName. "
        . "<a href='$link' style='color:#9ca3af'>Unsubscribe</a>.</p>";
    $html = ego_email_shell($db, "", $imgHtml . nl2br(htmlspecialchars($bodyR)) . $foot);
    try {
        ego_send_mail($db, $email, $name ?: null, $subjR, $html);
        db_exec($db, "INSERT IGNORE INTO ego_campaign_sends (lead_id, step_no) VALUES (?,?)", "ii", $lid, (int)$next["step_no"]);
        db_exec($db, "INSERT INTO ego_messages (direction,channel,to_email,subject,body,status) VALUES ('outbound','campaign',?,?,?, 'sent')", "sss", $email, $subjR, $bodyR);
        if ((int)$next["step_no"] === $lastStepNo) { db_exec($db, "UPDATE ego_leads SET status='emailed', emailed_at=NOW() WHERE id=?", "i", $lid); $completed++; }
        $sent++;
    } catch (Throwable $e) { $failed++; }
}
echo "leads sequence: $sent sent, $failed failed, $completed completed\n";
