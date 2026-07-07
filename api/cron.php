<?php
/**
 * EGO LIMITED — daily cron (CLI). Generates due recurring jobs and emails
 * reminders for overdue invoices (throttled to once / 6 days). No HTTP/auth —
 * runs as the DB user. Schedule in cPanel:  php /home/.../egolimited.com/api/cron.php
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
require __DIR__ . "/lib/invoicing.php";
require __DIR__ . "/lib/mailer.php";
require __DIR__ . "/lib/inbox.php";

// 0) pull inbound email (IMAP works from CLI; web outbound is blocked on this host)
try { echo "inbox: " . inbox_sync($db) . " new\n"; } catch (Throwable $e) { echo "inbox: " . $e->getMessage() . "\n"; }

// 1) recurring jobs due today
$due = db_all($db, "SELECT * FROM ego_recurring_plans WHERE active=1 AND next_due <= CURDATE()");
$made = 0;
foreach ($due as $p) {
    $db->begin_transaction();
    try {
        $cid = (int)$p["customer_id"];
        $ref = next_job_reference($db, $cid);
        $quote = $p["quoted_amount"] !== null ? (float)$p["quoted_amount"] : null;
        db_exec($db, "INSERT INTO ego_jobs (reference,customer_id,title,description,priority,status,quoted_amount) VALUES (?,?,?,?,?, 'new', ?)",
            "sisssd", $ref, $cid, $p["title"], $p["description"], $p["priority"], $quote);
        $jid = (int)$db->insert_id;
        db_exec($db, "INSERT INTO ego_activity_log (job_id,action,detail) VALUES (?,?,?)", "iss", $jid, "created", json_encode(["reference" => $ref, "recurring" => true]));
        $unit = ["day" => "DAY", "week" => "WEEK", "month" => "MONTH"][$p["interval_unit"]] ?? "MONTH";
        db_exec($db, "UPDATE ego_recurring_plans SET next_due = DATE_ADD(next_due, INTERVAL ? $unit), last_generated=NOW() WHERE id=?", "ii", (int)$p["interval_count"], (int)$p["id"]);
        $db->commit(); $made++;
    } catch (Throwable $e) { $db->rollback(); }
}
echo "recurring: $made job(s) created\n";

// 2) overdue invoice reminders (throttle 6 days)
$co = db_one($db, "SELECT * FROM ego_company_settings ORDER BY id LIMIT 1");
$overdue = db_all($db,
    "SELECT i.*, c.name AS customer_name, c.email AS customer_email
     FROM ego_invoices i JOIN ego_customers c ON c.id=i.customer_id
     WHERE i.deleted_at IS NULL AND i.kind='invoice' AND i.status='sent' AND i.due_date < CURDATE()
       AND (i.reminded_at IS NULL OR i.reminded_at < DATE_SUB(NOW(), INTERVAL 6 DAY))");
$sent = 0;
foreach ($overdue as $inv) {
    if (!filter_var($inv["customer_email"] ?? "", FILTER_VALIDATE_EMAIL)) continue;
    try {
        $remHtml = render_invoice_email($inv, $co);
        $remSubject = "Payment reminder: " . ($inv["number"] ?? $inv["payment_reference"]);
        ego_send_mail($db, $inv["customer_email"], $inv["customer_name"], $remSubject, $remHtml);
        ego_record_sent($db, (int)$inv["customer_id"], (int)$inv["job_id"], $inv["customer_email"], $remSubject, $remHtml); // → Sent folder
        db_exec($db, "UPDATE ego_invoices SET reminded_at=NOW() WHERE id=?", "i", (int)$inv["id"]);
        $sent++;
    } catch (Throwable $e) { /* skip — SMTP may be unset */ }
}
echo "reminders: $sent sent\n";

// 3) task board housekeeping: archive cards that have sat in Done for > 3 days
$db->query("ALTER TABLE ego_tasks ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL"); // self-heal
$db->query("ALTER TABLE ego_tasks ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL");
db_exec($db, "UPDATE ego_tasks SET completed_at=NOW() WHERE status IN ('done','complete') AND completed_at IS NULL AND archived_at IS NULL");
$db->query("UPDATE ego_tasks SET archived_at=NOW() WHERE archived_at IS NULL AND status IN ('done','complete') AND completed_at IS NOT NULL AND completed_at < DATE_SUB(NOW(), INTERVAL 3 DAY)");
echo "tasks archived: " . $db->affected_rows . "\n";

