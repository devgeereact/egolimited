<?php
/**
 * EGO LIMITED — Clerk first-sign-in linking, against a THROWAWAY MariaDB (never the live DB).
 *   EGO_TEST_DB_HOST=127.0.0.1 EGO_TEST_DB_PORT=33077 EGO_TEST_DB_USER=root EGO_TEST_DB_NAME=egotest php api/tests/clerk_link.php
 * Skips (exit 0) when EGO_TEST_DB_NAME is unset, so CI without a database is unaffected.
 */
declare(strict_types=1);
if (!getenv("EGO_TEST_DB_NAME")) { echo "skipped: EGO_TEST_DB_NAME not set\n"; exit(0); }
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli(getenv("EGO_TEST_DB_HOST") ?: "127.0.0.1", getenv("EGO_TEST_DB_USER") ?: "root", getenv("EGO_TEST_DB_PASS") ?: "", getenv("EGO_TEST_DB_NAME"), (int) (getenv("EGO_TEST_DB_PORT") ?: 3306));
$db->set_charset("utf8mb4");
if (!preg_match('/test/i', (string) getenv("EGO_TEST_DB_NAME"))) { fwrite(STDERR, "refusing: database name must contain 'test'\n"); exit(2); }
require __DIR__ . "/../lib/db.php";
require __DIR__ . "/../lib/clerk_auth.php";

$db->query("DROP TABLE IF EXISTS ego_users");
$db->query("CREATE TABLE ego_users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NULL, role VARCHAR(20) NOT NULL DEFAULT 'engineer', active TINYINT(1) NOT NULL DEFAULT 1, phone VARCHAR(40) NULL, available TINYINT(1) NOT NULL DEFAULT 1, must_change_password TINYINT(1) NOT NULL DEFAULT 0, totp_enabled TINYINT(1) NOT NULL DEFAULT 0, deleted_at DATETIME NULL) ENGINE=InnoDB");
$sql = preg_replace('/^\s*--.*$/m', "", (string) file_get_contents(__DIR__ . "/../migrations/001_clerk_user_id.sql"));
foreach (array_filter(array_map("trim", explode(";", $sql))) as $st) $db->query($st);
$db->query("INSERT INTO ego_users (name,email,role,must_change_password) VALUES ('Fran','fran@example.com','founder',1),('Eve','eve@example.com','engineer',0),('Gone','gone@example.com','office',0)");
$db->query("UPDATE ego_users SET active=0 WHERE email='gone@example.com'");

$n = 0; $bad = 0;
function check(bool $c, string $w): void { global $n, $bad; $n++; if (!$c) { $bad++; echo "FAIL: $w\n"; } }

$u = clerk_resolve_user($db, ["sub" => "user_fran", "email" => "Fran@Example.com"]);
check($u !== null && $u["role"] === "founder", "approved email links on first sign-in (case-insensitive) and keeps its role");
check($u !== null && (int) $u["must_change_password"] === 0, "legacy must_change_password does not block a Clerk user");
check(db_one($db, "SELECT clerk_user_id c FROM ego_users WHERE email='fran@example.com'")["c"] === "user_fran", "clerk_user_id was stored");
$u = clerk_resolve_user($db, ["sub" => "user_fran"]);
check($u !== null && $u["email"] === "fran@example.com", "second sign-in matches on clerk_user_id alone (no email claim needed)");
check(clerk_resolve_user($db, ["sub" => "user_mallory", "email" => "fran@example.com"]) === null, "a different Clerk user cannot take over an already-linked staff row");
check(clerk_resolve_user($db, ["sub" => "user_x", "email" => "stranger@example.com"]) === null, "unknown email gets no access");
check(db_one($db, "SELECT COUNT(*) c FROM ego_users")["c"] == 3, "sign-in never creates staff rows");
check(clerk_resolve_user($db, ["sub" => "user_gone", "email" => "gone@example.com"]) === null, "deactivated staff cannot link or sign in");
check(clerk_resolve_user($db, ["sub" => "user_nomail"]) === null, "no email claim + unknown sub => no access");
check(clerk_resolve_user($db, ["sub" => "user_bad", "email" => "not-an-email"]) === null, "malformed email claim => no access");
check(clerk_resolve_user($db, ["sub" => str_repeat("a", 65), "email" => "eve@example.com"]) === null, "oversized sub rejected");
$db->query("UPDATE ego_users SET active=0 WHERE email='fran@example.com'");
check(clerk_resolve_user($db, ["sub" => "user_fran"]) === null, "deactivating a linked user cuts access immediately");
$dup = false; try { $db->query("UPDATE ego_users SET clerk_user_id='user_fran' WHERE email='eve@example.com'"); } catch (mysqli_sql_exception) { $dup = true; }
check($dup, "clerk_user_id is unique");
printf("\n  %d checks, %d failed\n", $n, $bad);
exit($bad === 0 ? 0 : 1);
