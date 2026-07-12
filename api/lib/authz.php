<?php
/**
 * EGO LIMITED — the authorization manifest. ONE place that answers "who may call this route?"
 *
 * WHY THIS EXISTS
 * ---------------
 * Authorization used to be a `require_role()` line hand-copied into ~150 of 193 `case` blocks in
 * index.php. That worked — an audit on 2026-07-12 found every endpoint was in fact guarded — but
 * it is guarded *by convention*, and convention does not survive a hurried Friday. The 194th case
 * someone adds is the one that silently ships without a guard, and nothing in the code would say so.
 *
 * This table makes it structural. Every route MUST appear here, and the check runs in ONE place,
 * before the switch, in index.php. The design is FAIL-CLOSED: a route that is not listed is not
 * reachable at all (404). So the failure mode of forgetting an entry is "my new endpoint 404s and
 * I notice in ten seconds", not "my new endpoint is open to the internet and nobody notices".
 *
 * The per-case require_*() calls are deliberately KEPT. They are now defence in depth rather than
 * the only defence, and they still return the acting user, which the handlers need. A test
 * (api/tests/run.php) re-derives this table from index.php and fails if the two ever disagree —
 * so this file cannot silently rot out of sync with the code it guards.
 *
 * LEVELS
 *   public   — no auth. Either genuinely public (health, the enquiry form, the landing site's
 *              company/reviews data) or protected by a capability instead of a session: the
 *              tokenised customer /track links, and the HMAC-signed, time-limited photo and
 *              attachment URLs. "public" here means "no session required", NOT "unprotected".
 *   user     — any authenticated staff member, engineers included. Used where the row-level
 *              ownership check is what actually matters (an engineer may only touch THEIR job),
 *              and for self-service: own profile, own password, own 2FA, own notification prefs.
 *   office   — office staff and up. The back-office surface: customers, jobs, invoicing,
 *              procurement, compliance, inbox, campaigns. ("admin" is the legacy spelling of this
 *              rank inside require_role(); it means office-or-above, not a distinct role.)
 *   manager  — team management, deletions, reopening jobs, reversing a payment.
 *   founder  — company/bank/VAT config and the integration keys. Money and secrets.
 */
declare(strict_types=1);

const ROLE_PUBLIC = "public";
const ROLE_USER   = "user";

/* Role hierarchy: founder(4) > manager(3) > office/Employee-Admin(2) > engineer(1).
 * Lives here, not in index.php, so the access decision can be tested without booting the
 * front controller (which would connect to MySQL and try to route a request). */
const ROLE_RANK = ["engineer" => 1, "office" => 2, "manager" => 3, "founder" => 4];
function role_rank(?string $r): int { return ROLE_RANK[$r ?? ""] ?? 0; }

