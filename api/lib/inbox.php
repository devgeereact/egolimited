<?php
/**
 * EGO LIMITED — inbound email (M15). Reads the provider inbox over IMAP, stores
 * new messages in ego_messages, threads them to a customer (by from-address) and
 * a job (by reference CODE-J# in the subject/body). Needs the php-imap extension.
 */
declare(strict_types=1);

function imap_available(): bool { return function_exists("imap_open"); }

function inbox_decode(string $s, int $enc): string {
    if ($enc === 3) return base64_decode($s);            // BASE64
    if ($enc === 4) return quoted_printable_decode($s);  // QUOTED-PRINTABLE
    return $s;
}

/** Recursively walk a (sub)structure looking for the first text/html part.
 * $prefix is the IMAP part path ("" at top level, "1.2." etc. when nested). */
function inbox_find_html($conn, int $i, $struct, string $prefix): ?string {
    if (empty($struct->parts)) {
        if (strtoupper($struct->subtype ?? "") === "HTML") {
            $sec = $prefix === "" ? "1" : rtrim($prefix, ".");
            return inbox_decode(imap_fetchbody($conn, $i, $sec), $struct->encoding ?? 0);
        }
        return null;
    }
    foreach ($struct->parts as $idx => $part) {
        $sec = $prefix . ($idx + 1);
        if (strtoupper($part->subtype ?? "") === "HTML") {
            return inbox_decode(imap_fetchbody($conn, $i, $sec), $part->encoding ?? 0);
        }
        if (!empty($part->parts)) {
            $found = inbox_find_html($conn, $i, $part, $sec . ".");
            if ($found !== null) return $found;
        }
    }
    return null;
}

/** Best-effort HTML part of a message (for clean rendering). Null if none. */
function inbox_html_body($conn, int $i): ?string {
    $struct = imap_fetchstructure($conn, $i);
    if (!$struct) return null;
    // Single-part message that is itself HTML
    if (empty($struct->parts)) {
        return strtoupper($struct->subtype ?? "") === "HTML" ? inbox_decode(imap_body($conn, $i), $struct->encoding ?? 0) : null;
    }
    return inbox_find_html($conn, $i, $struct, "");
}

function inbox_plain_body($conn, int $i): string {
    $struct = imap_fetchstructure($conn, $i);
    $body = "";
    if (empty($struct->parts)) {
        $body = inbox_decode(imap_body($conn, $i), $struct->encoding ?? 0);
    } else {
        foreach ($struct->parts as $idx => $part) {
            if (strtoupper($part->subtype ?? "") === "PLAIN") {
                $body = inbox_decode(imap_fetchbody($conn, $i, (string)($idx + 1)), $part->encoding ?? 0);
                break;
            }
        }
        if ($body === "") $body = inbox_decode(imap_fetchbody($conn, $i, "1"), 0);
    }
    $body = strip_tags($body);
    return trim(mb_convert_encoding($body, "UTF-8", "UTF-8,ISO-8859-1"));
}

/** Build the IMAP mailbox connection string from the saved integration settings. */
function inbox_mailbox(mysqli $db): string {
    $host = integ($db, "imap_host");
    if (!$host) throw new RuntimeException("IMAP not configured (Settings → Integrations)");
    $port = (int) (integ($db, "imap_port") ?? 993);
    $secure = strtolower(integ($db, "imap_secure") ?: "ssl");
    $flags = $secure === "ssl" ? "/imap/ssl/novalidate-cert"
        : ($secure === "tls" ? "/imap/tls/novalidate-cert" : "/imap/notls");
    return "{" . $host . ":" . $port . $flags . "}INBOX";
}

/** Detect a bounce / auto-reply (e.g. "Mail Delivery System", mailer-daemon). These
 *  pile up whenever mail is sent to an address that doesn't exist; we archive them on
 *  arrival so the inbox stays clean (they're still in Archived if anyone needs them). */
function inbox_is_bounce(string $fromEmail, string $fromName, string $subject): bool {
    $from = strtolower($fromEmail . " " . $fromName);
    if (preg_match('/mailer-daemon|postmaster|mail delivery (system|subsystem)|delivery status notif/i', $from)) return true;
    return (bool) preg_match('/delivery (status notification|has failed|failure)|undeliverable|returned mail|failure notice|message not delivered|delivery incomplete|could not be delivered/i', $subject);
}

