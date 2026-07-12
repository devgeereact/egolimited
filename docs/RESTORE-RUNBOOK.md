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

---

## Drill log

An untested backup is a hypothesis, not a backup. Restore drills go here — **date, which
backup, and what was actually proved.** Do one quarterly, and after any schema change.

### 2026-07-12 — first drill. PASSED ✅

Restored the **unattended 03:17 cron backup** (`ego_db_20260712_081718.sql.gz`, 35 KB gzipped /
231 KB raw) — deliberately the nightly one, not a hand-taken backup, because the nightly is what
you'd actually be reaching for at 2am.

Restored into a **scratch local MariaDB**, never into production. Proved four things, in order of
how badly each would hurt if it were false:

1. **The archive is intact** — `gzip -t` verifies, 42 `CREATE TABLE` statements present.
2. **It restores cleanly** — 42/42 tables, zero errors.
3. **The data is all there** — row counts compared table-by-table against the LIVE database:
   users 6, customers 1, jobs 2, invoices 12, invoice_lines 18, payments 1, activity_log 133,
   messages 75, company_settings 1, integrations 20, leads 73, tasks 4. **Every table matched.**
   (This is the check that matters. A restore that silently drops rows is worse than no backup,
   because you'd trust it.)
4. **The restored database actually runs the app** — booted the PHP API against it: `/health` →
   `{"ok":true,"db":true}`, `/public/company` served real data, £6,697.00 across 12 invoice
   documents, the founder account present, activity log intact.

Wall-clock: **under 2 minutes** for the DB, well inside the 15–30 min RTO — though note that
target covers DB **+ files** (`ego_private/` photos and mail attachments), and only the DB half
was drilled this time. **Next drill: also restore `ego_files_<stamp>.tar.gz` and confirm a job
photo actually opens.**

Cleanup after the drill: scratch DB dropped, and the downloaded dump deleted — it contained real
customer data and should never linger on a laptop.

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
