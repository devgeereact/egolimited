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

/* ---------------- Attachments (stored off web root; served via signed URL) ---------------- */
// Self-contained here (not in index.php) because cron.php also drives inbox_sync().

// NOTE: this file lives in api/lib, so it needs THREE "../" to reach ~/ego_private
// (home dir, OUTSIDE the web root) — matching index.php's mail_attach_dir() which is
// in api/ and uses two. Keep these two in sync or downloads 404 / files leak into docroot.
function inbox_attach_dir(): string { return __DIR__ . "/../../../ego_private/mail_attach"; }

function inbox_ensure_attachments(mysqli $db): void {
    $db->query("CREATE TABLE IF NOT EXISTS ego_message_attachments (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        filename   VARCHAR(255) NOT NULL,
        mime       VARCHAR(160) NOT NULL DEFAULT 'application/octet-stream',
        size       INT NOT NULL DEFAULT 0,
        storage    VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX (message_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/** Original filename of a MIME part (Content-Disposition filename, else Content-Type name). "" if none. */
function inbox_part_filename($part): string {
    $pick = function ($list, $attr): string {
        if (!empty($list)) foreach ($list as $p) {
            if (strcasecmp((string)($p->attribute ?? ""), $attr) === 0) return (string)($p->value ?? "");
        }
        return "";
    };
    $fn = $pick($part->dparameters ?? [], "filename");
    if ($fn === "") $fn = $pick($part->parameters ?? [], "name");
    if ($fn === "") return "";
    return trim(imap_utf8($fn));
}

/** primary/subtype for a MIME part (IMAP encodes the primary type as an int). */
function inbox_part_mime($part): string {
    $types = [0 => "text", 1 => "multipart", 2 => "message", 3 => "application", 4 => "audio", 5 => "image", 6 => "video", 7 => "model", 8 => "other"];
    $primary = $types[$part->type ?? 3] ?? "application";
    return $primary . "/" . strtolower((string)($part->subtype ?? "octet-stream"));
}

/** basename + strip control chars; keeps the extension. Never empty. */
function inbox_safe_filename(string $n): string {
    $n = basename(str_replace("\\", "/", $n));
    $n = trim((string) preg_replace('/[\r\n\x00]+/', "", $n));
    if ($n === "") $n = "attachment";
    return strlen($n) > 200 ? substr($n, 0, 200) : $n;
}

/** Walk the MIME tree, collecting every leaf that carries a filename (a real attachment). */
function inbox_collect_attachments($conn, int $i, $struct, string $prefix, array &$out): void {
    if (empty($struct->parts)) return;
    foreach ($struct->parts as $idx => $part) {
        $sec = $prefix . ($idx + 1);
        $name = inbox_part_filename($part);
        // A named, non-multipart part is an attachment — capture it and don't descend into it.
        if ($name !== "" && ($part->type ?? -1) !== 1) { $out[] = ["section" => $sec, "part" => $part, "name" => $name]; continue; }
        if (!empty($part->parts)) inbox_collect_attachments($conn, $i, $part, $sec . ".", $out);
    }
}

/** Save a message's attachments to disk + ego_message_attachments. Returns count saved. */
function inbox_store_attachments(mysqli $db, $conn, int $i, $struct, int $messageId): int {
    $leaves = [];
    inbox_collect_attachments($conn, $i, $struct, "", $leaves);
    if (!$leaves) return 0;
    inbox_ensure_attachments($db);
    $dir = inbox_attach_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) return 0;
    $saved = 0;
    foreach ($leaves as $lf) {
        $raw = imap_fetchbody($conn, $i, $lf["section"]);
        if ($raw === false || $raw === "") continue;
        $bin = inbox_decode($raw, $lf["part"]->encoding ?? 0);
        if ($bin === "" || strlen($bin) > 20_000_000) continue; // 20 MB per-file cap
        $safeName = inbox_safe_filename($lf["name"]);
        $ext = strtolower((string) preg_replace('/[^a-z0-9]+/i', "", pathinfo($safeName, PATHINFO_EXTENSION)));
        $stored = "att{$messageId}_" . bin2hex(random_bytes(8)) . ($ext !== "" ? ".$ext" : "");
        if (@file_put_contents("$dir/$stored", $bin) === false) continue;
        db_exec($db, "INSERT INTO ego_message_attachments (message_id,filename,mime,size,storage) VALUES (?,?,?,?,?)",
            "issis", $messageId, $safeName, inbox_part_mime($lf["part"]), strlen($bin), $stored);
        $saved++;
    }
    return $saved;
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
/**
 * Pull the address a bounce is ABOUT out of the notice body. The bounce itself comes from
 * mailer-daemon@…, so suppressing its From: would suppress the postmaster and leave the actually
 * dead address happily receiving the rest of the sequence.
 */
function inbox_bounced_address(string $text): ?string {
    // Delivery reports name the failed recipient explicitly; prefer that over any address in the body.
    if (preg_match('/(?:Final-Recipient|Original-Recipient)\s*:\s*[^;]*;\s*([^\s<>]+@[^\s<>]+)/i', $text, $m)) {
        return strtolower(trim($m[1], " \t<>.,;"));
    }
    if (preg_match('/(?:failed|undelivered|not delivered|could not be delivered)[^\n]{0,80}?([^\s<>]+@[^\s<>]+)/i', $text, $m)) {
        return strtolower(trim($m[1], " \t<>.,;"));
    }
    return null;
}

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
        // Save any attachments in their original form (off web root). Never let a bad
        // attachment abort the whole sync — the message row is already stored.
        $mid = (int) $db->insert_id;
        try { inbox_store_attachments($db, $conn, $i, imap_fetchstructure($conn, $i), $mid); } catch (Throwable $e) { /* skip */ }

        /* ---- campaigns: a bounce suppresses, a reply stops the sequence ----
         * v1 only ARCHIVED the bounce notice. The lead stayed 'approved' and kept receiving every
         * subsequent drip step forever — mailing an address the server has already told us is dead,
         * which is the fastest way to destroy a sending reputation. And a lead who actually REPLIED
         * kept getting nudged, which is simply rude and is the strongest "stop" signal there is.
         * Both are handled here, at the one place inbound mail enters the system. */
        try {
            require_once __DIR__ . "/campaigns.php";
            if ($fromEmail) {
                if ($bounce) {
                    // The bounce's own From: is the mail daemon, so find the address it's about.
                    $target = inbox_bounced_address($body . " " . $subject) ?: $fromEmail;
                    supp_add($db, $target, "bounced", "imap bounce", substr($subject, 0, 200));
                    camp_stop_email($db, $target, "bounced", "hard bounce");
                } else {
                    // A human replied. Stop every sequence they're in — and say why.
                    camp_stop_email($db, $fromEmail, "replied", "replied to us");
                }
            }
        } catch (Throwable $e) { /* never let campaign bookkeeping break the mail sync */ }

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
