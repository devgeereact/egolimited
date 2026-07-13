<?php
/**
 * EGO LIMITED — leads become contacts. One-shot, idempotent, CLI-only.
 *   Run: php api/migrate_pipeline.php
 *
 * ego_leads is KEPT (read-only) for one release, so this is reversible — the same discipline used
 * for the procurement tables. Deleting code is reversible; dropping a table is not.
 *
 * The dangerous case, handled first: a lead who is ALREADY a customer. Creating a second record for
 * them would be the exact disease this migration exists to cure, so we merge into the existing one
 * and never insert.
 */
declare(strict_types=1);
if (PHP_SAPI !== "cli") { http_response_code(404); exit; }

$cfg = require __DIR__ . "/config.php";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");

require_once __DIR__ . "/lib/db.php";
require_once __DIR__ . "/lib/pipeline.php";

$moved = 0; $merged = 0; $repointed = 0; $staged = 0;

foreach (db_all($db, "SELECT * FROM ego_leads WHERE email IS NOT NULL AND email <> ''") as $l) {
    $email = strtolower(trim((string) $l["email"]));
    $existing = db_one($db, "SELECT id FROM ego_customers WHERE LOWER(email)=? AND deleted_at IS NULL", "s", $email);

    if ($existing) {
        // Already a business we know. Do NOT duplicate them.
        $merged++;
        continue;
    }

    $name = trim((string) (($l["company"] ?? "") ?: ($l["name"] ?? "") ?: $email));
    db_exec($db,
        "INSERT INTO ego_customers (name, company, email, website, notes, stage, source, last_activity_at)
         VALUES (?,?,?,?,?, 'prospect', 'cold', NOW())",
        "sssss", $name, $l["company"], $email, $l["website"], $l["note"]);
    $cid = (int) $db->insert_id;
    contact_log($db, $cid, "note", "Imported from leads (was: " . (string) ($l["status"] ?? "found") . ")");
    $moved++;
}

// Campaign enrolments follow the person by EMAIL — same address, same history, no orphans. lead_id
// is cleared because ego_leads is about to stop being the source of truth about who someone is.
foreach (db_all($db, "SELECT DISTINCT email FROM ego_campaign_enrollments WHERE lead_id IS NOT NULL") as $e) {
    $st = db_exec($db, "UPDATE ego_campaign_enrollments SET lead_id=NULL WHERE LOWER(email)=?", "s", strtolower((string) $e["email"]));
    $repointed += $st->affected_rows;
}

// Every contact's stage, derived from facts. Nothing is hand-classified — that is the whole point.
foreach (db_all($db, "SELECT id FROM ego_customers WHERE deleted_at IS NULL") as $c) {
    stage_recompute($db, (int) $c["id"]);
    $staged++;
}

echo "moved {$moved} · merged into existing {$merged} · enrolments repointed {$repointed} · stages derived {$staged}" . PHP_EOL;
