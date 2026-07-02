<?php
/**
 * EGO LIMITED — backup (CLI ONLY). Dumps the MySQL database and archives the
 * non-git user data (private job photos + mail attachments, campaign uploads,
 * server config.php) into ~/ego_db_backups, OUTSIDE the web root. Keeps the
 * newest 14 of each. Run daily from cPanel cron:
 *
 *   /usr/local/bin/php ~/egolimited.com/api/backup.php >> ~/ego_db_backups/backup.log 2>&1
 *
 * The app code itself lives in git, so this focuses on what git can't restore:
 * the database and uploaded files.
 */
declare(strict_types=1);

// HARD CLI GUARD — this dumps the entire database; it must never be reachable over HTTP.
if (PHP_SAPI !== "cli") { http_response_code(404); exit; }

$cfg  = require __DIR__ . "/config.php";
$home = realpath(__DIR__ . "/../..");            // ~/egolimited.com/api  ->  ~
$dir  = $home . "/ego_db_backups";
if (!is_dir($dir) && !mkdir($dir, 0700, true)) { fwrite(STDERR, "cannot create $dir\n"); exit(1); }

if (!function_exists("exec")) { fwrite(STDERR, "exec() is disabled on this host — cannot run mysqldump/tar\n"); exit(1); }

$stamp  = date("Ymd_His");
$errors = 0;

/* 1) Database dump. Use an EXCLUSIVE --defaults-file (0600, in the private backup dir) so our
 *    config creds win over the host's ~/.my.cnf, and so the password never appears in argv.
 *    Dump to a plain .sql first (to capture mysqldump's real exit code), then gzip. */
$sql = "$dir/ego_db_$stamp.sql";
$cnf = "$dir/.bk_$stamp.cnf";
file_put_contents($cnf, "[client]\nuser=" . $cfg["db_user"] . "\npassword=\"" . $cfg["db_pass"] . "\"\nhost=" . $cfg["db_host"] . "\n");
chmod($cnf, 0600);
$cmd = "mysqldump --defaults-file=" . escapeshellarg($cnf)
     . " --single-transaction --quick --no-tablespaces --skip-lock-tables "
     . escapeshellarg((string)$cfg["db_name"]) . " > " . escapeshellarg($sql) . " 2>/dev/null";
exec($cmd, $o1, $rc1);
@unlink($cnf);
if ($rc1 === 0 && is_file($sql) && filesize($sql) > 500) {
    exec("gzip -f " . escapeshellarg($sql));
    echo "DB dump: " . round(@filesize("$sql.gz") / 1024) . " KB -> " . basename("$sql.gz") . "\n";
} else { echo "DB dump FAILED (rc=$rc1)\n"; $errors++; @unlink($sql); }

/* 2) Archive the non-git user data + server config (unrecoverable from git). */
$filesTar = "$dir/ego_files_$stamp.tar.gz";
$targets = [];
foreach (["ego_private", "egolimited.com/api/uploads", "egolimited.com/api/config.php"] as $t) {
    if (file_exists("$home/$t")) $targets[] = $t;
}
if ($targets) {
    $cmd2 = "tar -czf " . escapeshellarg($filesTar) . " -C " . escapeshellarg($home) . " "
          . implode(" ", array_map("escapeshellarg", $targets)) . " 2>/dev/null";
    exec($cmd2, $o2, $rc2);
    if ($rc2 !== 0 || !is_file($filesTar)) { echo "files archive FAILED (rc=$rc2)\n"; $errors++; @unlink($filesTar); }
    else echo "files archive: " . round(filesize($filesTar) / 1024) . " KB -> " . basename($filesTar) . "\n";
}

/* 3) Rotate — keep the newest 14 of each kind (timestamped names sort lexically). */
foreach (["ego_db_*.sql.gz", "ego_files_*.tar.gz"] as $glob) {
    $files = glob("$dir/$glob") ?: [];
    rsort($files);
    foreach (array_slice($files, 14) as $old) @unlink($old);
}

echo date("c") . " backup " . ($errors ? "completed with $errors error(s)" : "OK") . "\n";
exit($errors ? 1 : 0);
