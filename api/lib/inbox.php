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

/** Pull recent mail into ego_messages. Returns count of new messages stored. */
function inbox_sync(mysqli $db): int {
    if (!imap_available()) throw new RuntimeException("IMAP not available on this server's PHP");
    $host = integ($db, "imap_host"); $user = integ($db, "imap_user"); $pass = (string) integ($db, "imap_pass");
    $port = (int) (integ($db, "imap_port") ?? 993);
    $secure = strtolower(integ($db, "imap_secure") ?: "ssl");
    if (!$host || !$user) throw new RuntimeException("IMAP not configured (Settings → Integrations)");
    $flags = $secure === "ssl" ? "/imap/ssl/novalidate-cert"
        : ($secure === "tls" ? "/imap/tls/novalidate-cert" : "/imap/notls");
    $mailbox = "{" . $host . ":" . $port . $flags . "}INBOX";

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
        db_exec($db,
            "INSERT INTO ego_messages (customer_id,job_id,direction,channel,from_email,from_name,subject,body,body_html,uid,status)
             VALUES (?,?, 'inbound','email', ?,?,?,?,?,?, 'received')",
            "iisssssss", $cid, $jobId, $fromEmail, $fromName, $subject, $body, $bodyHtml, $uid);
        $count++;
    }
    imap_close($conn);
    return $count;
}
