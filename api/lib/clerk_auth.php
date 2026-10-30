<?php
/**
 * EGO LIMITED — Clerk sign-in: from a verified session token to an ego_users row.
 *
 * Roles never live in Clerk. They stay in ego_users; Clerk only proves WHO is calling.
 *   1. Match on ego_users.clerk_user_id (the Clerk "sub").
 *   2. First sign-in only: match an active staff row by the token's verified email claim, with
 *      clerk_user_id still empty, and link it. A row already linked to a DIFFERENT Clerk user is
 *      never re-linked.
 *   3. Anyone else gets nothing (null => 401). Clerk sign-up does NOT create staff.
 */
declare(strict_types=1);

require_once __DIR__ . "/clerk_jwt.php";

const CLERK_USER_COLUMNS = "id,name,email,role,active,phone,available,must_change_password,totp_enabled";

function clerk_configured(array $cfg): bool {
    return !empty($cfg["clerk_issuer"]) && !empty($cfg["clerk_authorized_parties"]);
}

/** Does this bearer value look like a JWT (three dot-separated parts) rather than a legacy session token? */
function looks_like_jwt(string $tok): bool { return substr_count($tok, ".") === 2; }

function clerk_fetch_json(string $url): string {
    $ctx = stream_context_create(["http" => ["timeout" => 5, "ignore_errors" => false], "ssl" => ["verify_peer" => true, "verify_peer_name" => true]]);
    $r = @file_get_contents($url, false, $ctx);
    if ($r === false) throw new RuntimeException("jwks fetch failed");
    return $r;
}

function clerk_verifier(array $cfg): EgoClerkJwt {
    $dir = (string) ($cfg["clerk_cache_dir"] ?? dirname(__DIR__, 2) . "/ego_private/cache");
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return new EgoClerkJwt((string) $cfg["clerk_issuer"], (array) $cfg["clerk_authorized_parties"], $dir, "clerk_fetch_json");
}

/**
 * Resolve verified claims to an active staff row, linking on first sign-in. Returns null if the
 * person is not approved. Does no signature checking: pass only claims from EgoClerkJwt::verify().
 */
function clerk_resolve_user(mysqli $db, array $claims): ?array {
    $sub = (string) ($claims["sub"] ?? "");
    if ($sub === "" || strlen($sub) > 64) return null;
    $active = " AND active = 1 AND deleted_at IS NULL";
    $u = db_one($db, "SELECT " . CLERK_USER_COLUMNS . " FROM ego_users WHERE clerk_user_id = ?" . $active, "s", $sub);
    if (!$u) {
        $email = strtolower(trim((string) ($claims["email"] ?? "")));
        if ($email === "" || strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) return null;
        $row = db_one($db, "SELECT id FROM ego_users WHERE email = ? AND clerk_user_id IS NULL" . $active, "s", $email);
        if (!$row) return null;
        $st = db_exec($db, "UPDATE ego_users SET clerk_user_id = ? WHERE id = ? AND clerk_user_id IS NULL", "si", $sub, (int) $row["id"]);
        if ($st->affected_rows !== 1) return null; // lost a race: someone else linked it
        $u = db_one($db, "SELECT " . CLERK_USER_COLUMNS . " FROM ego_users WHERE id = ?" . $active, "i", (int) $row["id"]);
        if (!$u) return null;
    }
    // Clerk already proved identity (email code): the legacy password/2FA flags no longer apply.
    $u["must_change_password"] = 0;
    return $u;
}

/** Bearer JWT => staff row, or null. Never throws. */
function clerk_current_user(mysqli $db, array $cfg, string $tok): ?array {
    if (!clerk_configured($cfg)) return null;
    try {
        $claims = clerk_verifier($cfg)->verify($tok);
    } catch (Throwable) {
        return null;
    }
    return clerk_resolve_user($db, $claims);
}
