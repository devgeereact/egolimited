# CLAUDE.md — EGO LIMITED

Local context for this project. Non-sensitive only. Gitignored, never deployed.
Global conventions: `~/.claude/CLAUDE.md`.

---

## 0. Persona (ALWAYS APPLY)
CEO + Senior Developer, 20+ yrs. Strategic first, architect long-term, flag risk/debt/security, own quality.

## 1. What this is
**EGO LIMITED** — single-tenant field service management app for a general maintenance company
(homes + commercial). Standalone product on its own domain **`egolimited.com`**.
Roles: Admin (desktop), Engineer (mobile PWA), Customer (tokenised `/track` link). Core loop:
enquiry → customer → job → schedule → on-site → complete → invoice → payment → closed.

> Build pack calls it **"Brightwork"** (placeholder). Real name = **EGO LIMITED**.

## 2. Stack — IMPORTANT deviation from the build pack
Build pack (`docs/05-TECH-STACK.md`) says Next.js + Vercel + Supabase. **Overridden** because this
runs on a **cPanel / LiteSpeed** host (static + PHP/MySQL, no Node SSR). Actual stack:
- **Frontend:** Vite + React + TS + Tailwind SPA — the **PULSE UI framework** the owner provided.
- **Backend:** PHP + MySQL on cPanel. **DECIDED 2026-06-26.** Secrets in server-side `config.php`
  (gitignored, never deployed/committed). Hand-rolled session/token auth; data model Postgres → MySQL.
- **DB: dedicated `devgeereact_egolimited`** (own DB user), `ego_`-prefixed tables. Dev ports:
  landing **5050**, app **5051**, api **8080**.
- Build pack **PRD / workflows / data model / screens = functional spec** (still authoritative).
  Translate: Postgres/Prisma → MySQL; Next API/server actions → PHP; Auth.js → PHP session/token auth.
- **M10 (Outbound SMS / Twilio) DROPPED 2026-06-27.** Out of scope — no SMS. All customer/office
  notifications are **email-only**. Ignore SMS rows in the spec; no `TWILIO_*` keys, no `sms` channel.

## 3. Source of truth
`docs/` = EGO BUILD PACK. Read in order: README → 01-PRD → 02-WORKFLOWS → 03-DATA-MODEL → 04-SCREENS →
05-TECH-STACK → 06-DEVELOPER-PROMPT. Ambiguous → ask one concise question, don't guess.

## 3b. UI source of truth — FOLLOW CLOSELY
**`docs/PULSE-UI-DESIGN-SYSTEM.md`** = the design system (tokens, themes, component specs, icons,
charts) scraped from PULSE UI. Read it before any UI tweak/restructure/new screen. Reuse
`app/src/components/ui/*` primitives + semantic tokens (`bg-primary`, `text-muted-foreground`); never
raw hex. Default theme = `dark-blue` (glassmorphic). Don't add fonts/colors/radii/shadows without
recording them in that doc.

## 4. Layout & ports
- `landing/` (Vite, port 5050) — marketing site, from PULSE UI `landing-page`.
- `app/` (Vite, port 5051) — field-service PWA, from PULSE UI `pulse-ui-react`.
- `api/` (PHP, port 8080 local) — backend.
- `docs/` — build pack.
- Vite `base`: `/` (landing), `/app/` (app). Dev serves at `/`; build sets base via `deploy.sh`.

## 5. Deploy
Standalone on **`egolimited.com`** (cPanel docroot `~/egolimited.com/`). Build static → push build
output only. Source + `docs/` not deployed. Never push `config.php` / `error_log` / `uploads/`.

```
landing → ~/egolimited.com/        (base /)
app     → ~/egolimited.com/app/    (base /app/)
api     → ~/egolimited.com/api/    (PHP; config.php lives server-side only)
```

`deploy.sh` builds + rsyncs landing + app over the SSH alias `cpanel`. API is rsynced manually
(below). Live URL: **https://egolimited.com/** (app at `/app/`).

