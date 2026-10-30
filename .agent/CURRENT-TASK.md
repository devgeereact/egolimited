# Current Task Contract

## Outcome

Move EGO LIMITED sign-in to Clerk (email code only). Database is already cPanel MySQL (`devgeereact_egolimited`), API already live at egolimited.com/api. Branch: `move/cpanel-clerk`. Previous audit contract kept in `.agent/CURRENT-TASK.previous-audit.md`.

## Phase 0 inventory (read-only, 30 Oct 2026) - PLANNED, awaiting owner "go"

### Reality vs the brief
Not just "one admin password". Today: full staff system.
- Table `ego_users` (name, email unique, password_hash, role, active, invite_token, must_change_password, totp_secret, totp_enabled, deleted_at). Roles: founder > manager > office > engineer.
- Sessions: `ego_sessions` (random bearer token, 30 days), sent as `Authorization: Bearer` from `app/src/lib/api.ts` (token in localStorage `ego_token`).
- Sign-in paths in `api/index.php`: POST /auth/login (password + optional TOTP, rate limited), /auth/logout, GET /auth/me, POST /invite/accept (set password from emailed invite), POST /me/change-password, /me/totp/{setup,enable,disable}, POST /team/force-password-change, POST /team (creates user + emails invite).
- Authorisation: `api/lib/authz.php` ROUTE_ROLES manifest, fail-closed, checked before the switch. It reads `$user["role"]` from `require_user()`. This stays untouched.
- No login for customers: tokenised /track links and HMAC-signed photo/attachment URLs. These stay as they are (not Clerk).
- Front end screens: `app/src/pages/ego/auth/{EgoLogin,InviteAccept,EgoLanding,HomeRedirect}.tsx`, `account/{AccountSecurity,LockScreen}.tsx`, `team/TeamPage.tsx`, `components/ego/RequireRole.tsx`, `lib/roles.ts`.
- Deploy route: GitHub Actions `deploy.yml` (FTPS, on push to main; Actions may be billing-blocked) or `./deploy.sh` (landing+app rsync) + manual API rsync with `-n` first. Server config: `~/egolimited.com/api/config.php` (never touched/uploaded).
- Dev already talks to live API (`https://egolimited.com/api`), so local-live fits.

