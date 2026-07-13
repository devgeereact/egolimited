<?php
/**
 * EGO LIMITED — campaigns domain. See docs/CAMPAIGNS-V2.md.
 *
 * ONE place that owns: enrolment, suppression, merge rendering, queueing and sending. v1 had four
 * independent "compose + draft + send" implementations and three different merge-context shapes,
 * which is why the same {{website}} token silently rendered blank in one send path and correctly in
 * another. There is now a single answer to "what will this actually send?", and the UI asks the
 * server for it rather than reimplementing it.
 */
declare(strict_types=1);

/* ---------------------------------------------------------------- suppression */

/**
 * Suppress an address. Idempotent, and the FIRST reason wins — if someone unsubscribed and later
 * hard-bounces, they stay recorded as 'unsubscribed', because that is the fact with legal weight.
 */
function supp_add(mysqli $db, string $email, string $reason, ?string $source = null, ?string $note = null): void {
    $email = strtolower(trim($email));
    if ($email === "") return;
    db_exec($db, "INSERT IGNORE INTO ego_suppressions (email, reason, source, note) VALUES (?,?,?,?)",
        "ssss", $email, $reason, $source, $note);
}

/** Is this address suppressed? Checked at ENROL time and again immediately before every send. */
function supp_has(mysqli $db, string $email): bool {
    $e = strtolower(trim($email));
    return (bool) db_one($db, "SELECT email FROM ego_suppressions WHERE email=?", "s", $e);
}

/**
 * Stop every ACTIVE enrolment for an address, everywhere, and cancel its queued sends.
 * Called on unsubscribe, on bounce and on reply — the three ways a person tells us to stop.
 * Sequences are stopped by STATE, not by deleting rows: we keep the history of what we sent.
 */
function camp_stop_email(mysqli $db, string $email, string $state, string $reason): int {
    $e = strtolower(trim($email));
    $rows = db_all($db, "SELECT id FROM ego_campaign_enrollments WHERE email=? AND state='active'", "s", $e);
    foreach ($rows as $r) {
        db_exec($db, "UPDATE ego_campaign_enrollments SET state=?, stop_reason=?, next_due_at=NULL WHERE id=?",
            "ssi", $state, $reason, (int)$r["id"]);
        // Anything not yet out of the door is cancelled, not sent.
        db_exec($db, "UPDATE ego_campaign_sends_v2 SET status='skipped', error=? WHERE enrollment_id=? AND status='queued'",
            "si", $reason, (int)$r["id"]);
    }
    return count($rows);
}

/* ---------------------------------------------------------------- merge */

/**
 * The merge context for one recipient. The ONE definition — the client asks the server to render a
 * preview rather than reimplementing this (v1's client copy hardcoded the company name as "EGO LTD",
 * so the preview could lie about what would actually be sent).
 */
function camp_ctx(mysqli $db, array $recipient): array {
    $co = db_one($db, "SELECT company_name FROM ego_company_settings ORDER BY id LIMIT 1") ?: [];
    $full = trim((string)($recipient["name"] ?? ""));
    $first = $full !== "" ? (preg_split('/\s+/', $full)[0] ?? "") : "";

    // These key names are a CONTRACT with ego_merge_tokens() — it reads first_name / company_name /
    // website / sender_name, and anything else silently falls through to a generic fallback. Getting
    // this wrong is not loud: {{company}} just quietly renders as "your business" and a stranger
    // receives an email that looks automated. That is exactly the bug v1 shipped (three call sites,
    // three different context shapes), and it is why there is now ONE function that builds it.
    return [
        "first_name"   => $first,
        "name"         => $full,
        "company_name" => trim((string)($recipient["company"] ?? "")),
        "website"      => trim((string)($recipient["website"] ?? "")),
        "email"        => $recipient["email"] ?? "",
        "sender_name"  => ($co["company_name"] ?? "") ?: "EGO LIMITED",
    ];
}

/** Render subject+body for one recipient. Always via lib/mailer.php's ego_merge_tokens(). */
function camp_render(mysqli $db, array $recipient, string $subject, string $body): array {
    require_once __DIR__ . "/mailer.php";
    $ctx = camp_ctx($db, $recipient);
    return [
        "subject" => ego_merge_tokens($subject, $ctx),
        "body"    => ego_merge_tokens($body, $ctx),
    ];
}

/**
 * Build the HTML for one campaign email: optional header image, the merged body, then a footer
 * carrying WHO WE ARE and a working one-click unsubscribe.
 *
 * The unsubscribe base URL comes from config, not from $_SERVER — the worker runs on the CLI where
 * there is no request to infer a hostname from, and a campaign email with a broken opt-out link is
 * a PECR breach, not a cosmetic bug.
 */
