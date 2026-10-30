# Audit record

One audit file for this project. Every audit, check or review adds a dated section at the top; nothing is rewritten. Open work lives in `.agent/CURRENT-TASK.md`.

## 30 October 2026 (evening): first SSH releases

- Owner `pnpm release --go` at 19:10 shipped the review-publish consent privacy fix; smoke checks passed (`/`, `/app/`, `/api/health`).
- GitHub Actions deploy (`deploy.yml`, workflow_dispatch) afterwards: checks passed (31 Vitest, 550 PHP), nothing to upload. Result: PASS.

## 30 October 2026: release route and live parity

- Scope: the move to SSH releases (kit `scripts/release.mjs`) and whether the live server matches `main`.
- Evidence: `pnpm release` dry run on `main` (30 Oct 2026): app `tsc -b` and 31 Vitest tests pass, landing `tsc -b` passes, `php -l` on every API file, `php api/tests/run.php` 550 passed. Landing and app builds identical to the live files. API: `index.php` and `schema.sql` differ (the review-publish consent privacy fix from 4 Sep 2026, never deployed; owner decision open).
- Result: PASS. The FTP deploy workflow was removed; GitHub FTP secrets and the cPanel FTP account are deleted by the owner (`~/Backups/scripts/remove-ftp-deploys.zsh`).
- Not checked: a real `--go` release (nothing to upload yet), restore drill of the server backups.

## 30 Oct 2026: config.php moved out of the web root

- The real settings now live in `~/private-config/egolimited/config.php` (0600, folder 0700). The web-root `config.php` is a stub (0600, no secrets) that loads it.
- Original copy: `~/backups/egolimited/config.php.before-private`.
- Releases never upload `config.php` (PROTECT list), so deploys keep the stub.
- Verified live after the move: the API check returned the expected status.
