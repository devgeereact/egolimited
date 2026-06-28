<?php
/**
 * EGO LIMITED — one-off migration to the per-customer reference scheme.
 *   - backfill ego_customers.ref_code (6-char from name+phone+postcode)
 *   - rewrite job references  -> CODE-J#
 *   - rewrite invoice/quote numbers -> CODE-I# / CODE-Q#
 *   - sync invoices.payment_reference to the job's new reference
 * Safe to run more than once.  Run on server: php migrate.php
 */
declare(strict_types=1);
$cfg = require __DIR__ . "/config.php";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");

function db_one(mysqli $db, string $sql, string $types = "", ...$args): ?array {
    $st = $db->prepare($sql); if ($types) $st->bind_param($types, ...$args); $st->execute();
    $r = $st->get_result(); return $r ? ($r->fetch_assoc() ?: null) : null;
}
function db_all(mysqli $db, string $sql, string $types = "", ...$args): array {
    $st = $db->prepare($sql); if ($types) $st->bind_param($types, ...$args); $st->execute();
    $r = $st->get_result(); return $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
}
function db_exec(mysqli $db, string $sql, string $types = "", ...$args): void {
    $st = $db->prepare($sql); if ($types) $st->bind_param($types, ...$args); $st->execute();
}
require __DIR__ . "/lib/invoicing.php";

// 1) codes
foreach (db_all($db, "SELECT id FROM ego_customers WHERE (ref_code IS NULL OR ref_code='') AND deleted_at IS NULL") as $c) {
    echo "code " . ensure_customer_code($db, (int)$c["id"]) . "\n";
}

// 2) job references (per customer, by id order)
$seq = [];
foreach (db_all($db, "SELECT id,customer_id,reference FROM ego_jobs ORDER BY customer_id,id") as $j) {
    $cid = (int)$j["customer_id"];
    $code = db_one($db, "SELECT ref_code FROM ego_customers WHERE id=?", "i", $cid)["ref_code"];
    $seq[$cid] = ($seq[$cid] ?? 0) + 1;
    $newRef = "$code-J{$seq[$cid]}";
    if ($j["reference"] !== $newRef) {
        db_exec($db, "UPDATE ego_jobs SET reference=? WHERE id=?", "si", $newRef, (int)$j["id"]);
        db_exec($db, "UPDATE ego_invoices SET payment_reference=? WHERE job_id=?", "si", $newRef, (int)$j["id"]);
        echo "job {$j['reference']} -> $newRef\n";
    }
}

// 3) invoice/quote numbers (sent ones), per customer per kind
$iseq = [];
foreach (db_all($db, "SELECT id,customer_id,kind,number FROM ego_invoices WHERE number IS NOT NULL ORDER BY customer_id,kind,id") as $iv) {
    $cid = (int)$iv["customer_id"]; $kind = $iv["kind"]; $key = "$cid|$kind";
    $code = db_one($db, "SELECT ref_code FROM ego_customers WHERE id=?", "i", $cid)["ref_code"];
    $iseq[$key] = ($iseq[$key] ?? 0) + 1;
    $newNum = "$code-" . ($kind === "quote" ? "Q" : "I") . $iseq[$key];
    if ($iv["number"] !== $newNum) {
        db_exec($db, "UPDATE ego_invoices SET number=? WHERE id=?", "si", $newNum, (int)$iv["id"]);
        echo "doc {$iv['number']} -> $newNum\n";
    }
}
echo "migration done\n";
