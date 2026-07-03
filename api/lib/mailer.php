<?php
/**
 * EGO LIMITED — lightweight SMTP mailer (M9). Self-contained raw SMTP (no heavy
 * vendor lib — the host's LiteSpeed PHP choked loading PHPMailer). Credentials
 * come from ego_integrations (entered via the UI, stored only in MySQL).
 */
declare(strict_types=1);

/**
 * Send mail: try the configured SMTP server; if the socket fails (this host
 * blocks web-initiated outbound TLS), fall back to local sendmail via mail().
 */
/**
 * Wrap email content in a clean, branded EGO LTD shell (dark header wordmark,
 * white card, contact footer). Pass the inner HTML; returns a full document.
 */
function ego_email_shell(mysqli $db, string $heading, string $innerHtml): string {
    $cs = db_one($db, "SELECT company_name,email,phone FROM ego_company_settings ORDER BY id LIMIT 1") ?? [];
    $name = htmlspecialchars(($cs["company_name"] ?? "") ?: "EGO LTD");
    $contact = implode("&nbsp;&nbsp;·&nbsp;&nbsp;", array_filter([
        htmlspecialchars($cs["phone"] ?? ""), htmlspecialchars($cs["email"] ?? ""), "egolimited.com",
    ]));
    return "<!doctype html><html><body style=\"margin:0;background:#f4f4f5;padding:24px;font-family:Arial,Helvetica,sans-serif\">"
        . "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden\">"
        . "<tr><td style=\"background:#171816;padding:18px 24px\"><span style=\"color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.05em\">$name</span>"
        . "<span style=\"display:inline-block;width:26px;height:3px;background:#EF9F27;border-radius:2px;margin-left:10px;vertical-align:middle\"></span></td></tr>"
        . "<tr><td style=\"padding:24px;color:#1f2937;font-size:14px;line-height:1.6\">"
        . ($heading !== "" ? "<h2 style=\"margin:0 0 14px;font-size:18px;color:#111827\">" . htmlspecialchars($heading) . "</h2>" : "")
        . $innerHtml
        . "</td></tr>"
        . "<tr><td style=\"padding:14px 24px;border-top:1px solid #eee;color:#9ca3af;font-size:12px\">$contact</td></tr>"
        . "</table></body></html>";
}

/**
 * Fill personalisation tokens per recipient so a bulk send addresses each person by name
 * with their own details. Known tokens use real data; common business tokens get a sensible
 * generic fallback; anything unfilled is stripped so a raw {{token}} never ships.
 * $ctx keys: first_name, name, sender_name, company_name.
 */
function ego_merge_tokens(string $text, array $ctx): string {
    $known = [
        "first_name" => $ctx["first_name"] ?? "", "name" => $ctx["first_name"] ?? "",
        "firstname" => $ctx["first_name"] ?? "", "first name" => $ctx["first_name"] ?? "",
        "full_name" => ($ctx["name"] ?? "") ?: ($ctx["first_name"] ?? ""),
        "sender_name" => $ctx["sender_name"] ?? "", "company" => $ctx["company_name"] ?? "",
        "company_name" => $ctx["company_name"] ?? "",
    ];
    $fallback = [
        "agency_name" => "your business", "business_name" => "your business",
        "property_or_premises" => "your property", "property_or_portfolio" => "your property",
        "property_address" => "your property", "job_summary" => "your job",
        "last_job_summary" => "your last job", "month" => date("F"), "season" => "the season",
    ];
    $out = (string) preg_replace_callback('/\{\{\s*([A-Za-z0-9_ ]+?)\s*\}\}/', function ($mm) use ($known, $fallback) {
        $k = strtolower(trim($mm[1]));
        if (($known[$k] ?? "") !== "") return $known[$k];
        return $fallback[$k] ?? ""; // unknown/blank token → removed, never shown
    }, $text);
    $out = (string) preg_replace('/[ \t]{2,}/', " ", $out);        // tidy gaps a removed token left
    $out = (string) preg_replace('/\s+([,.!?])/', '$1', $out);     // no space before punctuation
    return $out;
}

/** Stable, non-trivial one-click unsubscribe token for a recipient (UK PECR opt-out). */
function ego_unsub_token(string $email): string {
    return substr(hash_hmac("sha256", strtolower(trim($email)), "ego-unsub-v1"), 0, 24);
}

/** Readable plain-text from our HTML emails — for the multipart/alternative fallback. */
function ego_html_to_text(string $html): string {
    $t = preg_replace('/<(br|\/p|\/div|\/h[1-6]|\/tr|\/li)\b[^>]*>/i', "\n", $html);
    $t = strip_tags($t);
    $t = html_entity_decode($t, ENT_QUOTES | ENT_HTML5, "UTF-8");
    $t = preg_replace('/[ \t]+/', " ", $t);
    $t = preg_replace('/\n{3,}/', "\n\n", (string) $t);
    return trim((string) $t);
}

/** Build a multipart/alternative body (text/plain then text/html) for the given boundary. */
function ego_mime_alt(string $html, string $boundary): string {
    $text = ego_html_to_text($html);
    return "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n$text\r\n\r\n"
        . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n$html\r\n\r\n--$boundary--\r\n";
}

