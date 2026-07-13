<?php
/**
 * EGO LIMITED — the pipeline domain.
 * See docs/superpowers/specs/2026-07-13-pipeline-restructure-design.md
 *
 * ONE CONTACT TABLE. A prospect is a customer who hasn't bought yet.
 *
 * Before this, a business could exist twice: once in ego_leads (cold, scraped) and separately in
 * ego_customers (once they paid), with no link between them. So the moment that decides whether EGO
 * earns money — a stranger saying "yes, quote me" — had nowhere to go. Someone had to notice an
 * email, retype the business by hand, and remember to follow up. Nothing linked it back.
 *
 * THE STAGE IS DERIVED, NEVER HAND-MAINTAINED.
 *
 * A hand-kept board rots the first time someone forgets to drag a card, and then it lies quietly,
 * forever, while everyone keeps trusting it. A derived board cannot lie, because it reads the same
 * facts the invoices read. That single property is what stops this becoming a CRM nobody updates —
 * there is nothing to update.
 */
declare(strict_types=1);

/**
 * The stage a business is at, from the facts. PURE — no database, no clock unless you pass one,
 * so it can be tested exhaustively (and is, in api/tests/run.php).
 *
 * Ranked most-decisive first: a paid invoice outranks an open quote, which outranks a reply. Money
 * that has actually landed beats every kind of intent.
 */
function stage_for(array $f): string {
    $now = strtotime((string)($f["now"] ?? "now"));

    if (!empty($f["has_paid_invoice"])) {
        // Dormancy is the only time-dependent rule. The clock is injected so a test never depends
        // on what day it happens to be run.
        $last = !empty($f["last_job_at"]) ? strtotime((string)$f["last_job_at"]) : null;
        if ($last !== null && $last < strtotime("-12 months", $now)) return "dormant";
        return "customer";
    }
    if (!empty($f["has_open_quote"]))  return "quoted";
    if (!empty($f["quote_declined"]))  return "lost";
    if (!empty($f["has_replied"]))     return "interested";
    if (!empty($f["has_outbound"]))    return "contacted";
    return "prospect";
}

/** Gather the facts a stage is derived from. Every lookup hits an index. */
function stage_facts(mysqli $db, int $id): array {
    $paid = db_one($db, "SELECT 1 x FROM ego_invoices WHERE customer_id=? AND kind='invoice' AND status='paid' AND deleted_at IS NULL LIMIT 1", "i", $id);
    $open = db_one($db, "SELECT 1 x FROM ego_invoices WHERE customer_id=? AND kind='quote' AND status IN ('draft','sent') AND deleted_at IS NULL LIMIT 1", "i", $id);
    $dead = db_one($db, "SELECT 1 x FROM ego_invoices WHERE customer_id=? AND kind='quote' AND status='declined' AND deleted_at IS NULL LIMIT 1", "i", $id);
    $in   = db_one($db, "SELECT 1 x FROM ego_messages WHERE customer_id=? AND direction='inbound' LIMIT 1", "i", $id);
    $out  = db_one($db, "SELECT 1 x FROM ego_messages WHERE customer_id=? AND direction='outbound' LIMIT 1", "i", $id);
    $job  = db_one($db, "SELECT MAX(created_at) j FROM ego_jobs WHERE customer_id=? AND deleted_at IS NULL", "i", $id);

    return [
        "has_paid_invoice" => (bool) $paid,
        "has_open_quote"   => (bool) $open,
        "quote_declined"   => (bool) $dead,
        "has_replied"      => (bool) $in,
        "has_outbound"     => (bool) $out,
        "last_job_at"      => $job["j"] ?? null,
    ];
}

/**
 * Recompute and persist. A human override (stage_locked) always wins — the derived stage must never
 * fight someone who knows something the database doesn't.
 */
function stage_recompute(mysqli $db, int $id): string {
    $c = db_one($db, "SELECT stage, stage_locked FROM ego_customers WHERE id=?", "i", $id);
    if (!$c) return "";
    if ((int) $c["stage_locked"] === 1) return (string) $c["stage"];

    $stage = stage_for(stage_facts($db, $id));
    if ($stage !== $c["stage"]) {
        db_exec($db, "UPDATE ego_customers SET stage=? WHERE id=?", "si", $stage, $id);
        contact_log($db, $id, "stage", "Moved to " . $stage);
    }
    return $stage;
}

/** One line on the business's timeline — the screen that answers "what's the story with Marchmont?" */
function contact_log(mysqli $db, int $id, string $kind, string $summary, ?int $actorId = null): void {
    db_exec($db, "INSERT INTO ego_contact_events (customer_id, kind, summary, actor_id) VALUES (?,?,?,?)",
        "issi", $id, $kind, mb_substr($summary, 0, 250), $actorId);
    db_exec($db, "UPDATE ego_customers SET last_activity_at=NOW() WHERE id=?", "i", $id);
}

/**
 * Find this business by email, or create it. The ONE way a contact enters the system — so an
 * enquiry, a phone call and a cold lead all land in the same place and can never diverge into two
 * records for one business, which is the whole disease this replaces.
 */
function contact_upsert_by_email(mysqli $db, array $r): int {
    $email = strtolower(trim((string) ($r["email"] ?? "")));
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) return 0;

    $found = db_one($db, "SELECT id FROM ego_customers WHERE LOWER(email)=? AND deleted_at IS NULL", "s", $email);
    if ($found) return (int) $found["id"];

    $name    = trim((string) ($r["name"] ?? "")) ?: trim((string) ($r["company"] ?? "")) ?: $email;
    $company = trim((string) ($r["company"] ?? "")) ?: null;
    $phone   = trim((string) ($r["phone"] ?? "")) ?: null;
    $source  = in_array($r["source"] ?? "", ["enquiry", "cold", "phone", "referral", "repeat"], true)
        ? (string) $r["source"] : "unknown";

    db_exec($db,
        "INSERT INTO ego_customers (name, company, email, phone, stage, source, last_activity_at)
         VALUES (?,?,?,?, 'prospect', ?, NOW())",
        "sssss", $name, $company, $email, $phone, $source);
    return (int) $db->insert_id;
}