/** Pull recent mail into ego_messages. Returns count of new messages stored. */
function inbox_sync(mysqli $db): int {
    if (!imap_available()) throw new RuntimeException("IMAP not available on this server's PHP");
    $user = integ($db, "imap_user"); $pass = (string) integ($db, "imap_pass");
    if (!$user) throw new RuntimeException("IMAP not configured (Settings → Integrations)");
    $mailbox = inbox_mailbox($db);

    $conn = @imap_open($mailbox, $user, $pass, 0, 1);
    if (!$conn) throw new RuntimeException("IMAP connect failed: " . (imap_last_error() ?: "check host/port/credentials"));

    $n = imap_num_msg($conn);
    $start = max(1, $n - 25); // last ~25 messages
    $count = 0;
    for ($i = $n; $i >= $start; $i--) {
        $h = imap_headerinfo($conn, $i);
        if (!$h) continue;
        $uid = !empty($h->message_id) ? $h->message_id : ("seq-" . imap_uid($conn, $i) . "-" . ($h->udate ?? ""));
        $existing = db_one($db, "SELECT id, body_html FROM ego_messages WHERE uid=?", "s", $uid);
        if ($existing) {
            // Backfill HTML for rows stored before the body_html column existed
            if (($existing["body_html"] ?? null) === null) {
                $html = inbox_html_body($conn, $i);
                if ($html !== null && $html !== "") db_exec($db, "UPDATE ego_messages SET body_html=? WHERE id=?", "si", $html, (int) $existing["id"]);
            }
            continue;
        }
        // Office already deleted this one — don't resurrect it on re-sync.
        if (db_one($db, "SELECT 1 FROM ego_deleted_uids WHERE uid=?", "s", $uid)) continue;

        $fromEmail = ""; $fromName = "";
        if (!empty($h->from[0])) {
            $f = $h->from[0];
            $fromEmail = strtolower(($f->mailbox ?? "") . "@" . ($f->host ?? ""));
            $fromName = isset($f->personal) ? imap_utf8($f->personal) : "";
        }
        $subject = isset($h->subject) ? imap_utf8($h->subject) : "(no subject)";
        $body = inbox_plain_body($conn, $i);
        $bodyHtml = inbox_html_body($conn, $i);
        // thread: customer by from-email, job by CODE-J# reference
        $cust = $fromEmail ? db_one($db, "SELECT id FROM ego_customers WHERE LOWER(email)=? AND deleted_at IS NULL", "s", $fromEmail) : null;
        $jobId = null;
        if (preg_match('/[A-Z0-9]{6}-J\d+/i', $subject . " " . $body, $mm)) {
            $j = db_one($db, "SELECT id,customer_id FROM ego_jobs WHERE reference=?", "s", strtoupper($mm[0]));
            if ($j) { $jobId = (int) $j["id"]; if (!$cust) $cust = ["id" => $j["customer_id"]]; }
        }
        $cid = $cust ? (int) $cust["id"] : null;
        // Bounce / Mail-Delivery-System notices arrive pre-archived so they never
        // clutter the inbox folder (still findable under Archived).
        $bounce = inbox_is_bounce($fromEmail, $fromName, $subject) ? 1 : 0;
        db_exec($db,
            "INSERT INTO ego_messages (customer_id,job_id,direction,channel,from_email,from_name,subject,body,body_html,uid,status,archived)
             VALUES (?,?, 'inbound','email', ?,?,?,?,?,?, 'received', ?)",
            "iissssssi", $cid, $jobId, $fromEmail, $fromName, $subject, $body, $bodyHtml, $uid, $bounce);
        $count++;
    }
    imap_close($conn);
    return $count;
}

/** Best-effort delete on the IMAP server too (delete + expunge), so the real mailbox
 *  stays in sync with the app — "keep the email fresh". Matches by Message-ID; synthetic
 *  ids are skipped. Never throws: a remote failure must not block the local delete.
 *  Returns the number of server messages removed. */
function inbox_delete_remote(mysqli $db, array $messageIds): int {
    if (!imap_available() || !$messageIds) return 0;
    if (!integ($db, "imap_host") || !integ($db, "imap_user")) return 0;
    $place = implode(",", array_fill(0, count($messageIds), "?"));
    $types = str_repeat("i", count($messageIds));
    // Only inbound mail with a real Message-ID (<...>) can be found on the server.
    $rows = db_all($db, "SELECT uid FROM ego_messages WHERE id IN ($place) AND direction='inbound' AND uid LIKE '<%'", $types, ...$messageIds);
    $ids = array_values(array_filter(array_map(fn($r) => (string) $r["uid"], $rows)));
    if (!$ids) return 0;
    try {
        $conn = @imap_open(inbox_mailbox($db), (string) integ($db, "imap_user"), (string) integ($db, "imap_pass"), 0, 1);
        if (!$conn) return 0;
        $deleted = 0;
        foreach ($ids as $mid) {
            $hits = @imap_search($conn, 'HEADER Message-ID "' . str_replace('"', "", $mid) . '"', SE_UID);
            if ($hits) foreach ($hits as $u) { @imap_delete($conn, (string) $u, FT_UID); $deleted++; }
        }
        if ($deleted) @imap_expunge($conn);
        @imap_close($conn);
        return $deleted;
    } catch (Throwable $e) { return 0; }
}
