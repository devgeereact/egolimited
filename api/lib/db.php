<?php
/**
 * EGO LIMITED — the mysqli helpers.
 *
 * These lived inside index.php and were then RE-DECLARED, verbatim, in cron.php and
 * campaign_cron.php, because a CLI script can't include the front controller. Three copies of the
 * only three functions that touch the database is exactly the kind of duplication that ends with
 * one copy quietly drifting. One definition now; everything includes it.
 *
 * Prepared statements only — no exceptions, anywhere. That discipline is why this codebase has no
 * SQL injection surface, and it is not negotiable.
 */
declare(strict_types=1);

if (!function_exists("db_one")) {
    /** One row, or null. */
    function db_one(mysqli $db, string $sql, string $types = "", ...$args): ?array {
        $st = $db->prepare($sql);
        if ($types) $st->bind_param($types, ...$args);
        $st->execute();
        $r = $st->get_result()->fetch_assoc();
        return $r ?: null;
    }

    /** All rows. */
    function db_all(mysqli $db, string $sql, string $types = "", ...$args): array {
        $st = $db->prepare($sql);
        if ($types) $st->bind_param($types, ...$args);
        $st->execute();
        return $st->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    /**
     * Execute a write. Returns the STATEMENT — read `->affected_rows` from it, never from the
     * connection: $db->affected_rows does not reliably reflect a prepared execute, and reading it
     * from the connection is what made op_claim() report "duplicate" on its very first call and
     * silently discard every engineer write (2026-07-13).
     */
    function db_exec(mysqli $db, string $sql, string $types = "", ...$args): mysqli_stmt {
        $st = $db->prepare($sql);
        if ($types) $st->bind_param($types, ...$args);
        $st->execute();
        return $st;
    }
}

if (!function_exists("integ")) {
    /** Read one integration value (server-side only). Also duplicated in both crons, historically. */
    function integ(mysqli $db, string $key): ?string {
        $r = db_one($db, "SELECT v FROM ego_integrations WHERE k=?", "s", $key);
        return ($r && $r["v"] !== null && $r["v"] !== "") ? $r["v"] : null;
    }
}
