<?php
/**
 * EGO LIMITED — Contracts Finder feed. CLI only. Cron: once a day, early.
 *   15 6 * * *  php ~/egolimited.com/api/tenders_cron.php
 *
 * Pulls the last 3 days of public-sector notices and keeps the ones EGO could plausibly do.
 *
 * The window OVERLAPS on purpose. A daily job that asks for exactly one day of notices loses
 * anything published in the seconds between runs, or on any day the cron does not fire — and a
 * missed tender is not recoverable, it just closes. Ingest is idempotent by ocid, so the overlap
 * costs nothing but a few hundred rows read.
 *
 * Sends NO email and makes NO decision, like every other automation here. It fills a list a human
 * reads. Bidding for public work is a judgement call about capacity and margin, and no cron has an
 * opinion about either.
 */
declare(strict_types=1);

if (PHP_SAPI !== "cli") { http_response_code(404); exit; }

$cfg = require __DIR__ . "/config.php";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");
$db->query("SET time_zone = '+01:00'");

require_once __DIR__ . "/lib/db.php";
require_once __DIR__ . "/lib/tenders.php";

try {
    $r = tender_sync($db, 3);
} catch (Throwable $e) {
    // A cron that dies silently is a feed that quietly stops finding work, and nobody notices until
    // someone asks why there are no tenders this month.
    error_log("[tenders_cron] " . get_class($e) . ": " . $e->getMessage());
    fwrite(STDERR, date("c") . " tender sync FAILED: " . $e->getMessage() . PHP_EOL);
    exit(1);
}

// Prune notices nobody triaged that have now closed. Keep anything a human touched — a rejected or
// bid tender is a record of a decision, and the value of "we looked at this and said no" is that
// you do not spend an afternoon looking at it again next year.
$st = db_exec($db, "DELETE FROM ego_tenders
                    WHERE status='new' AND deadline_at IS NOT NULL AND deadline_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
$pruned = $st->affected_rows;

echo date("c") . " tenders: seen {$r['seen']} · matched {$r['matched']} · new {$r['added']} · pages {$r['pages']} · pruned {$pruned}" . PHP_EOL;
