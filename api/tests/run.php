<?php
/**
 * EGO LIMITED — API test suite. Run: php api/tests/run.php   (CI runs this on every push.)
 *
 * Deliberately zero-dependency: this codebase has no Composer and no vendor/ (a virtue on a
 * shared cPanel host — nothing to CVE-patch), so pulling in PHPUnit just to assert arithmetic
 * would be the single heaviest dependency decision in the project. A ~40-line harness buys the
 * same safety here.
 *
 * Scope: the PURE business logic that money and job state depend on. These are the functions
 * where a silent bug costs real money or breaks a legal obligation (UK VAT, gap-free numbering),
 * and they were previously covered by exactly zero tests across 5.9k lines of PHP.
 *
 * NOT covered here (needs a DB, and is the next layer to earn tests): allocate_doc_number's
 * transactional locking, the payment→invoice→job cascade.
 */
declare(strict_types=1);

// ---------------------------------------------------------------- tiny harness
$T = ["pass" => 0, "fail" => 0, "failures" => []];

function ok(bool $cond, string $what): void {
    global $T;
    if ($cond) { $T["pass"]++; return; }
    $T["fail"]++;
    $T["failures"][] = $what;
}
function eq($expected, $actual, string $what): void {
    $same = $expected === $actual;
    if (!$same) {
        $what .= sprintf("  (expected %s, got %s)", var_export($expected, true), var_export($actual, true));
    }
    ok($same, $what);
}
/** Assert the callable throws. compute_totals guards the ledger by throwing on bad input. */
function throws(callable $fn, string $what): void {
    try { $fn(); ok(false, "$what — expected a throw, got none"); }
    catch (Throwable $e) { ok(true, $what); }
}

/**
 * index.php defines fail() as "emit JSON + exit". Tests must not exit, so we define it FIRST —
 * PHP won't redeclare it — and turn it into an exception. This is why the lib/ modules are
 * testable at all: they never touch $_SERVER, sessions or output, only fail().
 */
function fail(string $msg, int $code = 400): never {
    throw new RuntimeException($msg);
}

require_once __DIR__ . "/../lib/invoicing.php";
require_once __DIR__ . "/../lib/job_status.php";

// ---------------------------------------------------------------- compute_totals (money)
$r = compute_totals([["description" => "Labour", "quantity" => 2, "unit_price" => 50]], 20.0);
eq(100.0, $r["subtotal"], "subtotal = qty x price");
eq(20.0, $r["vat_amount"], "VAT at 20%");
eq(120.0, $r["total"], "total = subtotal + VAT");
eq(100.0, $r["lines"][0]["line_total"], "line_total computed per line");

$r = compute_totals([], 20.0);
eq(0.0, $r["subtotal"], "empty invoice has zero subtotal");
eq(0.0, $r["total"], "empty invoice has zero total");

// Zero-rated / VAT-unregistered: EGO can legitimately invoice at 0% VAT.
$r = compute_totals([["quantity" => 1, "unit_price" => 99.99]], 0.0);
eq(0.0, $r["vat_amount"], "0% VAT rate yields no VAT");
eq(99.99, $r["total"], "0% VAT total equals subtotal");

// Rounding is where money bugs live. 3 x 33.33 = 99.99; VAT 20% = 19.998 -> must round to 19.998→20.00,
// and the total must be the rounded parts summed, never the unrounded product (else invoices
// disagree with what the customer is asked to pay by a penny).
$r = compute_totals([["quantity" => 3, "unit_price" => 33.33]], 20.0);
eq(99.99, $r["subtotal"], "rounding: 3 x 33.33 = 99.99");
eq(20.0, $r["vat_amount"], "rounding: VAT rounds to 2dp");
eq(119.99, $r["total"], "rounding: total = rounded subtotal + rounded VAT");

// A classic float trap: 0.1 + 0.2 != 0.3 in binary floating point.
$r = compute_totals([["quantity" => 1, "unit_price" => 0.1], ["quantity" => 1, "unit_price" => 0.2]], 0.0);
eq(0.3, $r["subtotal"], "float trap: 0.1 + 0.2 sums to exactly 0.30");

// Strings arrive from JSON bodies all the time; they must coerce, not corrupt.
$r = compute_totals([["quantity" => "2", "unit_price" => "10.50"]], 20.0);
eq(21.0, $r["subtotal"], "string inputs coerce to numbers");

