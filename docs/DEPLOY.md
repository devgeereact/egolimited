# EGO LIMITED deploy record

This is the tracked record of how EGO LIMITED reaches production. It replaces the "Deploy mechanics" section of the git-ignored `CLAUDE.md`, which is not present on every computer. Every fact here comes from files already in this repository: `deploy.sh`, `.github/workflows/deploy.yml`, `README.md`, `api/README.md`, `api/.htaccess`, `app/public/.htaccess`, `landing/public/.htaccess` and `notion-export/16-PROJECT-MEMORY-AND-DOCS.md`. When one of those changes, update this page in the same change.

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

## The two deploy paths

### 1. CI: `.github/workflows/deploy.yml`

Runs on every push to `main` and on manual dispatch. It runs blocking gates (PHP `php -l` on every API file, `php api/tests/run.php`, app Vitest, app and landing lint, `tsc -b` for both), builds both SPAs, uploads landing, app and API over FTPS, then smoke-tests the live site (`/api/health`, the hashed app bundle, the landing page).

`README.md` records that GitHub Actions has been billing-blocked, in which case a push deploys nothing. Do not treat a pushed commit as a live change: check the workflow run, then check the live site.

### 2. Manual: `./deploy.sh` (landing and app only)

`deploy.sh` runs from any directory and:

1. Runs fail-closed gates: app `npx --no-install tsc -b` and `npm test`, landing `npx --no-install tsc -b`. Any failure stops the script before anything is built or uploaded.
2. Builds the landing (`--base=/`) and the app (`--base=/app/`) with `npx --no-install vite build`.
3. Checks that `app/dist/.htaccess` still holds the SPA fallback and the `sw.js`/`index.html` no-cache rule, and stops if not.
4. Rsyncs `landing/dist/` to `cpanel:egolimited.com/` and `app/dist/` to `cpanel:egolimited.com/app/` (`rsync -az --no-perms --omit-dir-times`, no `--delete`).

It uses the `cpanel` SSH alias (key authentication, port 21098) from the operator's own SSH config. The script does not deploy the API.

### Manual API upload

The API is uploaded by hand with rsync over the same alias, without `--delete`, so the server's own files survive:

```sh
rsync -az --itemize-changes -n \
  --exclude config.php --exclude error_log --exclude uploads --exclude .impeccable --exclude .htaccess \
  api/ cpanel:~/egolimited.com/api/
```

Run it with `-n` (dry run) first, read the itemised list, then run it again without `-n`. The same `--itemize-changes -n` dry run is advisable before any manual rsync.

## Never upload

- `api/config.php`: production secrets live only on the server. Never commit it, never upload it, never overwrite it.
- `api/error_log`, `api/uploads/`, `api/.impeccable/`: server-side state.
- `api/.htaccess` from the repository: both the CI workflow and the manual rsync exclude it, so the server keeps its own copy. If the server copy ever needs the repository rules (front controller, `Authorization` passthrough, blocking `lib/`, `tests/` and the CLI scripts), change it deliberately on the server and record that here.
- `api/config.sample.php`: excluded by CI; it is a template only.
- Anything from the separate `egolimited_com` (underscore) project folder. It is a different project.

The CI landing upload owns the docroot root, so it excludes `app/`, `api/` and a stale `egolimited.com/` folder on the server to avoid uploading into or deleting them.

## Cache and routing rules that must ship

- `app/public/.htaccess` is copied by Vite into `app/dist/`. It holds the SPA fallback to `/app/index.html` and forces `Cache-Control: no-cache, must-revalidate` on `sw.js` and `index.html`. Without that rule the host's default caching kept a year-old service worker alive (white-screen incident, 8 July 2026). `deploy.sh` must never overwrite this file.
- `landing/public/.htaccess` is copied into `landing/dist/`. It holds the SPA fallback to `/index.html` and a `no-cache, must-revalidate` rule for `.html` files. It deliberately has no long-lived `immutable` rule for `.js` or images: this file sits at the docroot, so such a rule would also apply under `/app/`, where `sw.js` is not hashed. `deploy/landing.htaccess` contains that broader rule and is not used.

## Verify after a deploy

Cloudflare fronts the site, so a response can come from its edge. Check the origin files over SSH as well as the public responses.

```sh
# Public responses
curl -fsS https://egolimited.com/api/health          # expect {"ok":true,...}
curl -sI https://egolimited.com/app/sw.js   | grep -i '^cache-control'   # expect no-cache, must-revalidate
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
