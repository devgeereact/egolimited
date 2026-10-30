<?php
/**
 * EGO LIMITED — apply numbered SQL migrations from api/migrations/ (CLI only, idempotent).
 *   php migrate_sql.php           apply pending files in order
 *   php migrate_sql.php --list    show applied / pending, change nothing
 * Run with the MIGRATION database user (needs ALTER/CREATE INDEX). Take a cPanel DB backup first.
 */
declare(strict_types=1);
if (PHP_SAPI !== "cli") { http_response_code(404); exit; }
$cfg = require __DIR__ . "/config.php";
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($cfg["db_host"], $cfg["migrate_db_user"] ?? $cfg["db_user"], $cfg["migrate_db_pass"] ?? $cfg["db_pass"], $cfg["db_name"]);
$db->set_charset("utf8mb4");
$db->query("CREATE TABLE IF NOT EXISTS ego_migrations (name VARCHAR(120) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$done = array_column($db->query("SELECT name FROM ego_migrations")->fetch_all(MYSQLI_ASSOC), "name");
$files = glob(__DIR__ . "/migrations/*.sql") ?: [];
sort($files);
foreach ($files as $f) {
    $name = basename($f);
    if (in_array($name, $done, true)) { echo "applied  $name\n"; continue; }
    if (in_array("--list", $argv, true)) { echo "pending  $name\n"; continue; }
    $sql = preg_replace('/^\s*--.*$/m', "", (string) file_get_contents($f));
    foreach (array_filter(array_map("trim", explode(";", $sql))) as $stmt) $db->query($stmt);
    $st = $db->prepare("INSERT INTO ego_migrations (name) VALUES (?)");
    $st->bind_param("s", $name); $st->execute();
    echo "ran      $name\n";
}
