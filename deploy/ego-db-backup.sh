#!/bin/bash
# EGO LIMITED — daily MySQL backup of the live standalone DB (devgeereact_egolimited).
# Creds read from the server config.php (never hard-coded). Keeps 14 days. Run via cron.
set -euo pipefail
CFG="/home/devgeereact/egolimited.com/api/config.php"
DEST="/home/devgeereact/backups"
mkdir -p "$DEST"

creds=$(php -r '$c=require $argv[1]; echo $c["db_name"]."\t".$c["db_user"]."\t".$c["db_pass"];' "$CFG")
DBNAME=$(printf '%s' "$creds" | cut -f1)
DBUSER=$(printf '%s' "$creds" | cut -f2)
DBPASS=$(printf '%s' "$creds" | cut -f3)

F="$DEST/egolimited-$(date +%F-%H%M).sql.gz"
mysqldump -u "$DBUSER" -p"$DBPASS" --single-transaction --no-tablespaces --routines "$DBNAME" 2>/dev/null | gzip > "$F"

# prune backups older than 14 days
find "$DEST" -maxdepth 1 -name 'egolimited-*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') backed up -> $F ($(du -h "$F" | cut -f1))"