// The ledger guard: negatives would let someone invoice a NEGATIVE line and quietly reduce a bill.
throws(fn() => compute_totals([["quantity" => -1, "unit_price" => 10]], 20.0), "negative quantity is rejected");
throws(fn() => compute_totals([["quantity" => 1, "unit_price" => -10]], 20.0), "negative unit price is rejected");

$r = compute_totals([["quantity" => 1, "unit_price" => 10], ["quantity" => 3, "unit_price" => 5]], 20.0);
eq(25.0, $r["subtotal"], "multi-line subtotal sums every line");
eq(2, count($r["lines"]), "every line is returned");

// ---------------------------------------------------------------- job status machine
eq(true, job_status_exists("new"), "known status exists");
eq(false, job_status_exists("banana"), "unknown status does not exist");

// The happy path an engineer actually walks, start to finish.
ok(job_can_transition("new", "scheduled", "office"), "office: new -> scheduled");
ok(job_can_transition("scheduled", "en_route", "engineer"), "engineer: scheduled -> en_route");
ok(job_can_transition("en_route", "on_site", "engineer"), "engineer: en_route -> on_site");
ok(job_can_transition("on_site", "completed", "engineer"), "engineer: on_site -> completed");
ok(job_can_transition("completed", "invoiced", "office"), "office: completed -> invoiced");
ok(job_can_transition("invoiced", "paid", "office"), "office: invoiced -> paid");
ok(job_can_transition("paid", "closed", "office"), "office: paid -> closed");

// Engineers must not be able to skip the field chain or touch money states.
ok(!job_can_transition("new", "completed", "engineer"), "engineer cannot jump new -> completed");
ok(!job_can_transition("completed", "invoiced", "engineer"), "engineer cannot invoice a job");
ok(!job_can_transition("invoiced", "paid", "engineer"), "engineer cannot mark a job paid");
ok(!job_can_transition("new", "scheduled", "engineer"), "engineer cannot schedule a job");

// On-hold round trip (parts on order, no access, etc).
ok(job_can_transition("on_site", "on_hold", "engineer"), "engineer: on_site -> on_hold");
ok(job_can_transition("on_hold", "on_site", "engineer"), "engineer: on_hold -> on_site");

// Terminal states are terminal — nothing may leave them, for anyone.
foreach (["closed", "cancelled"] as $terminal) {
    foreach (array_keys(JOB_TRANSITIONS) as $to) {
        ok(!job_can_transition($terminal, $to, "founder"), "terminal: $terminal cannot go to $to");
    }
}

// Illegal jumps and junk input.
ok(!job_can_transition("new", "paid", "founder"), "no jumping new -> paid");
ok(!job_can_transition("banana", "scheduled", "founder"), "unknown 'from' is rejected");
ok(!job_can_transition("new", "banana", "founder"), "unknown 'to' is rejected");
ok(!job_can_transition("new", "scheduled", ""), "empty role is denied (no anonymous transitions)");

// ---------------------------------------------------------------- customer_code (references)
eq(6, strlen(customer_code("Acme Ltd", "07700900123", "SW1A 1AA")), "customer code is always 6 chars");
eq(customer_code("Acme Ltd", "07700900123", "SW1A 1AA"),
   customer_code("Acme Ltd", "07700900123", "SW1A 1AA"), "customer code is deterministic");
// Missing data must still yield a valid 6-char code — half our customers have no postcode on file.
eq(6, strlen(customer_code("Bob", null, null)), "code survives missing phone and postcode");
eq(6, strlen(customer_code("", null, null)), "code survives an empty name");
eq(6, strlen(customer_code("Ω≈ç√", "abc", "!!!")), "code survives non-alphanumeric junk");

// ---------------------------------------------------------------- authz manifest
require_once __DIR__ . "/../lib/authz.php";

eq("office", route_level("GET", "/jobs"), "manifest: /jobs is office-gated");
eq("founder", route_level("POST", "/integrations"), "manifest: integration keys are founder-only");
eq("public", route_level("GET", "/health"), "manifest: health is public");
eq("user", route_level("POST", "/jobs/status"), "manifest: engineers can move their own job");
eq(null, route_level("POST", "/not-a-real-route"), "manifest: unknown route has no level (fail-closed)");
// The regression this closes: any authenticated engineer could delete office kanban tasks.
eq("office", route_level("POST", "/tasks/delete"), "manifest: task deletion is office-only");
eq("manager", route_level("POST", "/payments/delete"), "manifest: reversing a payment needs a manager");

