<?php
/**
 * EGO LIMITED — pipeline automations. CLI only. Cron: hourly.
 *   0 * * * *  php ~/egolimited.com/api/pipeline_cron.php
 *
 * THE GOVERNING RULE: automation DRAFTS and PROMPTS; a human SENDS and DECIDES.
 *
 * Nothing in this file emails a customer or a prospect. It moves stages, raises deadlines, and puts
 * work in front of a person. The one approved automatic send in the whole system — the enquiry
 * acknowledgement — happens in POST /enquiry at the moment of the enquiry, because an
 * acknowledgement sent an hour later is not an acknowledgement.
 *
 * The work this saves is the WRITING and the REMEMBERING. Not the judgement. A quote chase in the
 * wrong tone loses the job, and no cron knows the tone.
 */
declare(strict_types=1);

if (PHP_SAPI !== "cli") { http_response_code(404); exit; }

$cfg = require __DIR__ . "/config.php";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");
$db->query("SET time_zone = '+01:00'");

require_once __DIR__ . "/lib/db.php";
require_once __DIR__ . "/lib/pipeline.php";

$restaged = 0; $chased = 0; $dormant = 0; $escalated = 0;

/* ---- 1. Re-derive every stage ----------------------------------------------------------------
 * Cheap, and it means the board can never drift from the facts even if an event was missed. This
 * is the difference between a board you trust and a board you have to double-check. */
foreach (db_all($db, "SELECT id FROM ego_customers WHERE deleted_at IS NULL AND stage_locked = 0") as $c) {
    stage_recompute($db, (int) $c["id"]);
    $restaged++;
}

/* ---- 2. Quote sent, no answer ----------------------------------------------------------------
 * The most expensive leak in a maintenance firm: you quote £2,400, hear nothing, and the job goes
 * to whoever bothered to chase. We do NOT send the chase — we put it in front of a human. */
foreach (db_all($db,
    "SELECT i.id, i.number, i.total, i.sent_at, i.customer_id, c.name
     FROM ego_invoices i
     JOIN ego_customers c ON c.id = i.customer_id
     WHERE i.kind = 'quote' AND i.status = 'sent' AND i.deleted_at IS NULL
       AND i.sent_at IS NOT NULL
       AND i.sent_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
       AND c.deleted_at IS NULL
       AND (c.next_action_at IS NULL OR c.next_action_at > NOW())
       AND NOT EXISTS (
            SELECT 1 FROM ego_contact_events e
            WHERE e.customer_id = c.id AND e.kind = 'quote_chase'
              AND e.created_at > DATE_SUB(NOW(), INTERVAL 3 DAY)
       )") as $q) {
    $cid  = (int) $q["customer_id"];
    $days = (int) floor((time() - strtotime((string) $q["sent_at"])) / 86400);
    db_exec($db, "UPDATE ego_customers SET next_action_at = NOW() WHERE id = ?", "i", $cid);
    contact_log($db, $cid, "quote_chase",
        "Quote {$q['number']} (" . number_format((float) $q["total"], 2) . ") sent {$days} days ago — no answer. Chase it.");
    $chased++;
}

/* ---- 3. Enquiry not answered ------------------------------------------------------------------
 * The deadline has already passed (POST /enquiry set it to +1 hour). Escalate it so it stops being
 * one row among many and starts being somebody's problem. */
foreach (db_all($db,
    "SELECT id, name FROM ego_customers
     WHERE deleted_at IS NULL AND source = 'enquiry' AND owner_id IS NULL
       AND next_action_at IS NOT NULL
       AND next_action_at < DATE_SUB(NOW(), INTERVAL 3 HOUR)
       AND NOT EXISTS (
            SELECT 1 FROM ego_contact_events e
            WHERE e.customer_id = ego_customers.id AND e.kind = 'escalated'
       )") as $c) {
    contact_log($db, (int) $c["id"], "escalated", "Enquiry still unanswered after 3 hours — nobody has picked this up.");
    $escalated++;
}

/* ---- 4. Dormant customers ---------------------------------------------------------------------
 * The cheapest work EGO will ever win: they already trust us. Flagged once, not nagged. */
foreach (db_all($db,
    "SELECT id, name FROM ego_customers
     WHERE deleted_at IS NULL AND stage = 'dormant' AND stage_locked = 0
       AND NOT EXISTS (
            SELECT 1 FROM ego_contact_events e
            WHERE e.customer_id = ego_customers.id AND e.kind = 'dormant'
              AND e.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
       )") as $c) {
    contact_log($db, (int) $c["id"], "dormant", "Gone quiet for over a year. Worth an offer?");
    $dormant++;
}

echo date("c") . " restaged {$restaged} · quotes to chase {$chased} · enquiries escalated {$escalated} · dormant flagged {$dormant}" . PHP_EOL;
