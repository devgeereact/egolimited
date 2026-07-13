<?php
/**
 * EGO LIMITED — campaign worker. CLI only.
 * Cron: every 15 minutes on weekday working hours —
 *   [slash]15 8-17 * * 1-5   php ~/egolimited.com/api/campaign_worker.php
 * (the script gates itself on business hours anyway, so a wider cron window is harmless).
 *
 * Replaces campaign_cron.php. The important difference is not the schedule, it's the shape:
 *
 *   v1 sent inside the HTTP request, opening a fresh TCP + TLS + AUTH handshake per recipient with a
 *   120ms sleep between each. A large send therefore ran for minutes, exceeded PHP's
 *   max_execution_time, and died mid-list — leaving NO record of where it stopped. Re-running it
 *   re-emailed everyone it had already reached.
 *
 *   v2 drains a queue. Sends are rows. If this process is killed at any point, the undrained rows
 *   are simply still 'queued' and the next run picks up exactly where it left off. Nothing is sent
 *   twice, because a row is claimed atomically before it goes out and UNIQUE(enrollment_id, step_no)
 *   makes a duplicate physically impossible.
 */
declare(strict_types=1);

if (PHP_SAPI !== "cli") { http_response_code(404); exit; }

$cfg = require __DIR__ . "/config.php";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");
$db->query("SET time_zone = '+01:00'");

require_once __DIR__ . "/lib/db.php";
require_once __DIR__ . "/lib/mailer.php";
require_once __DIR__ . "/lib/campaigns.php";

function wlog(string $m): void { echo date("c") . " " . $m . PHP_EOL; }

/* ---- is this a sensible moment to email a business? ----
 * `--force` bypasses the gate for a deliberate manual run or an end-to-end test. It is a CLI flag
 * rather than an env var precisely so it cannot be left switched on by accident in production. */
$force = in_array("--force", $argv ?? [], true);
$closed = camp_closed_reason();
if ($closed !== null && !$force) { wlog("skip: $closed"); exit; }
if ($closed !== null) wlog("note: {$closed} — sending anyway (--force)");

$BATCH = 40; // per run. 15-min cron => ~160/hour, which is a sane sending reputation.

/* ---- 1. queue whatever is due, for every active campaign ---- */
$active = db_all($db, "SELECT id, name FROM ego_campaigns WHERE status='active' AND deleted_at IS NULL");
$queued = 0;
foreach ($active as $c) {
    $n = camp_queue_due($db, (int)$c["id"]);
    $queued += $n;
    if ($n) wlog("queued {$n} send(s) for campaign #{$c['id']} ({$c['name']})");
}

/* ---- 2. drain the queue ---- */
$rows = db_all($db,
    "SELECT s.id, s.campaign_id, s.enrollment_id, s.step_no, s.email,
            e.name, e.company, e.website, e.lead_id,
            st.subject, st.body, st.image_url,
            c.from_name, c.from_email, c.name AS campaign_name
     FROM ego_campaign_sends_v2 s
     JOIN ego_campaign_enrollments e ON e.id = s.enrollment_id
     JOIN ego_campaigns c ON c.id = s.campaign_id
     JOIN ego_campaign_steps_v2 st ON st.campaign_id = s.campaign_id AND st.step_no = s.step_no
     WHERE s.status='queued' AND c.status='active' AND e.state='active'
     ORDER BY s.queued_at
     LIMIT ?", "i", $BATCH);

if (!$rows) { wlog("nothing due (queued {$queued})"); exit; }

$sent = 0; $failed = 0; $skipped = 0;
foreach ($rows as $r) {
    $sendId = (int)$r["id"];

    // Claim the row. If another worker (an overlapping cron run) got there first, affected_rows is
    // 0 and we leave it alone — this is what makes concurrent runs safe.
    $claim = db_exec($db, "UPDATE ego_campaign_sends_v2 SET status='sending' WHERE id=? AND status='queued'", "i", $sendId);
    if ($claim->affected_rows === 0) continue;

    // Last-moment suppression check: they may have unsubscribed since this was queued.
    if (supp_has($db, $r["email"])) {
        db_exec($db, "UPDATE ego_campaign_sends_v2 SET status='skipped', error='suppressed' WHERE id=?", "i", $sendId);
        camp_stop_email($db, $r["email"], "unsubscribed", "suppressed before send");
        $skipped++;
        continue;
    }

    try {
        $rendered = camp_render($db, $r, (string)$r["subject"], (string)$r["body"]);
        $html = camp_email_html($db, nl2br(htmlspecialchars($rendered["body"])), $r["email"], $r["image_url"] ?: null);

        // ego_send_mail_checked, NOT ego_send_mail: the latter swallows an SMTP failure and silently
        // falls back to local sendmail, so a broken relay would look like a successful campaign.
        $ok = ego_send_mail_checked($db, $r["email"], $r["name"] ?: null, $rendered["subject"], $html);
        if (!$ok) throw new RuntimeException("mail rejected");

        // Log it in the shared Inbox so the office sees what went out, and a reply threads back.
        ego_record_sent($db, null, null, $r["email"], $rendered["subject"], $html);

        db_exec($db, "UPDATE ego_campaign_sends_v2 SET status='sent', sent_at=NOW() WHERE id=?", "i", $sendId);

        // Advance the cursor and schedule the next touch — measured from THIS send, not from when
        // the lead was scraped.
        $next = db_one($db,
            "SELECT delay_days FROM ego_campaign_steps_v2 WHERE campaign_id=? AND step_no=?",
            "ii", (int)$r["campaign_id"], (int)$r["step_no"] + 1);
        if ($next) {
            db_exec($db,
                "UPDATE ego_campaign_enrollments
                 SET current_step=?, next_due_at = DATE_ADD(NOW(), INTERVAL ? DAY)
                 WHERE id=?",
                "iii", (int)$r["step_no"], (int)$next["delay_days"], (int)$r["enrollment_id"]);
        } else {
            db_exec($db,
                "UPDATE ego_campaign_enrollments SET current_step=?, state='completed', next_due_at=NULL WHERE id=?",
                "ii", (int)$r["step_no"], (int)$r["enrollment_id"]);
        }
        $sent++;
        usleep(150000); // gentle on the relay; the connection itself is reused inside ego_send_mail
    } catch (Throwable $e) {
        db_exec($db, "UPDATE ego_campaign_sends_v2 SET status='failed', error=? WHERE id=?",
            "si", substr($e->getMessage(), 0, 250), $sendId);
        error_log("[ego campaign] send {$sendId} failed: " . $e->getMessage());
        $failed++;
    }
}

/* ---- 3. a campaign with nobody left to email is finished ---- */
foreach ($active as $c) {
    $left = db_one($db,
        "SELECT COUNT(*) c FROM ego_campaign_enrollments WHERE campaign_id=? AND state='active'",
        "i", (int)$c["id"]);
    if ((int)($left["c"] ?? 0) === 0) {
        db_exec($db, "UPDATE ego_campaigns SET status='completed' WHERE id=? AND status='active'", "i", (int)$c["id"]);
        wlog("campaign #{$c['id']} completed");
    }
}

wlog("queued {$queued} · sent {$sent} · skipped {$skipped} · failed {$failed}");
