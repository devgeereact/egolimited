<?php
/**
 * EGO LIMITED — restore (CLI ONLY). The counterpart to backup.php. Restores the
 * database or the user-files archive from ~/ego_db_backups. DESTRUCTIVE: a DB restore
 * overwrites the current database. Always take a fresh backup first.
 *
 *   php restore.php list                       # show available backups
 *   php restore.php db    ego_db_YYYY..sql.gz  # restore the database
 *   php restore.php files ego_files_YYYY..tar.gz  # restore private files + uploads + config
 *
 * See docs/RESTORE-RUNBOOK.md for the full procedure.
 */
declare(strict_types=1);
if (PHP_SAPI !== "cli") { http_response_code(404); exit; }

date_default_timezone_set("Europe/London");
$cfg  = require __DIR__ . "/config.php";
$home = realpath(__DIR__ . "/../..");
$dir  = $home . "/ego_db_backups";
$cmd  = $argv[1] ?? "list";

if (!is_dir($dir)) { fwrite(STDERR, "no backup dir: $dir\n"); exit(1); }
if (!function_exists("exec")) { fwrite(STDERR, "exec() disabled — cannot restore\n"); exit(1); }

if ($cmd === "list") {
    $files = glob("$dir/ego_*") ?: [];
    rsort($files);
    if (!$files) { echo "No backups found in $dir\n"; exit(0); }
    foreach ($files as $f) printf("%-40s %8s KB\n", basename($f), number_format(filesize($f) / 1024));
    exit(0);
}

$file = $argv[2] ?? "";
$path = "$dir/" . basename($file);               // basename blocks path traversal
if ($file === "" || !is_file($path)) { fwrite(STDERR, "backup not found: '$file' (run: php restore.php list)\n"); exit(1); }

if ($cmd === "db") {
    // Exclusive defaults-file so our creds win over the host ~/.my.cnf (same as backup.php).
    $cnf = "$dir/.rst_" . bin2hex(random_bytes(4)) . ".cnf";
    file_put_contents($cnf, "[client]\nuser=" . $cfg["db_user"] . "\npassword=\"" . $cfg["db_pass"] . "\"\nhost=" . $cfg["db_host"] . "\n");
    chmod($cnf, 0600);
    fwrite(STDERR, "!! This OVERWRITES the '" . $cfg["db_name"] . "' database with $file\n");
    $q = sprintf("gunzip -c %s | mysql --defaults-file=%s %s",
        escapeshellarg($path), escapeshellarg($cnf), escapeshellarg((string)$cfg["db_name"]));
    exec($q, $o, $rc);
    @unlink($cnf);
    echo $rc === 0 ? "Database restored from $file.\n" : "DB restore FAILED (rc=$rc)\n";
    exit($rc);
}

if ($cmd === "files") {
    // Archive holds paths relative to home (ego_private, egolimited.com/api/uploads, config.php).
    fwrite(STDERR, "!! This overwrites user files under $home from $file\n");
    $q = sprintf("tar -xzf %s -C %s", escapeshellarg($path), escapeshellarg($home));
    exec($q, $o, $rc);
    echo $rc === 0 ? "Files restored from $file.\n" : "File restore FAILED (rc=$rc)\n";
    exit($rc);
}

fwrite(STDERR, "usage: php restore.php list | db <file.sql.gz> | files <file.tar.gz>\n");
exit(1);