// 4) SLA escalation: email the office a digest of jobs that have breached their
//    resolution target and are STILL open. Throttled to once per day.
@$db->query("ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS sla_urgent_hours INT NOT NULL DEFAULT 24");
@$db->query("ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS sla_normal_hours INT NOT NULL DEFAULT 72");
@$db->query("ALTER TABLE ego_company_settings ADD COLUMN IF NOT EXISTS sla_low_hours    INT NOT NULL DEFAULT 168");
$slaCfg = db_one($db, "SELECT sla_urgent_hours,sla_normal_hours,sla_low_hours FROM ego_company_settings ORDER BY id LIMIT 1") ?: [];
$slaHrs = [
    "urgent" => (int) ($slaCfg["sla_urgent_hours"] ?? 24) ?: 24,
    "normal" => (int) ($slaCfg["sla_normal_hours"] ?? 72) ?: 72,
    "low"    => (int) ($slaCfg["sla_low_hours"] ?? 168) ?: 168,
];
$breached = [];
foreach (db_all($db, "SELECT j.reference,j.title,j.priority,j.status,j.created_at,c.name AS customer_name
                      FROM ego_jobs j JOIN ego_customers c ON c.id=j.customer_id
                      WHERE j.deleted_at IS NULL AND j.status NOT IN ('completed','invoiced','paid','closed','cancelled')") as $j) {
    $h = $slaHrs[$j["priority"]] ?? $slaHrs["normal"];
    if (strtotime($j["created_at"]) + $h * 3600 < time()) $breached[] = $j;
}
$today = date("Y-m-d");
$slaTo = ($co["notify_email"] ?? "") ?: ($co["email"] ?? "");
if ($breached && integ($db, "sla_escalation_last") !== $today && filter_var($slaTo, FILTER_VALIDATE_EMAIL)) {
    $rows = "";
    foreach ($breached as $j) {
        $over = floor((time() - strtotime($j["created_at"]) - ($slaHrs[$j["priority"]] ?? $slaHrs["normal"]) * 3600) / 3600);
        $rows .= "<tr><td style='padding:6px 10px;border-bottom:1px solid #eee'><b>" . htmlspecialchars($j["reference"]) . "</b> · " . htmlspecialchars($j["title"])
              . "</td><td style='padding:6px 10px;border-bottom:1px solid #eee'>" . htmlspecialchars($j["customer_name"])
              . "</td><td style='padding:6px 10px;border-bottom:1px solid #eee'>" . htmlspecialchars(ucfirst($j["priority"]))
              . "</td><td style='padding:6px 10px;border-bottom:1px solid #eee;color:#b91c1c'>" . (int)$over . "h over</td></tr>";
    }
    $n = count($breached);
    $html = "<div style='font-family:Arial,sans-serif;font-size:14px;color:#222'>"
          . "<p>" . $n . " job" . ($n === 1 ? "" : "s") . " " . ($n === 1 ? "has" : "have") . " breached the SLA resolution target and " . ($n === 1 ? "is" : "are") . " still open:</p>"
          . "<table style='border-collapse:collapse;width:100%'><tr style='text-align:left;color:#666'>"
          . "<th style='padding:6px 10px'>Job</th><th style='padding:6px 10px'>Customer</th><th style='padding:6px 10px'>Priority</th><th style='padding:6px 10px'>Over</th></tr>"
          . $rows . "</table><p style='color:#666'>Review these in EGO → Jobs. Targets: urgent {$slaHrs['urgent']}h · normal {$slaHrs['normal']}h · low {$slaHrs['low']}h.</p></div>";
    try {
        ego_send_mail($db, $slaTo, $co["company_name"] ?? "EGO LIMITED", "SLA alert: $n job(s) past target", $html);
        db_exec($db, "INSERT INTO ego_integrations (k,v) VALUES ('sla_escalation_last',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", "s", $today);
        echo "sla escalation: $n breached, emailed\n";
    } catch (Throwable $e) { echo "sla escalation: " . $e->getMessage() . "\n"; }
} else {
    echo "sla escalation: " . count($breached) . " breached (no email)\n";
}