/** Full MIME body for the given top boundary. With attachments → multipart/mixed
 *  wrapping the alternative part + each file (base64); without → plain alternative.
 *  Each attachment: ["name"=>string, "mime"=>string, "data"=>raw bytes]. */
function ego_mime_body(string $html, array $attachments, string $boundary): string {
    if (!$attachments) return ego_mime_alt($html, $boundary);
    $alt = "=_alt_" . bin2hex(random_bytes(6));
    $out = "--$boundary\r\nContent-Type: multipart/alternative; boundary=\"$alt\"\r\n\r\n"
        . ego_mime_alt($html, $alt) . "\r\n";
    foreach ($attachments as $a) {
        $fn = str_replace(['"', "\r", "\n"], "", (string) ($a["name"] ?? "attachment"));
        $mime = str_replace(['"', "\r", "\n"], "", (string) ($a["mime"] ?? "application/octet-stream"));
        $out .= "--$boundary\r\n"
            . "Content-Type: $mime; name=\"$fn\"\r\n"
            . "Content-Transfer-Encoding: base64\r\n"
            . "Content-Disposition: attachment; filename=\"$fn\"\r\n\r\n"
            . chunk_split(base64_encode((string) ($a["data"] ?? ""))) . "\r\n";
    }
    return $out . "--$boundary--\r\n";
}

/** The Content-Type for the top-level part given whether there are attachments. */
function ego_top_ctype(array $attachments): string { return $attachments ? "multipart/mixed" : "multipart/alternative"; }

/** Record an outbound email in ego_messages so EVERY email the app sends (invoices,
 *  quotes, reminders, replies) shows up in the Sent folder. Best-effort — a logging
 *  failure must never break the actual send. Self-contained so cron can call it too. */
