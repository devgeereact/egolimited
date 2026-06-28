<?php
/**
 * EGO LIMITED — Job status state machine (single source of truth, server side).
 * Mirrors docs/02-WORKFLOWS §2. The SPA has a TS mirror (app/src/lib/jobStatus.ts);
 * keep the two in sync.
 */
declare(strict_types=1);

const JOB_TRANSITIONS = [
    "new"       => ["scheduled", "cancelled"],
    "scheduled" => ["en_route", "cancelled", "new"],
    "en_route"  => ["on_site", "cancelled"],
    "on_site"   => ["completed", "on_hold"],
    "on_hold"   => ["scheduled", "on_site", "cancelled"],
    "completed" => ["invoiced"],
    "invoiced"  => ["paid", "completed"],
    "paid"      => ["closed"],
    "closed"    => [],
    "cancelled" => [],
];

// Engineers may only walk the field chain (+ on_hold). Admin may make any valid transition.
const ENGINEER_ALLOWED = [
    "scheduled|en_route",
    "en_route|on_site",
    "on_site|completed",
    "on_site|on_hold",
    "on_hold|on_site",
];

function job_status_exists(string $s): bool {
    return array_key_exists($s, JOB_TRANSITIONS);
}

function job_can_transition(string $from, string $to, string $role): bool {
    if (!job_status_exists($from) || !job_status_exists($to)) return false;
    if (!in_array($to, JOB_TRANSITIONS[$from], true)) return false;
    // Engineers may only walk the field chain (+ on_hold).
    if ($role === "engineer") return in_array("$from|$to", ENGINEER_ALLOWED, true);
    // Office-class staff (office/manager/founder, legacy "admin"): any valid transition.
    // Anything else (unknown/empty role) is denied.
    return $role !== "";
}
