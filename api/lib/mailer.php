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
function ego_send_mail(mysqli $db, string $to, ?string $toName, string $subject, string $html): void {
    if (integ($db, "smtp_host")) {
        try { ego_send_smtp($db, $to, $toName, $subject, $html); return; }
        catch (Throwable $e) { /* fall back to local sendmail */ }
    }
    ego_send_phpmail($db, $to, $toName, $subject, $html);
}

/** Local sendmail (works from web on cPanel; no outbound socket needed). */
function ego_send_phpmail(mysqli $db, string $to, ?string $toName, string $subject, string $html): void {
    $from = integ($db, "smtp_from") ?: integ($db, "smtp_user");
    if (!$from) throw new RuntimeException("No sender address (Settings → Integrations)");
    $fromName = integ($db, "smtp_from_name") ?: "EGO LIMITED";
    $headers = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$from>\r\n"
        . "Reply-To: $from\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
    if (!@mail($to, $subject, $html, $headers, "-f$from")) throw new RuntimeException("Local mail() failed");
}

function ego_send_smtp(mysqli $db, string $to, ?string $toName, string $subject, string $html): void {
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

    $headers = "From: " . mb_encode_mimeheader($fromName) . " <$from>\r\n"
        . "To: " . ($toName ? mb_encode_mimeheader($toName) . " <$to>" : $to) . "\r\n"
        . "Subject: " . mb_encode_mimeheader($subject) . "\r\n"
        . "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
    $body = preg_replace('/^\./m', '..', $html); // dot-stuffing
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
            . "<a href='$u' style='display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600'>Open job tracker</a>"
            . "<p style='margin:10px 0 0;font-size:12px;color:#64748b;word-break:break-all'>$u</p></div>";
    }
    return "<div style='font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a'>"
        . "<h2 style='color:#2563eb'>$coName</h2><p>Hi $name,</p>"
        . "<p>Please find your <strong>$label $num</strong> for <strong>&pound;$total</strong>.</p>"
        . $bankLine
        . $track
        . "<p>Reference for all correspondence: <strong>$ref</strong></p>"
        . "<p style='color:#64748b;font-size:13px'>Thank you,<br>$coName</p></div>";
}
