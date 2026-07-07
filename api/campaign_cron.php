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
$subject = trim((string)($auto["subject"] ?? ""));
$bodyTxt = trim((string)($auto["body"] ?? ""));
if ($subject === "" || $bodyTxt === "") { echo "automation: no message configured\n"; exit; }
$batch = max(1, min(100, (int)($auto["batch_size"] ?? 25)));

$leads = db_all($db,
    "SELECT l.* FROM ego_leads l
     LEFT JOIN ego_subscribers s ON s.email = l.email AND s.subscribed = 0
     WHERE l.status='approved' AND l.email IS NOT NULL AND s.email IS NULL
     ORDER BY l.id ASC LIMIT ?", "i", $batch);
if (!$leads) { echo "leads: none waiting\n"; exit; } // nothing new — never re-sends to the same batch

$co = db_one($db, "SELECT company_name FROM ego_company_settings ORDER BY id LIMIT 1");
$coNamePlain = ($co["company_name"] ?? "") ?: "EGO LIMITED";
$coName = htmlspecialchars($coNamePlain);
$img = trim((string)($auto["image_url"] ?? ""));
$imgHtml = ($img !== "" && filter_var($img, FILTER_VALIDATE_URL))
    ? "<img src='" . htmlspecialchars($img) . "' alt='' style='display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:0 0 18px'>"
    : "";
$unsubBase = "https://egolimited.com/api/unsubscribe";

$sent = 0; $failed = 0;
foreach ($leads as $lead) {
    $email = strtolower(trim((string)$lead["email"]));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) continue;
    if ($sent + $failed > 0) usleep(120000); // ~8/sec — don't saturate the SMTP relay
    $name = trim((string)($lead["name"] ?? "")) ?: trim((string)($lead["company"] ?? ""));
    $first = $name !== "" ? (preg_split('/\s+/', $name)[0] ?? "") : "";
    // company_name = the LEAD's business (personalises {{company}}/{{agency_name}}); sender = us.
    $ctx = ["first_name" => $first !== "" ? $first : "there", "name" => $name,
            "sender_name" => $coNamePlain, "company_name" => trim((string)($lead["company"] ?? "")),
            "website" => trim((string)($lead["website"] ?? ""))];
    $subjR = ego_merge_tokens($subject, $ctx);
    $bodyR = ego_merge_tokens($bodyTxt, $ctx);
    $link = htmlspecialchars($unsubBase . "?e=" . rawurlencode($email) . "&t=" . ego_unsub_token($email));
    $foot = "<p style='margin:18px 0 0;color:#9ca3af;font-size:12px'>You're receiving this from $coName. "
        . "<a href='$link' style='color:#9ca3af'>Unsubscribe</a>.</p>";
    $html = ego_email_shell($db, "", $imgHtml . nl2br(htmlspecialchars($bodyR)) . $foot);
    try {
        ego_send_mail($db, $email, $name ?: null, $subjR, $html);
        db_exec($db, "INSERT INTO ego_messages (direction,channel,to_email,subject,body,status) VALUES ('outbound','campaign',?,?,?, 'sent')", "sss", $email, $subjR, $bodyR);
        db_exec($db, "UPDATE ego_leads SET status='emailed', emailed_at=NOW() WHERE id=?", "i", (int)$lead["id"]);
        $sent++;
    } catch (Throwable $e) { $failed++; }
}
echo "leads campaign: $sent sent, $failed failed (batch of " . count($leads) . ")\n";
