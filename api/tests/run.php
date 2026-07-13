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

// ---------------------------------------------------------------- pipeline stages
require_once __DIR__ . "/../lib/pipeline.php";

$base = ["has_paid_invoice" => false, "has_open_quote" => false, "quote_declined" => false,
         "has_replied" => false, "has_outbound" => false, "last_job_at" => null];

eq("prospect",  stage_for($base), "never contacted -> prospect");
eq("contacted", stage_for(array_merge($base, ["has_outbound" => true])), "we emailed them -> contacted");
eq("interested", stage_for(array_merge($base, ["has_outbound" => true, "has_replied" => true])), "they replied -> interested");
eq("quoted", stage_for(array_merge($base, ["has_replied" => true, "has_open_quote" => true])), "an open quote outranks a reply");
eq("customer", stage_for(array_merge($base, ["has_open_quote" => true, "has_paid_invoice" => true])), "a paid invoice outranks everything");
eq("lost", stage_for(array_merge($base, ["has_outbound" => true, "quote_declined" => true])), "declined quote -> lost");
// Dormancy is the ONLY time-dependent rule, so the clock is injected. A test that depends on the
// real date is a test that fails one day a year, at 3am, for no reason anyone can reproduce.
eq("dormant", stage_for(array_merge($base, [
    "has_paid_invoice" => true, "last_job_at" => "2024-01-01 00:00:00", "now" => "2026-07-13 00:00:00",
])), "customer, no job in 12 months -> dormant");
eq("customer", stage_for(array_merge($base, [
    "has_paid_invoice" => true, "last_job_at" => "2026-01-01 00:00:00", "now" => "2026-07-13 00:00:00",
])), "customer with a recent job stays a customer");
// A business we have done work for is a customer even if no invoice was ever marked paid — they may
// have been invoiced and not paid yet, or paid cash. Deriving from the invoice alone would demote
// every real customer in the database. Caught by the migration dry-run, not by reading the code.
eq("customer", stage_for(array_merge($base, [
    "has_job" => true, "last_job_at" => "2026-06-01 00:00:00", "now" => "2026-07-13 00:00:00",
])), "a business we did a job for is a customer, paid invoice or not");
eq("dormant", stage_for(array_merge($base, [
    "has_job" => true, "last_job_at" => "2024-06-01 00:00:00", "now" => "2026-07-13 00:00:00",
])), "…and goes dormant on the same 12-month rule");

// ---------------------------------------------------------------- tenders (Contracts Finder)
/**
 * Replayed against a REAL Contracts Finder payload, saved from the live OCDS API — not a fixture I
 * invented. Hand-written fixtures only ever prove that the parser agrees with my assumptions about
 * the feed, which is precisely the thing that is wrong when a feed breaks. This one caught the
 * notice-URL bug: building the URL from tender.id looks right, reads right, and 403s.
 */
require_once __DIR__ . "/../lib/tenders.php";

$fx = json_decode(file_get_contents(__DIR__ . "/fixtures/contracts_finder.json"), true);
[$electrical, $landscaping, $taxi] = array_map("tender_parse", $fx["releases"]);

$prefs = ["cpv" => explode(",", TENDER_CPV_DEFAULT), "keywords" => explode(",", TENDER_KEYWORDS_DEFAULT), "postcodes" => []];

eq("CA18216 - R9309 Electrical Upgrade EGH Ph 2", $electrical["title"], "parses the title");
eq("45317000", $electrical["cpv"], "parses the CPV code");
eq("Epsom & St Helier University Hospitals NHS Trust", $electrical["buyer"], "parses the buyer");
ok(str_starts_with((string) $electrical["url"], "https://www.contractsfinder.service.gov.uk/Notice/"),
    "takes the notice URL from documents[] — building it from tender.id returns 403");
ok($electrical["deadline_at"] !== null, "parses the closing date — the only field that makes the list urgent");
ok($electrical["published_at"] !== null, "parses the publication date");

// Delivery addresses are a grab-bag: one real postcode buried among "Europe", "Isle of Man" and
// "Rest of the World". Taking the first COUNTRY would tell us nothing about sending a van.
eq("BT34 2QU", $landscaping["postcode"], "digs the real postcode out of the delivery-address grab-bag");

ok(tender_match($electrical, $prefs) !== null, "an electrical upgrade at an NHS trust is work EGO can do");
ok(str_contains((string) tender_match($electrical, $prefs), "45317000"),
    "…and says WHY it matched, so a human can triage in one glance");
eq(null, tender_match($taxi, $prefs), "a taxi framework is not a maintenance job");

// THE TRAP. This landscaping notice's DESCRIPTION contains "Ground Maintenance" and "Land
// Clearance". Matching keywords against descriptions would pull in half the register — every
// notice that merely mentions a trade on site. Keywords are matched on the TITLE only; this one
// still matches, but on its CPV, which is the buyer's own classification rather than our guess.
ok(str_contains(strtolower($landscaping["description"]), "maintenance"),
    "the trap fixture really does say 'maintenance' in its description");