/**
 * The access decision itself. This is the control that now stands in front of all 193 routes,
 * so it gets an exhaustive truth table rather than a couple of happy-path pokes.
 */
// Anonymous callers get public routes and nothing else.
ok(level_satisfied_by("public", null), "anon may call a public route");
foreach (["user", "office", "manager", "founder"] as $lvl) {
    ok(!level_satisfied_by($lvl, null), "anon is denied a '$lvl' route");
    ok(!level_satisfied_by($lvl, ""), "empty role is denied a '$lvl' route");
    ok(!level_satisfied_by($lvl, "banana"), "unknown role is denied a '$lvl' route");
}
// The full role x level matrix. Read it as: who can reach what.
$matrix = [
    //            public user  office manager founder
    "engineer" => [true, true,  false, false,  false],
    "office"   => [true, true,  true,  false,  false],
    "manager"  => [true, true,  true,  true,   false],
    "founder"  => [true, true,  true,  true,   true ],
];
$levels = ["public", "user", "office", "manager", "founder"];
foreach ($matrix as $role => $expected) {
    foreach ($levels as $i => $lvl) {
        eq($expected[$i], level_satisfied_by($lvl, $role), "$role -> '$lvl' route");
    }
}
// Spelled out, because these are the ones that would actually hurt:
ok(!level_satisfied_by("office", "engineer"), "an engineer cannot reach the back office");
ok(!level_satisfied_by("founder", "manager"), "a manager cannot reach the integration keys");
ok(!level_satisfied_by("manager", "office"), "office staff cannot reverse a payment");

/**
 * DRIFT GUARD — the important one.
 *
 * The manifest is only a real control if it matches what the handlers actually enforce. Here we
 * re-derive the required level for every `case` in index.php straight from its require_*() call
 * and assert the two agree, in both directions. If someone adds a route, tightens a guard, or
 * edits the manifest alone, this fails the build rather than letting the two drift apart —
 * which is precisely how a central authz table becomes decorative.
 */
$src = file_get_contents(__DIR__ . "/../index.php");
$lines = explode("\n", $src);

$derived = [];
$pending = [];   // fallthrough labels (`case A:` immediately above `case B: {`) share B's guard
foreach ($lines as $i => $line) {
    if (!preg_match('/^\s*case "([A-Z]+ \/[^"]*)":\s*(\{?)\s*$/', $line, $m)) continue;
    [, $route, $brace] = $m;
    if ($brace !== "{") { $pending[] = $route; continue; }

    // Body = from here to the next case label (or EOF).
    $body = "";
    for ($j = $i + 1; $j < count($lines); $j++) {
        if (preg_match('/^\s*case "[A-Z]+ \/[^"]*":/', $lines[$j])) break;
        $body .= $lines[$j] . "\n";
    }

    if (preg_match('/require_role\(\$db,\s*"(\w+)"\)/', $body, $g))      $lvl = $g[1] === "admin" ? "office" : $g[1];
    elseif (preg_match('/require_min\(\$db,\s*"(\w+)"\)/', $body, $g))   $lvl = $g[1];
    elseif (preg_match('/require_user\(/', $body))                       $lvl = "user";
    else                                                                 $lvl = "public";

    foreach ([...$pending, $route] as $r) $derived[$r] = $lvl;
    $pending = [];
}

ok(count($derived) > 150, "drift guard actually parsed the switch (found " . count($derived) . " routes)");

foreach ($derived as $route => $lvl) {
    $declared = ROUTE_ROLES[$route] ?? null;
    if ($declared === null) {
        ok(false, "UNREGISTERED ROUTE: index.php handles \"$route\" but lib/authz.php does not list it "
                . "— it is unreachable (fail-closed). Add it to ROUTE_ROLES.");
        continue;
    }
    eq($lvl, $declared, "authz matches handler for \"$route\"");
}
foreach (ROUTE_ROLES as $route => $lvl) {
    ok(isset($derived[$route]), "STALE MANIFEST ENTRY: lib/authz.php lists \"$route\" but index.php has no such case");
}

// ---------------------------------------------------------------- report
printf("\n  %d passed, %d failed\n", $T["pass"], $T["fail"]);
foreach ($T["failures"] as $f) printf("  FAIL: %s\n", $f);
exit($T["fail"] === 0 ? 0 : 1);
