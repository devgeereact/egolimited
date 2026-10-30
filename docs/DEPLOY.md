# EGO LIMITED deploy record

This is the tracked record of how EGO LIMITED reaches production. It replaces the "Deploy mechanics" section of the git-ignored `CLAUDE.md`, which is not present on every computer. Every fact here comes from files already in this repository: `release.json`, `scripts/release.mjs`, `README.md`, `api/README.md`, `api/.htaccess`, `app/public/.htaccess`, `landing/public/.htaccess` and `notion-export/16-PROJECT-MEMORY-AND-DOCS.md`. When one of those changes, update this page in the same change.

Deploying publishes to the live site and is a production action. It needs the owner's explicit approval.

## What goes where

One cPanel docroot, `~/egolimited.com/`, serves three surfaces:

| Surface | Source | Build | Live path |
|---|---|---|---|
| Landing site | `landing/` | `npx vite build --base=/` into `landing/dist/` | `egolimited.com/` (docroot root) |
| Field-service app (PWA) | `app/` | `npx vite build --base=/app/` into `app/dist/` | `egolimited.com/app/` |
| PHP API | `api/` | none, PHP is uploaded as source | `egolimited.com/api/` |

Only build output and API source are uploaded. `docs/`, `notion-export/`, `deploy/` and the frontend source folders stay in the repository.

The app build must set its base. A plain `npm run build` uses base `/`, so `/app/index.html` would point at `/assets/*` and the app would load blank. Check with `grep assets app/dist/index.html`, which must show `/app/assets/...`.

## How to release: `pnpm release` (from this Mac, over SSH)

Kit standard since 30 October 2026: no FTP, no GitHub Actions deploys. `scripts/release.mjs` reads `release.json` (no secrets in it) and uses the `cpanel` SSH alias (key authentication) from the operator's SSH config.

1. `pnpm release` (dry run): checks that `main` is clean and pushed; runs the gates (app `tsc -b` and Vitest, landing `tsc -b`, `php -l` on every API file, `php api/tests/run.php`); builds the landing (`--base=/`) and the app (`--base=/app/`, live public Clerk key) and checks the app SPA fallback; then lists every file that would change in the three parts below. Nothing changes.
2. `pnpm release --go`: copies every server file about to change to `~/backups/egolimited/releases/<time>/` (newest 3 kept), uploads (index.html, sw.js and the manifest last; nothing deleted), then smoke-tests `/`, `/app/` and `/api/health`. A failed smoke test restores the copied files automatically.
3. Undo: `pnpm release --rollback`, then `pnpm release --rollback --go`.

| Part | From | To |
|---|---|---|
| Landing | `landing/dist/` (with its own `.htaccess`) | `~/egolimited.com/` |
| App | `app/dist/` (with its own `.htaccess`) | `~/egolimited.com/app/` |
| API | `api/` without `uploads/`, `.impeccable/`, `tests/`, `config.sample.php`, Markdown | `~/egolimited.com/api/` |

Database migrations are separate: take a backup first (`~/backups/egolimited`), then run `php migrate_sql.php` in `~/egolimited.com/api` over SSH.

The old routes (`./deploy.sh` and the FTPS workflow) were removed on 30 October 2026 after a dry run showed the server equal to `main`. The owner deletes the FTP secrets and the cPanel FTP accounts (`~/Backups/scripts/remove-ftp-deploys.zsh`).

## Never upload

- `api/config.php`: production secrets live only on the server. Never commit it, never upload it, never overwrite it.
- `api/error_log`, `api/uploads/`, `api/.impeccable/`: server-side state.
- `api/.htaccess` from the repository: `pnpm release` never uploads it (protected name), so the server keeps its own copy. If the server copy ever needs the repository rules (front controller, `Authorization` passthrough, blocking `lib/`, `tests/` and the CLI scripts), change it deliberately on the server and record that here.
- `api/config.sample.php`: excluded in `release.json`; it is a template only.
- Anything from the separate `egolimited_com` (underscore) project folder. It is a different project.

The landing part owns the docroot root; it never deletes, so `app/`, `api/` and other server folders are left alone.

## Cache and routing rules that must ship

- `app/public/.htaccess` is copied by Vite into `app/dist/`. It holds the SPA fallback to `/app/index.html` and forces `Cache-Control: no-cache, must-revalidate` on `sw.js` and `index.html`. Without that rule the host's default caching kept a year-old service worker alive (white-screen incident, 8 July 2026). It is part of the build and ships with the app (`allow` in `release.json`).
- `landing/public/.htaccess` is copied into `landing/dist/`. It holds the SPA fallback to `/index.html` and a `no-cache, must-revalidate` rule for `.html` files. It deliberately has no long-lived `immutable` rule for `.js` or images: this file sits at the docroot, so such a rule would also apply under `/app/`, where `sw.js` is not hashed. `deploy/landing.htaccess` contains that broader rule and is not used.
- Cloudflare cache rule for `/app/sw.js`: this lives in Cloudflare, not in the repository. Cloudflare caches `.js` files by extension and the zone's Browser Cache TTL setting (4 hours) overrode the origin header, so `sw.js` reached browsers with `max-age=14400` even though `.htaccess` was correct. On 22 October 2026 a cache rule was added in the `egolimited.com` zone (phase `http_request_cache_settings`, rule id `2624217f49a141adb7f6af96834fcb30`): hosts `egolimited.com` and `www.egolimited.com`, URI path equals `/app/sw.js`, cache set to bypass. Do not delete it. If it is lost, `curl -sI https://egolimited.com/app/sw.js` shows `max-age=14400` again; recreate it under Caching, Cache Rules in the dashboard. Nothing in `pnpm release` touches it.

## Verify after a deploy

Cloudflare fronts the site, so a response can come from its edge. Check the origin files over SSH as well as the public responses.

```sh
# Public responses
curl -fsS https://egolimited.com/api/health          # expect {"ok":true,...}
curl -sI https://egolimited.com/app/sw.js   | grep -i -E '^(cache-control|cf-cache-status)'   # expect no-cache, must-revalidate and DYNAMIC (Cloudflare cache rule above)
curl -sI https://egolimited.com/app/        | grep -i '^cache-control'   # expect no-cache, must-revalidate
curl -sI https://egolimited.com/            | grep -i '^cache-control'   # expect no-cache, must-revalidate
curl -fsS https://egolimited.com/app/ | grep -oE '/app/assets/index-[A-Za-z0-9_-]+\.js' | head -1   # a hashed bundle, which must itself return 200

# Origin files
ssh cpanel 'grep -c "sw\\.js|index\\.html" ~/egolimited.com/app/.htaccess'   # expect 1 or more
ssh cpanel 'grep -c "no-cache" ~/egolimited.com/.htaccess'                   # expect 1 or more
```

If a `Cache-Control` header is missing, also look at `cf-cache-status` in the same response and purge the Cloudflare cache for the affected path if the edge holds a stale copy.

## Backups

Database and file backups are described in `docs/RESTORE-RUNBOOK.md` (`api/backup.php` on a cPanel cron). `deploy/ego-db-backup.sh` is an older standalone script that nothing in the repository references; check the server crontab before relying on it or removing it.