### Plan (order)
1. Clerk app "EGO LIMITED": email code only, Google/social off, password off, dev + prod (dry_run first). Prod instance only after owner confirms; owner adds Clerk DNS records in Cloudflare (grey cloud).
2. API: add `Jwt.php` (reuse siterelay `backend/src/Jwt.php`), config keys `clerk_issuer`, `clerk_authorized_parties` (https://egolimited.com, https://local.egolimited.com). Migration: `ego_users.clerk_user_id` VARCHAR(64) NULL UNIQUE (additive, new numbered migration). `current_user()` verifies Clerk JWT, finds user by clerk_user_id, else on first sign-in links by verified Clerk email to an existing active ego_users row; unknown email = 401/403, no auto-create. Roles stay in ego_users.
3. Tests in `api/tests/run.php` for JWT (bad sig, iss, exp, nbf, azp) and linking.
4. Front end: `@clerk/clerk-react`, `<SignIn/>` replaces EgoLogin; token via `getToken()` from Clerk in api.ts; 401 -> sign-in. Invite flow becomes: manager adds person (email+role) -> they sign in with Clerk using that email. Remove password/TOTP screens.
5. Remove old paths only after tests pass: password login, sessions, invite accept, change-password, TOTP, force-password-change. Old columns/tables stay (not dropped).
6. local-live entry + one-line server change (add https://local.egolimited.com to authorised parties, backup first).
7. Gate (tsc, lint, vitest, `php api/tests/run.php`, semgrep, gitleaks), then release plan to owner.

### Owner must do
- Say go / confirm prod Clerk instance; add DNS records in Cloudflare.
- Give the email + role of each person needing access (list the real staff; demo users not migrated).
- cPanel DB backup before release; edit server config.php for the Clerk keys.
- Delete old demo users afterwards (Team page or phpMyAdmin).

### Risks / rollback
- Lock-out if linking by email fails: keep old login route live until Clerk path proven on a founder account; rollback = redeploy previous build + old API (columns untouched).
- Live data: any local test write is real; TEST-prefixed records only.
- PHP not installed on this Mac: `php -l`/tests run in CI or via owner (NOT TESTED locally).
- Actions minutes: enable only when needed (resets 1 Nov), tell owner.

## Status
PLANNED. Nothing changed outside this file and the local branch. Not pushed.

## Phase 1 progress (30 Oct 2026)
- DONE: Clerk app "EGO LIMITED" created (app_3LOcycMKbnx32ML5j1ut6oRSb3E). Dev instance ins_3LOcyVLqpqTz73O8nvL57jZfxxK, publishable key name VITE_CLERK_PUBLISHABLE_KEY (public pk_test_... value goes in app/.env.local, not committed).
- DONE (dry run first, then applied, dev): Google off, password off/not required; email code is the only sign-in (auth_email.used_for_sign_in=true, email_code).
- PLANNED: production instance on egolimited.com, waiting for owner confirmation (cannot be undone), then Cloudflare DNS records (grey cloud).

## Phase 3 progress (30 Oct 2026, local branch only, nothing deployed or committed)
- BLOCKED: `create_production_instance` for egolimited.com was refused by the permission classifier (production action). Needs the owner to allow it (settings rule for mcp__clerk__create_production_instance) or create it in the Clerk dashboard. Not retried.
- DONE (dev Clerk instance): session token claim `email` = {{user.primary_email_address}} (same as SiteRelay). Must be repeated on the production instance.
- DONE: `api/lib/clerk_jwt.php` (RS256/JWKS verifier ported from siterelay), `api/lib/clerk_auth.php` (sub -> ego_users, first sign-in links by verified email, never creates staff), `current_user()` accepts Clerk JWT or legacy session token (both live during transition), `api/migrations/001_clerk_user_id.sql` + `api/migrate_sql.php` (additive, idempotent), config.sample.php keys, .gitignore .local-test/.
- DONE (evidence): `php api/tests/run.php` 550 passed 0 failed (PHP 8.5.12 local); `api/tests/clerk_link.php` 13 checks 0 failed against a throwaway local MariaDB 13.0.2 (not the live DB); gitleaks no leaks; semgrep no findings on the new files.
- NOT TESTED: against real Clerk tokens, the live host's PHP version/openssl, and the migration on the live DB.
- NEXT: front end (@clerk/clerk-react, SignIn page, Bearer token from Clerk), then remove legacy login after proof.

## Phase 4 progress (30 Oct 2026, local branch only)
- DONE: `@clerk/clerk-react` added (app). `VITE_CLERK_PUBLISHABLE_KEY` switches the app to Clerk; unset = legacy login still works (safe transition). Files: `app/src/lib/clerk.ts` (bridge), `components/ego/ClerkBridge.tsx`, `lib/api.ts` (fresh Clerk token per request), `store/auth.store.ts` (loadMe/logout; offline keeps last user), `pages/ego/auth/EgoLogin.tsx` (Clerk <SignIn/>, sign-up hidden, "No access yet" panel for unapproved emails), InviteAccept redirects to login, AccountSecurity shows email-code note. `app/.env.example` added.
- Evidence: app `npx tsc -b` clean; `npm run lint` 0 errors (10 warnings, same as before my change); `npm test` 31 passed (5 new in clerk.test.ts); `vite build --base=/app/` OK, `/app/assets/` base correct.
- NOT TESTED: real sign-in end to end (needs the new API on the live server, which needs owner approval), mobile/engineer offline flow with Clerk, Clerk component styling.
- OPEN: TeamPage "invite" wording and `notify_team_invite()` email still describe a password link; update when legacy login is removed. Sign-up is hidden in the UI but Clerk sign-up is still enabled in the instance; the API refuses unapproved emails (verified by tests).

## Release plan written (30 Oct 2026)
`docs/MOVE-TO-CLERK.md` holds the decision record, 8-step release plan and rollback. Awaiting: owner approval, production Clerk instance, staff emails + roles. Phase 5 (local-live entry in ~/Developer/build-kit, outside this project) needs "approved:" first.

## Production Clerk instance created (30 Oct 2026)
- DONE: production instance ins_3LOfvf12lGqXEhXGYGnt2DhMrWQ on egolimited.com. Frontend API / JWT issuer `https://clerk.egolimited.com`. Public key name for CI/build: VITE_CLERK_PUBLISHABLE_KEY (pk_live_Y2xlcmsuZWdvbGltaXRlZC5jb20k, public).
- Verified cloned config: email code only, Google off, password off, session claim email set.
- WAITING: owner adds 5 Cloudflare CNAMEs (DNS only / grey cloud), then `get_domain_status` must say complete: clerk, accounts, clkmail, clk._domainkey, clk2._domainkey (values in the chat message / Clerk dashboard).
- Release plan approved by owner ("Approved"). Still need: staff emails + roles; each server step asked separately.

## DNS added in Cloudflare (30 Oct 2026, owner said go)
- DONE: 5 Clerk CNAMEs added to egolimited.com zone, DNS only (proxied=false), comment "Clerk production". They resolve publicly (dig).
- WAITING: Clerk domain status still `not_started` right after adding; may need "Verify configuration" in the Clerk dashboard (no Clerk CLI on this Mac). Re-check with get_domain_status.
- Same done for other projects (apps created, dev email-only, prod instance, DNS): gakinz.com, heritclothing.com, ritagreenservices.com, vitalcare.uk, rotaflow.space. See memory note clerk-apps.

## Test sign-in user (30 Oct 2026)
- Owner decision: test with gakinz101@gmail.com, email code, NO password. Clerk user "Founder TEST" (user_3LOhvm8lJq0jNQtKlitmYGiLFWd) created in the EGO LIMITED production instance, same email created in the 5 other production instances. Remove them when testing is finished (TEST record list for owner).
- For the release: the staff row `ego_users` with email gakinz101@gmail.com and role founder must exist before this user can get in (linking is by email). Add it on the server only with owner approval.
- Owner decision: data migration (Supabase to MySQL) for Vitalcare and rotaflow is OUT of scope; owner will rebuild those.

## Release readiness check (30 Oct 2026)
- BLOCKED on Clerk domain verification: egolimited.com still `not_started` (owner to click Verify configuration in the Clerk dashboard). Until it is complete, the API cannot fetch signing keys from https://clerk.egolimited.com.
- Read-only server checks OK (PHP 8.4.27, openssl present, recent nightly backup OK). No server file changed by me. Owner runbook added to docs/MOVE-TO-CLERK.md.

## Clerk domains verified (30 Oct 2026)
- DONE: gakinz.com, heritclothing.com, ritagreenservices.com, vitalcare.uk, rotaflow.space = `complete` in Clerk. egolimited.com: DNS + mail complete; clerk.egolimited.com JWKS answers HTTP 200 (SSL for that host was still finishing in get_domain_status; recheck).
- NEXT: owner runbook step 1 (backup) onwards in docs/MOVE-TO-CLERK.md, one approval per step.

## Release step 1 done (30 Oct 2026, owner said "run it")
- DONE (evidence): manual `php ~/egolimited.com/api/backup.php` on the server exited 0; `ego_db_20261030_034144.sql.gz` (97 KB) and `ego_files_20261030_034144.tar.gz` (includes config.php per backup.php) written to ~/ego_db_backups; log ends `backup OK`. Restore not drilled for this file (NOT TESTED).
- NEXT (owner): add the two Clerk lines to server config.php, then founder row, migration, API upload, app deploy (docs/MOVE-TO-CLERK.md runbook).

## Release step 2 done (30 Oct 2026, owner asked me to do it in cPanel)
- DONE: added `clerk_issuer` and `clerk_authorized_parties` to ~/egolimited.com/api/config.php over ssh (file is `array (...)` style, so inserted before the closing `);`). Before: copy at ~/ego_db_backups/config.php.before-clerk (mode 600). Linted, loads, mode still 600, live `/api/health` ok. Rollback: `cp -p ~/ego_db_backups/config.php.before-clerk ~/egolimited.com/api/config.php`.
- NEXT: founder row, API upload (dry run first), migration, app deploy.

## Release step 3: API upload DRY RUN only (30 Oct 2026)
- FINDING: the live server `api/index.php` and `schema.sql` are OLDER than git `main` (the 2026-09-04 review-publish-consent privacy fix, 69 lines in index.php, was never deployed, likely CI billing block). Uploading the whole branch would also ship that change (public homepage reviews would stop showing until customers consent). Not part of this task, so NOT included.
- Minimal upload built in `.local-test/deploy-api/`: the server's own index.php + only the Clerk edits (8 changed lines vs server; lints), plus new files lib/clerk_auth.php, lib/clerk_jwt.php, migrate_sql.php, migrations/001_clerk_user_id.sql. Dry run lists exactly those 5 files. Rollback: `.local-test/deploy-api/server_index.php.orig` -> ~/egolimited.com/api/index.php; the new files are inert.
- AWAITING owner OK for the real upload. Separate decision for owner: deploy the pending privacy fix.

## Release step 3 done (30 Oct 2026, owner approved "1")
- DONE: uploaded 5 files (index.php with only the Clerk edits, lib/clerk_auth.php, lib/clerk_jwt.php, migrate_sql.php, migrations/001_clerk_user_id.sql). All lint on server (PHP 8.4). Live: /api/health ok; garbage bearer JWT -> 401; no auth -> 401. config.php untouched (600).
- NOT YET: migration (column clerk_user_id does not exist yet, so a real Clerk sign-in would fail until it runs; legacy login unaffected), founder row, app deploy.

## Release steps 4-5 done (30 Oct 2026, owner said "go on")
- DONE: `php migrate_sql.php` ran 001_clerk_user_id.sql on the live DB: `ego_users.clerk_user_id` present, unique index present, 6 users before. `/api/health` ok.
- DONE: added staff row id 14 `TEST founder` / gakinz101@gmail.com / founder / active / NO password (cannot use legacy login; Clerk email code only). TEST RECORD: owner to remove when testing ends.
- Existing real staff rows (will link on their first Clerk sign-in by email; they need their mailbox for the code): admin@, gideon@, olumide@, emad@ (never set a password), engineer@egolimited.com. Row 8 admin@egolimited.co.uk is already deleted (old demo).
- NEXT: build + deploy the app with VITE_CLERK_PUBLISHABLE_KEY (live key), then smoke checks. App deploy = changes what live users see: needs explicit owner OK.

## Release step 6 done: app deployed (30 Oct 2026, owner said "go on")
- Checked first: live app bundle (ClYXRbk2) == build of `main`, so only the 7 Clerk files differ. App ONLY deployed (landing untouched), `app/dist` rsynced without --delete (old hashed assets remain for rollback).
- Gate: tsc clean, 31 tests passed; built with the live public key; no sk_ keys in bundle; .htaccess rules present.
- Live evidence: /app/ serves index-wlLy2hSR.js (200), sw.js `no-cache, must-revalidate` + DYNAMIC, /api/health ok, landing 200. Login page in a browser shows Clerk's email-only form ("Continue", no password, no Google) with no console errors.
- FINDING: the page still shows "Don't have an account? Sign up" (the withSignUp prop does not hide it). Harmless to data (API refuses unapproved emails; sign-up never creates staff) but misleading: fix by restricting sign-up in Clerk or hiding the link.
- NOT TESTED: an actual sign-in (owner to do with gakinz101@gmail.com), engineer offline flow.
- Rollback: restore previous app: `cp ~/ego_db_backups/app-index.html.before-clerk ~/egolimited.com/app/index.html` (old bundle files are still on the server). 

## Sign-up closed (30 Oct 2026, owner confirmed sign-in works and said go on)
- DONE: Clerk users created (no password, email admin-verified, nothing emailed) in the EGO LIMITED production instance for admin@, gideon@, olumide@, emad@, engineer@egolimited.com. gakinz101@gmail.com already existed (TEST).
- DONE (dry run then applied): production `auth_access_control.sign_up_mode` = restricted. Login page no longer shows "Sign up" (checked in browser).
- RULE NOW: a new staff member needs BOTH a Team-page record (role) AND a Clerk user (create in Clerk dashboard > Users, or ask Claude). Rollback: set sign_up_mode back to public.
- STILL OPEN: remove legacy password/session/TOTP/invite code after ~1 week of use; update the invite email wording; TEST records to remove (staff row 14 + Clerk Founder TEST users); owner decision on the undeployed privacy fix (review-publish consent).

## Merged to main (30 Oct 2026)
- `move/cpanel-clerk` (already live) merged into `main`, so `main` matches the server again.
- `.github/workflows/deploy.yml` is now manual only (`workflow_dispatch`): no FTP deploy on push. Releases go over SSH (`pnpm release`, kit standard) once that script is added here.
- 30 Oct 2026: `pnpm release` added (kit `scripts/release.mjs`, `release.json`: landing, app, API). Docs updated. First run = dry run only; `deploy.sh`, FTP `deploy.yml`, FTP secrets and FTP account go after the first successful `--go`.
