#!/bin/bash
# EGO LIMITED — daily MySQL backup of the live standalone DB (devgeereact_egolimited).
# Creds read from the server config.php (never hard-coded). Keeps 14 days. Run via cron.
set -euo pipefail
CFG="/home/devgeereact/egolimited.com/api/config.php"
DEST="/home/devgeereact/backups"
mkdir -p "$DEST"

# Credentials go to mysqldump through a private option file, never on its command line
# (where any local user could read them from the process list). The file is created
# mode 600 by mktemp, written directly by PHP so the password never passes through a
# shell variable, and removed on exit. Option files have no escape for a quote mark, so
# each value is wrapped in whichever quote it does not contain (backslash, CR, LF and tab
# escaped); a value holding both kinds stops the backup with an error instead of guessing.
MYCNF=$(mktemp)
trap 'rm -f "$MYCNF"' EXIT
chmod 600 "$MYCNF"
php -r '$c=require $argv[1];
  $q=function($v){ $v=(string)$v; $d=strpos($v,"\"")===false?"\"":(strpos($v,"\x27")===false?"\x27":null);
    if($d===null){ fwrite(STDERR,"DB credential contains both quote marks; cannot write option file\n"); exit(3); }
    return $d.strtr($v,["\\"=>"\\\\","\n"=>"\\n","\r"=>"\\r","\t"=>"\\t"]).$d; };
  echo "[client]\nuser=".$q($c["db_user"])."\npassword=".$q($c["db_pass"])."\n";' "$CFG" > "$MYCNF"
DBNAME=$(php -r '$c=require $argv[1]; echo $c["db_name"];' "$CFG")

F="$DEST/egolimited-$(date +%F-%H%M).sql.gz"
mysqldump --defaults-extra-file="$MYCNF" --single-transaction --no-tablespaces --routines "$DBNAME" 2>/dev/null | gzip > "$F"

# prune backups older than 14 days
find "$DEST" -maxdepth 1 -name 'egolimited-*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') backed up -> $F ($(du -h "$F" | cut -f1))"