function camp_email_html(mysqli $db, string $bodyHtml, string $email, ?string $imageUrl = null): string {
    require_once __DIR__ . "/mailer.php";
    $co = db_one($db, "SELECT company_name, address, email, phone FROM ego_company_settings ORDER BY id LIMIT 1") ?: [];
    $coName = htmlspecialchars(($co["company_name"] ?? "") ?: "EGO LIMITED");
    $addr   = htmlspecialchars((string)($co["address"] ?? ""));
    $coMail = htmlspecialchars((string)($co["email"] ?? ""));

    $img = "";
    if ($imageUrl && filter_var($imageUrl, FILTER_VALIDATE_URL)) {
        $img = "<img src='" . htmlspecialchars($imageUrl) . "' alt='' style='display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:0 0 18px'>";
    }

    $base = rtrim((string) (integ($db, "public_base_url") ?: "https://egolimited.com"), "/");
    $link = $base . "/api/unsubscribe?e=" . rawurlencode($email) . "&t=" . ego_unsub_token($db, $email);

    // Sender identity + a one-click opt-out on EVERY campaign email. Both are legal requirements
    // for unsolicited B2B mail in the UK, and both are handled here so no send path can forget.
    $footer =
        "<hr style='border:none;border-top:1px solid #e5e7eb;margin:28px 0 14px'>"
        . "<p style='margin:0;color:#6b7280;font-size:12px;line-height:1.6'>"
        . "You received this because we believe {$coName} can help your business. "
        . "<a href='" . htmlspecialchars($link) . "' style='color:#6b7280'>Unsubscribe</a> and we won't email you again."
        . "</p>"
        . "<p style='margin:8px 0 0;color:#9ca3af;font-size:12px'><strong>{$coName}</strong>"
        . ($addr ? " · {$addr}" : "")
        . ($coMail ? " · {$coMail}" : "")
        . "</p>";

    return ego_email_shell($db, "", $img . $bodyHtml . $footer);
}

/* ---------------------------------------------------------------- enrolment */

/**
 * Enrol one recipient. Returns 'enrolled' | 'suppressed' | 'duplicate'.
 * Suppression is checked HERE as well as at send time, so a suppressed address never even joins.
 */
function camp_enroll(mysqli $db, int $campaignId, array $r): string {
    $email = strtolower(trim((string)($r["email"] ?? "")));
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) return "invalid";
    if (supp_has($db, $email)) return "suppressed";

    $exists = db_one($db, "SELECT id FROM ego_campaign_enrollments WHERE campaign_id=? AND email=?", "is", $campaignId, $email);
    if ($exists) return "duplicate";

    // next_due_at = now: step 1's delay is measured from ENROLMENT, which is what "send after
    // approval" actually means. v1 measured it from the day we scraped the lead.
    db_exec($db,
        "INSERT INTO ego_campaign_enrollments (campaign_id, lead_id, email, name, company, website, state, current_step, next_due_at)
         VALUES (?,?,?,?,?,?, 'active', 0, NOW())",
        "iissss", $campaignId,
        isset($r["lead_id"]) ? (int)$r["lead_id"] : null,
        $email, $r["name"] ?? null, $r["company"] ?? null, $r["website"] ?? null);
    return "enrolled";
}

/* ---------------------------------------------------------------- the queue */

/**
 * Queue every enrolment whose next step is due. Idempotent: the UNIQUE (enrollment_id, step_no) on
 * the sends table means a step can never be queued — or sent — twice, however many times this runs.
 *
 * Returns how many sends were queued.
 */
function camp_queue_due(mysqli $db, int $campaignId): int {
    $steps = db_all($db, "SELECT step_no, delay_days, subject FROM ego_campaign_steps_v2 WHERE campaign_id=? ORDER BY step_no", "i", $campaignId);
    if (!$steps) return 0;
    $maxStep = (int) end($steps)["step_no"];

    $due = db_all($db,
        "SELECT id, email, current_step FROM ego_campaign_enrollments
         WHERE campaign_id=? AND state='active' AND next_due_at IS NOT NULL AND next_due_at <= NOW()",
        "i", $campaignId);

    $queued = 0;
    foreach ($due as $e) {
        $next = (int)$e["current_step"] + 1;
        if ($next > $maxStep) {
            db_exec($db, "UPDATE ego_campaign_enrollments SET state='completed', next_due_at=NULL WHERE id=?", "i", (int)$e["id"]);
            continue;
        }
        // Re-check suppression at the last possible moment — someone may have unsubscribed since
        // they were enrolled.
        if (supp_has($db, $e["email"])) {
            camp_stop_email($db, $e["email"], "unsubscribed", "suppressed before send");
            continue;
        }
        $step = null;
        foreach ($steps as $s) if ((int)$s["step_no"] === $next) $step = $s;
        if (!$step) continue;

        db_exec($db,
            "INSERT IGNORE INTO ego_campaign_sends_v2 (campaign_id, enrollment_id, step_no, email, subject, status)
             VALUES (?,?,?,?,?, 'queued')",
            "iiiss", $campaignId, (int)$e["id"], $next, $e["email"], $step["subject"]);
        if ($db->affected_rows > 0) $queued++;
    }
    return $queued;
}

/* ---------------------------------------------------------------- business hours */

/** UK bank holidays. Falls back to weekday+hours gating alone once the table runs out (see note). */
const EGO_BANK_HOLIDAYS = [
    "2026-01-01","2026-04-03","2026-04-06","2026-05-04","2026-05-25","2026-08-31","2026-12-25","2026-12-28",
    "2027-01-01","2027-03-26","2027-03-29","2027-05-03","2027-05-31","2027-08-30","2027-12-27","2027-12-28",
    "2028-01-03","2028-04-14","2028-04-17","2028-05-01","2028-05-29","2028-08-28","2028-12-25","2028-12-26",
];

/**
 * Is it a sensible moment to email a business? Mon-Fri, 08:00-17:59 London, not a bank holiday.
 * Returns null if fine, or a human reason to skip.
 */
function camp_closed_reason(): ?string {
    $now = new DateTime("now", new DateTimeZone("Europe/London"));
    $dow = (int) $now->format("N");
    if ($dow >= 6) return "weekend";
    if (in_array($now->format("Y-m-d"), EGO_BANK_HOLIDAYS, true)) return "bank holiday";
    $h = (int) $now->format("G");
    if ($h < 8 || $h >= 18) return "outside business hours";
    return null;
}