$titleOnly = ["cpv" => [], "keywords" => ["maintenance"], "postcodes" => []];
eq(null, tender_match($landscaping, $titleOnly),
    "a description that merely mentions 'maintenance' must NOT match — titles only");

// Area filter: only ever excludes when we KNOW the answer is no.
eq(true,  tender_in_area($landscaping, ["cpv" => [], "keywords" => [], "postcodes" => []]), "no postcode filter set — the whole UK");
eq(true,  tender_in_area($landscaping, ["cpv" => [], "keywords" => [], "postcodes" => ["bt"]]), "BT34 is inside a BT filter");
eq(false, tender_in_area($landscaping, ["cpv" => [], "keywords" => [], "postcodes" => ["se", "sw"]]), "BT34 is not London");
$noPostcode = array_merge($landscaping, ["postcode" => null]);
eq(true, tender_in_area($noPostcode, ["cpv" => [], "keywords" => [], "postcodes" => ["se"]]),
    "a notice with no stated postcode is kept — unknown is not the same as wrong");

// ---------------------------------------------------------------- foreach-by-reference footgun
/**
 * A STATIC test, not a unit test — because the bug it catches is invisible to unit tests.
 *
 * `foreach ($rows as &$r)` leaves $r bound to the last element FOREVER: PHP has no block scope, so
 * the reference outlives the loop. Any later `foreach (... as $r)` in the same request then writes
 * each of its own rows straight through that reference, quietly destroying the last row of $rows.
 *
 * This shipped. GET /leads cast its rows by reference, then reused $r to build the status counts —
 * so the last lead was replaced by ["status" => "found", "c" => 1]. The list said "1 lead" and drew
 * a row with no name, no company and no email. Nothing failed, nothing logged, nothing 500'd; the
 * lead was simply gone. index.php has 46 more by-reference loops, and today none of them are wrong.
 * The point of this test is that the 47th cannot be.
 */
// Strip comments with PHP's own tokenizer before scanning. A regex over raw lines reads the comment
// ABOVE the fix — which quotes the broken code as a warning — and flags it as the bug. A checker
// that cannot tell code from prose about code will cry wolf until someone deletes it.
$tokens = token_get_all(file_get_contents(__DIR__ . "/../index.php"));
$stripped = "";
foreach ($tokens as $t) {
    if (is_array($t)) {
        // Keep the line count identical, so every offence reports the real line number in index.php.
        $stripped .= in_array($t[0], [T_COMMENT, T_DOC_COMMENT], true)
            ? str_repeat("\n", substr_count($t[1], "\n"))
            : $t[1];
    } else {
        $stripped .= $t;
    }
}
$src = explode("\n", $stripped);
$bind = '/foreach\s*\(.*\bas\s+(?:\$\w+\s*=>\s*)?&\$(\w+)\s*\)/';
$use  = '/foreach\s*\(.*\bas\s+(?:\$\w+\s*=>\s*)?&?\$(\w+)\s*\)/';

// Scope = one `case` of the switch: exactly one route runs per request, so that is the blast radius.
$starts = [];
foreach ($src as $i => $line) {
    if (preg_match('/^\s*case "(GET|POST|PUT|DELETE|PATCH) /', $line)) $starts[] = $i;
}
$offences = [];
foreach ($starts as $k => $start) {
    $end = $starts[$k + 1] ?? count($src);
    preg_match('/case "((?:GET|POST|PUT|DELETE|PATCH) [^"]+)"/', $src[$start], $m);
    $route = $m[1] ?? "?";
    $live = [];   // var => line where it was bound by reference and not yet released
    for ($i = $start; $i < $end; $i++) {
        $line = $src[$i];
        $isBind = preg_match($bind, $line);
        // Reuse of a still-live reference as a loop variable, or as an assignment target.
        if (!$isBind && preg_match($use, $line, $u) && isset($live[$u[1]])) {
            $offences[] = "$route: \$" . $u[1] . " bound by reference on line " . $live[$u[1]]
                . " is reused as a loop variable on line " . ($i + 1) . " — it will overwrite the last element";
            unset($live[$u[1]]);
        }
        foreach (array_keys($live) as $v) {
            if (preg_match('/(?<![\w$])\$' . $v . '\s*=(?!=)/', $line)) {
                $offences[] = "$route: \$$v bound by reference on line {$live[$v]} is assigned to on line "
                    . ($i + 1) . " — it will overwrite the last element";
                unset($live[$v]);
            }
        }
        if ($isBind && preg_match($bind, $line, $b)) $live[$b[1]] = $i + 1;
        if (preg_match_all('/unset\(\$(\w+)\)/', $line, $un)) {
            foreach ($un[1] as $v) unset($live[$v]);   // unset($r) releases the reference — the correct fix
        }
    }
}
ok($offences === [], "no foreach-by-reference variable is reused after its loop\n    " . implode("\n    ", $offences));

// ---------------------------------------------------------------- report
printf("\n  %d passed, %d failed\n", $T["pass"], $T["fail"]);
foreach ($T["failures"] as $f) printf("  FAIL: %s\n", $f);
exit($T["fail"] === 0 ? 0 : 1);
