# EGO LIMITED — Backup & Restore Runbook

Non-sensitive ops doc. What's backed up, how to restore, and the recovery targets.

## What runs

- **`api/backup.php`** — daily at **03:17** (cPanel cron). Writes to **`~/ego_db_backups`** (outside the web root), keeps the newest **14** of each:
  - `ego_db_<stamp>.sql.gz` — full MySQL dump.
  - `ego_files_<stamp>.tar.gz` — `~/ego_private` (job photos + mail attachments), `api/uploads`, and `api/config.php` (the files git can't restore).
- **`api/restore.php`** — the CLI counterpart (below).
- Log: `~/ego_db_backups/backup.log`.

The **application code** is in git (`github.com/devgeereact/egolimited`) — restore it with `git`, not from backup.

## Recovery targets

- **RPO (data-loss window):** ≤ 24 h (daily backup). Take a manual backup before risky changes: `php ~/egolimited.com/api/backup.php`.
- **RTO (time to restore):** ~15–30 min for DB + files.

## Restore procedure

SSH in: `ssh cpanel`

1. **Take a fresh backup first** (so you can undo the restore):
   ```
   php ~/egolimited.com/api/backup.php
   ```
2. **List available backups:**
   ```
   php ~/egolimited.com/api/restore.php list
   ```
3. **Restore the database** (DESTRUCTIVE — overwrites current data):
   ```
   php ~/egolimited.com/api/restore.php db ego_db_20260707_0317xx.sql.gz
   ```
4. **Restore user files** (job photos, mail attachments, uploads, config) if needed:
   ```
   php ~/egolimited.com/api/restore.php files ego_files_20260707_0317xx.tar.gz
   ```
5. **Verify:** `curl -s https://egolimited.com/api/health` → `{"ok":true,"db":true}`; founder login works; spot-check a recent job/invoice.

## Restore code (if the app files are lost, not the DB)

```
cd ~/egolimited.com && git fetch && git reset --hard origin/main   # (source only)
cd app && npx vite build --base=/app/ && rsync -az --delete dist/ ~/egolimited.com/app/
```
`config.php` is NOT in git — it comes from the files archive (step 4) or is recreated from `config.sample.php`.

## Test cadence

Do a **restore drill monthly**: restore the latest DB into a scratch database and confirm row counts, then discard. A backup that's never restored is a guess, not a backup.