/** route ("METHOD /path") => minimum level required. See the level docs above. */
const ROUTE_ROLES = [
    // ---- public: no session required ----
    "GET /"                      => "public",
    "GET /health"                => "public",
    "POST /auth/login"           => "public",
    "POST /auth/logout"          => "public", // deletes the session identified by its own bearer token
    "POST /invite/accept"        => "public", // the one-time invite token IS the credential
    "POST /enquiry"              => "public", // website contact form (rate-limited, length-capped)
    // Customer portal: the per-job access token is the credential. No login exists for customers.
    "POST /track/lookup"         => "public",
    "GET /track"                 => "public",
    "GET /track/document"        => "public",
    "POST /track/review"         => "public",
    "POST /track/message"        => "public",
    "GET /unsubscribe"           => "public", // PECR: opt-out must work without an account
    "GET /public/company"        => "public", // landing site reads company details + reviews
    "GET /public/reviews"        => "public",
    // Capability URLs: HMAC-signed and time-limited, so they work in an <img> tag with no header.
    "GET /jobs/photo-file"       => "public",
    "GET /email/attachment-file" => "public",

    // ---- user: any authenticated staff member (engineers included) ----
    "GET /auth/me"               => "user",
    "POST /me/availability"      => "user",
    "POST /me/profile"           => "user",
    "POST /me/change-password"   => "user",
    "POST /me/totp/setup"        => "user",
    "POST /me/totp/enable"       => "user",
    "POST /me/totp/disable"      => "user",
    "GET /me/notify-prefs"       => "user",
    "POST /me/notify-prefs"      => "user",
    "GET /weather"               => "user",
    "GET /announcements"         => "user", // every staff member reads the noticeboard
    // The engineer's own working surface. Each of these enforces ROW-LEVEL ownership internally
    // (an engineer may only act on a job assigned to them) — that check, not the role, is the
    // real control here, which is why the level is "user" and not "engineer".
    "GET /me/jobs/today"         => "user",
    "GET /me/jobs"               => "user",
    "GET /me/jobs/get"           => "user",
    "GET /me/history"            => "user",
    "POST /me/note/ai"           => "user",
    "POST /jobs/status"          => "user", // job_can_transition() restricts engineers to the field chain
    "POST /jobs/note"            => "user",
    "POST /jobs/photo"           => "user",
    "POST /jobs/checklist/toggle" => "user",
    "POST /jobs/checklist/add"   => "user",

    // ---- office and up: the back office ----
    "GET /engineers"             => "office",
    "POST /engineers"            => "office",
    "POST /engineers/deactivate" => "office",
    "GET /customers"             => "office",
    "GET /customers/get"         => "office",
    "POST /customers"            => "office",
    "POST /customers/update"     => "office",
    "POST /customers/delete"     => "office",
    "GET /jobs"                  => "office",
    "GET /jobs/get"              => "office",
    "POST /jobs"                 => "office",
    "POST /jobs/update"          => "office",
    "POST /jobs/brief"           => "office",
    "POST /jobs/ai-brief"        => "office",
    "GET /schedule"              => "office",
    "POST /jobs/schedule"        => "office",
    "POST /jobs/assign-engineer" => "office",
    "POST /jobs/unschedule"      => "office",
    "GET /invoices"              => "office",
    "GET /invoices/get"          => "office",
    "POST /invoices"             => "office",
    "POST /invoices/update"      => "office",
    "POST /invoices/send"        => "office",
    "POST /invoices/void"        => "office",
    "POST /invoices/accept"      => "office",
    "POST /invoices/decline"     => "office",
    "POST /invoices/pay"         => "office",
    "POST /invoices/email"       => "office",
    "POST /invoices/remind"      => "office",
    "GET /dashboard"             => "office",
    "GET /analytics"             => "office",
    "GET /analytics/export"      => "office",
    "GET /notifications"         => "office",
    "POST /notifications/seen"   => "office",
    "GET /activity"              => "office",
    "GET /reviews"               => "office",
    "POST /reviews/add"          => "office",
    // Task board: an OFFICE tool. This was "user" until 2026-07-12, which let any authenticated
    // engineer read, reassign, move and DELETE office tasks by id — there is no ownership check
    // on these rows. The UI route was already office-gated; the API was not.
    "GET /tasks"                 => "office",
    "POST /tasks"                => "office",
    "POST /tasks/update"         => "office",
    "POST /tasks/assign"         => "office",
    "POST /tasks/move"           => "office",
    "POST /tasks/delete"         => "office",
    // Email / inbox
    "GET /email-templates"       => "office",
    "POST /email-templates"      => "office",
    "POST /email-templates/delete" => "office",
    "POST /inbox/sync"           => "office",
    "GET /inbox"                 => "office",
    "GET /inbox/get"             => "office",
    "POST /email/send"           => "office",
    "POST /email/draft"          => "office",
    "POST /email/compose"        => "office",
    "POST /messages/ack"         => "office",
    "POST /messages/reply"       => "office",
    "POST /messages/visibility"  => "office",
    "POST /messages/delete"      => "office",
    "POST /messages/archive"     => "office",
    "POST /messages/flag"        => "office",
    "POST /messages/bulk"        => "office",
    "POST /notes"                => "office",
    // AI drafting
    "POST /ai/draft"             => "office",
    "POST /ai/image"             => "office",
    "POST /tasks/draft"          => "office",
    "POST /incidents/polish"     => "office",
    "POST /subcontractors/draft" => "office", // AI notes drafter on the subcontractor record
    // Recurring / PPM
    "GET /recurring"             => "office",
    "POST /recurring"            => "office",
    "POST /recurring/delete"     => "office",
    "POST /recurring/generate"   => "office",
    // Procurement (Subcontractors only — Suppliers/Parts/Purchase Orders/Stock
    // Movements removed 2026-07-13: engineers buy parts from a merchant and hand
    // in a receipt, nobody raises POs or tracks stock. See schema.sql for the
    // retained-but-deprecated tables.)
    "GET /subcontractors"        => "office",
    "GET /subcontractors/get"    => "office",
    "POST /subcontractors"       => "office",
    "POST /subcontractors/update" => "office",
    "POST /subcontractors/delete" => "office",
    // Assets
    "GET /assets"                => "office",
    "GET /assets/get"            => "office",
    "POST /assets"               => "office",
    "POST /assets/update"        => "office",
    "POST /assets/delete"        => "office",
    "POST /assets/service"       => "office",
    // Contracts / PPM
    "GET /contracts"             => "office",
    "GET /contracts/get"         => "office",
    "POST /contracts"            => "office",
    "POST /contracts/update"     => "office",
    "POST /contracts/delete"     => "office",
    "POST /contracts/bill"       => "office",
    "POST /contracts/service-done" => "office",
    // Compliance
    "GET /rams"                  => "office",
    "GET /rams/get"              => "office",
    "POST /rams"                 => "office",
    "POST /rams/update"          => "office",
    "POST /rams/delete"          => "office",
    "GET /incidents"             => "office",
    "GET /incidents/get"         => "office",
    "POST /incidents"            => "office",
    "POST /incidents/update"     => "office",
    "POST /incidents/delete"     => "office",
    "GET /certificates"          => "office",
    "GET /certificates/get"      => "office",
    "POST /certificates"         => "office",
    "POST /certificates/update"  => "office",
    "POST /certificates/delete"  => "office",
    // Campaigns / leads (see the transformation review — this module is a removal candidate)
    "GET /subscribers"           => "office",
    "POST /subscribers"          => "office",
    "POST /subscribers/delete"   => "office",
    "POST /campaigns/draft"      => "office",
    "POST /campaigns/send"       => "office",
    "GET /campaigns/automation"  => "office",
    "POST /campaigns/automation" => "office",
    "POST /campaigns/steps"      => "office",
    "POST /campaigns/steps/delete" => "office",
    "POST /leads/search"         => "office",
    "GET /leads"                 => "office",
    "POST /leads/approve"        => "office",
    "POST /leads/reject"         => "office",
    "POST /leads/delete"         => "office",
    "POST /leads/draft"          => "office",
    "POST /leads/email"          => "office",

    // ---- manager and up: team, deletions, money reversals ----
    "GET /team"                  => "manager",
    "POST /team"                 => "manager",
    "POST /team/update"          => "manager",
    "POST /team/delete"          => "manager",
    "POST /team/force-password-change" => "manager",
    "GET /settings"              => "manager", // read-only for managers; POST is founder-only
    "GET /announcements/manage"  => "manager",
    "GET /announcements/get"     => "manager",
    "POST /announcements"        => "manager",
    "POST /announcements/update" => "manager",
    "POST /announcements/delete" => "manager",
    "POST /announcements/draft"  => "manager",
    "POST /jobs/reopen"          => "manager",
    "POST /jobs/delete"          => "manager",
    "POST /invoices/delete"      => "manager",
    "POST /invoices/unpay"       => "manager", // reverses a payment
    "POST /payments/delete"      => "manager", // soft-reverses a ledger row
    "POST /reviews/import-google" => "manager",

    // ---- founder only: company config, bank details, VAT, API keys ----
    "POST /settings"             => "founder",
    "GET /integrations"          => "founder",
    "POST /integrations"         => "founder",
];

/**
 * The level required for a route, or null if the route is not registered.
 * Null MUST be treated as "does not exist" by the caller — that is the fail-closed contract.
 */
function route_level(string $method, string $route): ?string {
    return ROUTE_ROLES["$method $route"] ?? null;
}

/**
 * Does this role satisfy this level? PURE — no DB, no request state — so the actual access
 * decision is unit-testable (api/tests/run.php) instead of only being observable in production.
 *
 * $role is null for an unauthenticated caller. Ranks come from ROLE_RANK in index.php:
 * founder(4) > manager(3) > office(2) > engineer(1); an unknown role ranks 0 and satisfies nothing.
 */
function level_satisfied_by(string $level, ?string $role): bool {
    if ($level === ROLE_PUBLIC) return true;
    if ($role === null || $role === "") return false;      // everything below needs a session
    if ($level === ROLE_USER) return role_rank($role) > 0; // any known staff role, engineers included
    return role_rank($role) >= role_rank($level);          // office / manager / founder
}
