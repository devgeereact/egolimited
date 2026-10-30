# Decision record: sign-in moves to Clerk (email code only)

Status: PLANNED release, not deployed. Clerk production domain verified 30 Oct 2026. Branch `move/cpanel-clerk`. Written 30 Oct 2026.

## Decision
Staff sign in with Clerk (email code; no Google, no password). Roles stay in `ego_users`; Clerk only proves identity. The first sign-in by an approved email links the Clerk user id (`ego_users.clerk_user_id`). Unknown emails get no access and sign-up never creates staff. Customers keep their tokenised `/track` links (not Clerk). Database is already cPanel MySQL: no data migration.

## What changed in the code
| Area | Files |
|---|---|
| Token check | `api/lib/clerk_jwt.php` (RS256, JWKS cached, iss/exp/nbf/azp), `api/lib/clerk_auth.php` (sub/email to staff row) |
| Wiring | `current_user()` in `api/index.php` accepts a Clerk JWT or a legacy session token |
| Schema | `api/migrations/001_clerk_user_id.sql`, applied by `api/migrate_sql.php` (additive, idempotent) |
| App | `app/src/lib/clerk.ts`, `components/ego/ClerkBridge.tsx`, `lib/api.ts`, `store/auth.store.ts`, `pages/ego/auth/EgoLogin.tsx` |
| Tests | `api/tests/run.php` (JWT), `api/tests/clerk_link.php` (linking, throwaway DB), `app/src/lib/clerk.test.ts` |

## Release plan (needs the owner's approval for every server step)
Order is additive first. Until step 6 the live app still uses the old login, so nothing changes for users.

1. **Before anything:** Clerk production instance exists on egolimited.com, owner added the DNS records in Cloudflare (DNS only, grey cloud), `get_domain_status` says complete. Session claim `email` = `{{user.primary_email_address}}` set on production.
2. **Staff list:** owner gives each real person's email + role. Matching `ego_users` rows must exist and be active (add on the Team page while the old login still works). Demo accounts (`*@egolimited.co.uk` from `seed.php`) are listed for the owner to deactivate afterwards.
3. **Backup:** cPanel database backup of `devgeereact_egolimited`, and a copy of `~/egolimited.com/api/config.php`.
4. **Server config** (owner, File Manager): add to `config.php`: `clerk_issuer` (production Frontend API URL, e.g. `https://clerk.egolimited.com`, no trailing slash) and `clerk_authorized_parties` (`https://egolimited.com`, plus `https://local.egolimited.com` for local-live). No secret key is needed.
5. **Migration then API:** run `php migrate_sql.php --list`, then `php migrate_sql.php` (adds `clerk_user_id`, unique). Then upload the API with the documented `rsync -n` dry run first, read the list, then for real. Old login still works.
6. **App:** set the public GitHub variable `VITE_CLERK_PUBLISHABLE_KEY` (`pk_live_...`), build with base `/app/`, deploy (CI or `./deploy.sh`). Founder signs in with an email code; check `/api/auth/me` returns their role.
7. **Smoke checks:** `/api/health` ok; founder, office and engineer each sign in and see their own screens; an unapproved email sees "No access yet"; `curl -H 'Authorization: Bearer bad.bad.bad' /api/auth/me` returns 401; `/app/sw.js` still no-cache; customer `/track` link still works.
8. **Later, once proven for a week:** remove password login, sessions, invite accept, change-password, TOTP and force-password-change (code + routes + authz entries), update the invite email wording, then the owner drops old columns/tables if wanted. Not part of this release.

## Rollback
- App: redeploy the previous build (built without the key): the old login returns, and the API still accepts the old session tokens.
- API: re-upload the previous `index.php` and `lib/`. The `clerk_user_id` column is harmless and is left in place.
- Config: restore the saved `config.php`. Database restore from the cPanel backup only if data was damaged (none of these steps writes business data).

## Risks
- Lock-out: mitigated because the old login stays live until step 8, and linking needs an exact email match.
- Linking by email trusts Clerk's verified primary email: sign-up verifies it with a code (`verify_at_sign_up`).
- Actions minutes: CI deploys on push to `main`; Actions may be billing-blocked until 1 Nov. Merge by hand, no auto-merge.
- Local checks only so far: real Clerk tokens, the live host's PHP/openssl and the live migration are NOT TESTED.

## Owner to-do after release
Delete demo users (Team page or phpMyAdmin), remove any TEST records, delete old Clerk apps you no longer use ("Do you know" on soulrefresh.net looks old), decide when to drop the old auth columns.

## Owner runbook for the server steps (prepared 30 Oct 2026; none of this has been run)
Read-only checks done over `ssh cpanel`: server PHP 8.4.27 with openssl, mysqli and curl; `config.php` is mode 600 and has no `clerk_` keys yet; nightly backup `backup.php` last ran OK on 29 Oct (03:17 cron). `~/ego_private/` does not exist yet; the API creates `~/ego_private/cache` itself (mode 0700) on first use.

Do these in order, and only after `get_domain_status` for egolimited.com says `complete` (until then `https://clerk.egolimited.com` does not answer and no Clerk token can be checked):

1. **Backup (fresh, manual):** `ssh cpanel 'php ~/egolimited.com/api/backup.php'` then confirm `tail -2 ~/ego_db_backups/backup.log` ends `backup OK`. Also `ssh cpanel 'cp -p ~/egolimited.com/api/config.php ~/ego_db_backups/config.php.before-clerk && chmod 600 ~/ego_db_backups/config.php.before-clerk'`.
2. **Config (File Manager or an editor over ssh; do not paste secrets into chat):** add before the final `];` in `~/egolimited.com/api/config.php`:
   `"clerk_issuer" => "https://clerk.egolimited.com",`
   `"clerk_authorized_parties" => ["https://egolimited.com", "https://local.egolimited.com"],`
3. **Founder row for the test user** (so `gakinz101@gmail.com` can get in; roles are matched by email). In phpMyAdmin or on the Team page (old login) add an active user with that email and role `founder`. Name it `TEST founder`. Remove it when testing is finished.
4. **Migration:** from the branch checkout run the dry list first: `ssh cpanel 'cd ~/egolimited.com/api && php migrate_sql.php --list'` (the file must be uploaded first, step 5), then `php migrate_sql.php`. It only adds `clerk_user_id` and a unique index.
5. **Upload API (dry run first, read the list, then real):**
   `rsync -az --itemize-changes -n --exclude config.php --exclude error_log --exclude uploads --exclude .impeccable --exclude .htaccess api/ cpanel:~/egolimited.com/api/` then the same without `-n`. Run step 4 straight after.
6. **App:** set the public GitHub variable `VITE_CLERK_PUBLISHABLE_KEY` to the live key (`pk_live_Y2xlcmsuZWdvbGltaXRlZC5jb20k`), build with base `/app/`, deploy via the project's route. For `./deploy.sh` run it in a shell where that variable is exported.
7. **Smoke checks:** see "Release plan" step 7 above.