function ego_record_sent(mysqli $db, ?int $cid, ?int $jobId, string $to, string $subject, string $html): int {
    $s = @$db->prepare("INSERT INTO ego_messages (customer_id,job_id,direction,channel,to_email,subject,body,body_html,status)
                        VALUES (?,?, 'outbound','email', ?,?,?,?, 'sent')");
    if (!$s) return 0;
    $body = ego_html_to_text($html);
    $s->bind_param("iissss", $cid, $jobId, $to, $subject, $body, $html);
    try { $s->execute(); } catch (Throwable $e) { return 0; }
    return (int)$db->insert_id;
}

/** RFC 2606/6761 reserved + demo placeholder domains — mail here can never be
 *  delivered and just rots in the queue (the "delayed 72 hours" warnings). Skip it. */
function ego_is_undeliverable(string $email): bool {
    $at = strrchr($email, "@");
    if ($at === false) return true;
    $d = strtolower(substr($at, 1));
    foreach (["example.com", "example.org", "example.net", "example.co.uk", "example.edu", "test", "invalid", "localhost", "local", "example"] as $r) {
        if ($d === $r || str_ends_with($d, ".$r")) return true;
    }
    return false;
}

function ego_send_mail(mysqli $db, string $to, ?string $toName, string $subject, string $html, array $attachments = []): void {
    // Never queue mail to reserved/demo addresses — prevents the 72h bounce warnings.
    if (ego_is_undeliverable($to)) return;
    if (integ($db, "smtp_host")) {
        try { ego_send_smtp($db, $to, $toName, $subject, $html, $attachments); return; }
        catch (Throwable $e) { /* fall back to local sendmail */ }
    }
    ego_send_phpmail($db, $to, $toName, $subject, $html, $attachments);
}

/** Local sendmail (works from web on cPanel; no outbound socket needed). */
function ego_send_phpmail(mysqli $db, string $to, ?string $toName, string $subject, string $html, array $attachments = []): void {
    $from = integ($db, "smtp_from") ?: integ($db, "smtp_user");
    if (!$from) throw new RuntimeException("No sender address (Settings → Integrations)");
    $fromName = integ($db, "smtp_from_name") ?: "EGO LIMITED";
    $boundary = "=_ego_" . bin2hex(random_bytes(8));
    $headers = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$from>\r\n"
        . "Reply-To: $from\r\nMIME-Version: 1.0\r\n"
        . "Content-Type: " . ego_top_ctype($attachments) . "; boundary=\"$boundary\"\r\n";
    if (!@mail($to, $subject, ego_mime_body($html, $attachments, $boundary), $headers, "-f$from")) throw new RuntimeException("Local mail() failed");
}

function ego_send_smtp(mysqli $db, string $to, ?string $toName, string $subject, string $html, array $attachments = []): void {
    $host = integ($db, "smtp_host");
    $user = integ($db, "smtp_user");
    $pass = (string) integ($db, "smtp_pass");
    $port = (int) (integ($db, "smtp_port") ?? 587);
    $from = integ($db, "smtp_from") ?: $user;
    $fromName = integ($db, "smtp_from_name") ?: "EGO LIMITED";
    $secure = strtolower(integ($db, "smtp_secure") ?: "tls");
    if (!$host || !$from) throw new RuntimeException("SMTP not configured");

    $transport = $secure === "ssl" ? "ssl://$host" : "tcp://$host";
    $ctx = stream_context_create(["ssl" => ["verify_peer" => false, "verify_peer_name" => false]]);
    $fp = @stream_socket_client("$transport:$port", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new RuntimeException("SMTP connect failed: $errstr");
    stream_set_timeout($fp, 15);

    $read = function () use ($fp): string {
        $data = "";
        while (($line = fgets($fp, 515)) !== false) {
            $data .= $line;
            if (strlen($line) >= 4 && $line[3] === " ") break;
        }
        return $data;
    };
    $expect = function (string $sent, array $codes) use ($fp, $read): string {
        if ($sent !== "") fwrite($fp, $sent . "\r\n");
        $r = $read();
        $code = substr($r, 0, 3);
        if (!in_array($code, $codes, true)) throw new RuntimeException("SMTP: " . trim($r));
        return $r;
    };

    $expect("", ["220"]);                                  // greeting
    $expect("EHLO egolimited", ["250"]);
    if ($secure === "tls") {
        $expect("STARTTLS", ["220"]);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
            throw new RuntimeException("STARTTLS failed");
        }
        $expect("EHLO egolimited", ["250"]);
    }
    if ($user) {
        $expect("AUTH LOGIN", ["334"]);
        $expect(base64_encode($user), ["334"]);
        $expect(base64_encode($pass), ["235"]);            // 235 = auth ok
    }
    $expect("MAIL FROM:<$from>", ["250"]);
    $expect("RCPT TO:<$to>", ["250", "251"]);
    $expect("DATA", ["354"]);

    $boundary = "=_ego_" . bin2hex(random_bytes(8));
    $headers = "From: " . mb_encode_mimeheader($fromName) . " <$from>\r\n"
        . "To: " . ($toName ? mb_encode_mimeheader($toName) . " <$to>" : $to) . "\r\n"
        . "Subject: " . mb_encode_mimeheader($subject) . "\r\n"
        . "MIME-Version: 1.0\r\nContent-Type: " . ego_top_ctype($attachments) . "; boundary=\"$boundary\"\r\n";
    $body = preg_replace('/^\./m', '..', ego_mime_body($html, $attachments, $boundary)); // dot-stuffing
    fwrite($fp, $headers . "\r\n" . $body . "\r\n.\r\n");
    $expect("", ["250"]);
    @fwrite($fp, "QUIT\r\n");
    fclose($fp);
}

/** Simple branded HTML for an invoice/quote email (merge fields from the doc). */
function render_invoice_email(array $inv, ?array $company, ?string $trackUrl = null): string {
    $co = $company ?? [];
    $label = $inv["kind"] === "quote" ? "Quote" : "Invoice";
    $num = htmlspecialchars($inv["number"] ?? $inv["payment_reference"]);
    $ref = htmlspecialchars($inv["payment_reference"]);
    $name = htmlspecialchars($inv["customer_name"] ?? "there");
    $total = number_format((float) $inv["total"], 2);
    $coName = htmlspecialchars($co["company_name"] ?? "EGO LIMITED");
    $bankLine = "";
    if ($inv["kind"] === "invoice") {
        $bankLine = "<p style='margin:16px 0;padding:12px;background:#f1f5f9;border-radius:8px'>"
            . "<strong>Pay by bank transfer</strong><br>"
            . htmlspecialchars($co["bank_account_name"] ?? "") . " &middot; Sort " . htmlspecialchars($co["bank_sort_code"] ?? "")
            . " &middot; Acc " . htmlspecialchars($co["bank_account_number"] ?? "") . "<br>"
            . "Payment reference: <strong>$ref</strong></p>";
    }
    // Tracking link → opens the customer portal (live progress + a scannable QR). Self-hosted, no third party.
    $track = "";
    if ($trackUrl) {
        $u = htmlspecialchars($trackUrl);
        $track = "<div style='margin:18px 0;padding:14px;border:1px solid #e2e8f0;border-radius:8px;text-align:center'>"
            . "<p style='margin:0 0 10px;font-size:14px'><strong>Track your job online</strong><br>"
            . "<span style='color:#64748b;font-size:13px'>Live progress, your documents and a scannable code.</span></p>"
            . "<a href='$u' style='display:inline-block;padding:10px 18px;background:#EF9F27;color:#171816;border-radius:8px;text-decoration:none;font-weight:700'>Open job tracker</a>"
            . "<p style='margin:10px 0 0;font-size:12px;color:#64748b;word-break:break-all'>$u</p></div>";
    }
    return "<div style='font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a'>"
        . "<h2 style='color:#171816'>$coName<span style='display:inline-block;width:24px;height:3px;background:#EF9F27;border-radius:2px;margin-left:8px;vertical-align:middle'></span></h2><p>Hi $name,</p>"
        . "<p>Please find your <strong>$label $num</strong> for <strong>&pound;$total</strong>.</p>"
        . $bankLine
        . $track
        . "<p>Reference for all correspondence: <strong>$ref</strong></p>"
        . "<p style='color:#64748b;font-size:13px'>Thank you,<br>$coName</p></div>";
}