## 6. Non-negotiables (from build pack)
- Centralise: job status state machine, invoice numbering/totals/VAT, customer access tokens — one
  module each, reused. - Server-side authz on every request (role + ownership). - Sequential invoice
  numbers, no gaps (UK VAT, allocate transactionally). - No secrets in repo (`config.php` server-side).
  - GDPR: soft-delete, retention, secure photos. - One milestone per turn, review between.

## 7. Status
Near-complete multi-role app. **All in-scope milestones M1–M9, M11–M16 done. M10 (SMS) DROPPED.**

Built:
- **App surfaces (`app/src/pages/ego/`):** dashboard, customers, jobs, schedule, invoices, engineer
  PWA, customer portal, team, settings, integrations + auth.
- **API (`api/`):** PHP backend. `lib/` modules: `job_status`, `invoicing`, `inbox`, `mailer`.
  `schema.sql` = `ego_` tables (users, sessions, customers, addresses, company_settings, jobs,
  activity_log, job_photos, job_notes, invoices, invoice_lines, tasks, recurring_plans,
  customer_access, messages, integrations, payments) + `emails`. `cron.php`, `migrate.php`, `seed.php`.
- **Features:** job-complete alerts + invoice reminders, recurring/maintenance jobs, engineer offline
  indicator, AI triage, task board (kanban, dnd-kit), live integrations (SMTP/IMAP/weather), role
  hierarchy + team management, customer reviews, role-based nav, Activity feed, Payments receivables.

### Deploy mechanics (rsync over SSH alias `cpanel`)
- **App build MUST set base** — `cd app && npx vite build --base=/app/` (plain `npm run build` uses
  base `/`, shipping an index.html pointing at `/assets/*` from `/app/` → 404 / blank app).
  Verify: `grep assets app/dist/index.html` shows `/app/assets/...`.
- App: `rsync -az --delete app/dist/ cpanel:~/egolimited.com/app/`.
- Landing: `cd landing && npx vite build --base=/` then
  `rsync -az --delete --exclude /api --exclude /app landing/dist/ cpanel:~/egolimited.com/`.
- API source: `rsync -az --exclude config.php --exclude error_log --exclude uploads --exclude .impeccable --exclude .htaccess api/ cpanel:~/egolimited.com/api/` (NO `--delete` — preserves server `config.php`, `.htaccess`, `uploads/`).
- **SPA history fallback**: app ships `app/public/.htaccess` → rewrites non-file requests to
  `/app/index.html`. Landing root needs its own `.htaccess` → fallback to `/index.html`. Don't drop them.
- Always `--itemize-changes` + a `-n` dry-run first.
- Smoke test: `curl https://egolimited.com/api/health` → `{"ok":true}`; app + landing 200; founder login returns a token.

### History
- **2026-06-28:** Made standalone. Cut DB over to dedicated `devgeereact_egolimited` (schema + all
  `ego_*`/`emails` data copied, row counts verified; previous shared DB left intact as fallback, old
  config backed up to `~/ego_config_backups/` outside webroot). Rebased the whole project off the old
  subpath onto standalone **`egolimited.com`** (base `/`): all URLs, asset paths, API bases, deploy
  targets, and docs rewritten. Dev ports moved to 5050/5051/8080.
- **2026-06-27:** Activity/Reviews/Contacts/Payments pages, role hierarchy + team, AI triage, task
  board, live integrations. Fixed authz/state-machine bug (`job_can_transition` only matched literal
  `"admin"`; office-class staff were blocked 422 from job-status transitions — now mirrors
  `app/src/lib/jobStatus.ts`). Added SPA history fallback. Dropped M10/SMS (email-only).
- **2026-06-26:** Phase 0 scaffolded — PULSE UI in `landing/`+`app/`, build pack in `docs/`. Backend = cPanel PHP + MySQL.

## 8. Conventions
Conventional commits (`feat:`/`fix:`/`chore:`), small + frequent. One milestone ≈ one branch
(`feat/m3-jobs`). TS everywhere, avoid `any`. Remote: `github.com/devgeereact/egolimited`.
