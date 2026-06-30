<?php
/**
 * EGO LIMITED — TOTP (RFC 6238) helpers for 2-factor auth.
 * SHA1, 6 digits, 30s step. No external deps.
 */
declare(strict_types=1);

/** Generate a random base32 secret (default 160-bit / 32 chars). */
function totp_secret(int $bytes = 20): string {
    $alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    $raw = random_bytes($bytes);
    $bits = "";
    for ($i = 0; $i < strlen($raw); $i++) $bits .= str_pad(decbin(ord($raw[$i])), 8, "0", STR_PAD_LEFT);
    $out = "";
    foreach (str_split($bits, 5) as $chunk) {
        if (strlen($chunk) < 5) $chunk = str_pad($chunk, 5, "0");
        $out .= $alphabet[bindec($chunk)];
    }
    return $out;
}

/** Decode a base32 string to raw bytes. */
function totp_base32_decode(string $b32): string {
    $alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    $b32 = strtoupper(preg_replace("/[^A-Z2-7]/", "", $b32));
    if ($b32 === "") return "";
    $bits = "";
    for ($i = 0; $i < strlen($b32); $i++) $bits .= str_pad(decbin(strpos($alphabet, $b32[$i])), 5, "0", STR_PAD_LEFT);
    $bytes = "";
    foreach (str_split($bits, 8) as $chunk) {
        if (strlen($chunk) === 8) $bytes .= chr(bindec($chunk));
    }
    return $bytes;
}

/** The 6-digit code for a given secret at a given time-step counter. */
function totp_code(string $secret, int $counter): string {
    $key = totp_base32_decode($secret);
    $bin = pack("N*", 0) . pack("N*", $counter); // 8-byte big-endian counter
    $hash = hash_hmac("sha1", $bin, $key, true);
    $offset = ord($hash[19]) & 0xf;
    $part = (
        ((ord($hash[$offset]) & 0x7f) << 24) |
        ((ord($hash[$offset + 1]) & 0xff) << 16) |
        ((ord($hash[$offset + 2]) & 0xff) << 8) |
        (ord($hash[$offset + 3]) & 0xff)
    );
    return str_pad((string)($part % 1000000), 6, "0", STR_PAD_LEFT);
}

/** Verify a user-supplied code against the secret, allowing +/-1 step of drift. */
function totp_verify(string $secret, string $code, int $now = 0): bool {
    $code = preg_replace("/\D/", "", $code);
    if (strlen($code) !== 6 || $secret === "") return false;
    $step = intdiv($now > 0 ? $now : time(), 30);
    for ($w = -1; $w <= 1; $w++) {
        if (hash_equals(totp_code($secret, $step + $w), $code)) return true;
    }
    return false;
}

/** otpauth:// URI for QR codes / authenticator apps. */
function totp_uri(string $secret, string $email, string $issuer = "EGO LIMITED"): string {
    return "otpauth://totp/" . rawurlencode("$issuer:$email") . "?secret=$secret&issuer=" . rawurlencode($issuer) . "&algorithm=SHA1&digits=6&period=30";
}
