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
