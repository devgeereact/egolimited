This is the single consolidated reference for EGO LIMITED — every persistent project memory and every Markdown document in the repo, captured in one Notion-ready page. Secrets (passwords, keys, DB credentials, tokens) are deliberately redacted; only non-secret infrastructure facts appear below.

## Project memory (infra map, isolation rule)

These facts come from the project-scoped auto-memory (`MEMORY.md`, `egolimited-infra-map.md`, `project-isolation.md`). They are the durable, cross-session truths about the project.

**What it is.** EGO LIMITED is a standalone, single-tenant field-service management app for a general maintenance company (homes and commercial), live on its own domain **egolimited.com** (verified live and in sync 2026-06-28).

**Server.** cPanel / LiteSpeed host `premium152.web-hosting.com` (CloudLinux). SSH alias `cpanel` (user `devgeereact`, port 21098, identity `~/.ssh/cpanel_deploy`). Docroot `/home/devgeereact/egolimited.com/` routes to: landing `/`, app `/app/`, api `/api/`.

**Database.** MySQL `devgeereact_egolimited` (DB user `devgeereact_egolimited`, host `localhost`), all tables `ego_`-prefixed. The password lives only in the server-side `api/config.php` — never in the repo. Schema source of truth: `api/schema.sql`.

**Local repo.** `/Users/gideonakinlotan/WebstormProjects/egolimited`. Stack: landing (Vite / React / TS / Tailwind, port 5050) + app (PULSE UI, port 5051) + api (PHP / MySQL, port 8080). No local API runs — PHP runs on the server; 8080 is the intended local PHP port.

**GitHub.** `github.com/devgeereact/egolimited` — PRIVATE. Branch `main` tracks `origin/main`, in sync. `gh` authed as `devgeereact` (scopes: repo, workflow, gist, read:org).

**API auth.** `POST /api/auth/login {email,password}` → `{token,user}`; Bearer token, 30-day session. Health: `GET /api/health` → `{"ok":true,"service":"ego-api"}`.

**DB recovery source (important).** The `ego_*` data also lives in the shared **`devgeereact_soulrefresh`** DB (the original subpath deployment at `/home/devgeereact/public_html/egolimited/`, left as a fallback). On 2026-06-28 the dedicated `devgeereact_egolimited` DB was accidentally dropped during cleanup (no dump existed); it was restored by recreating the DB (uapi Mysql `create_database` + `set_privileges_on_database` ALL) and copying all 18 `ego_*` tables from soulrefresh via `mysqldump`. If the API ever returns `500 Database connection failed`, check the DB / grant first; the recovery source is the soulrefresh DB. Note: backups in `~/backups/` are the *other* (v2, unprefixed) app — NOT the `ego_` app.

**Isolation rule (hard).** Everything about egolimited stays inside this project and is never mixed with any other project or client. It is a standalone product on its own domain — not a sub-project of anything. Apply it as: keep all code in this repo / this server docroot only (never borrow from or push into other client folders); use the dedicated DB `devgeereact_egolimited` only (never read or write another project's DB or shared tables); keep secrets server-side (`config.php`) plus this repo's gitignored `.env` (never reuse another project's keys); keep memory and notes only in this project-scoped memory directory.

> Caution: a separate folder `~/WebstormProjects/egolimited_com/` (with an underscore) also exists and runs its own Vite on port 5173. It is NOT this project. Treat it as foreign — do not merge, copy, or deploy from it.

## Local context (CLAUDE.md)

Condensed from the project `CLAUDE.md` (gitignored local context, never deployed), section by section.

**0. Persona.** Operate as a CEO + Senior Developer with 20+ years' experience: strategic first, architect for the long term, flag risk / debt / security, own quality.

**1. What this is.** EGO LIMITED — single-tenant field-service management app for a general maintenance company (homes + commercial), standalone on `egolimited.com`. Roles: Admin (desktop), Engineer (mobile PWA), Customer (tokenised `/track` link). Core loop: enquiry → customer → job → schedule → on-site → complete → invoice → payment → closed. The build pack calls the app "Brightwork" (placeholder); the real name is EGO LIMITED.

**2. Stack — deviation from the build pack.** The build pack (`docs/05-TECH-STACK.md`) specifies Next.js + Vercel + Supabase. This is overridden because the app runs on a cPanel / LiteSpeed host (static + PHP/MySQL, no Node SSR). Actual stack: frontend = Vite + React + TS + Tailwind SPA (the owner-provided PULSE UI framework); backend = PHP + MySQL on cPanel (decided 2026-06-26), secrets in server-side `config.php`, hand-rolled session/token auth, data model translated Postgres → MySQL. Dedicated DB `devgeereact_egolimited`, `ego_`-prefixed tables. Dev ports: landing 5050, app 5051, api 8080. The build pack's PRD / workflows / data model / screens remain the authoritative functional spec — only the implementation tech changes (Postgres/Prisma → MySQL; Next API / server actions → PHP; Auth.js → PHP session/token auth). **M10 (Outbound SMS / Twilio) was DROPPED 2026-06-27** — out of scope, no SMS; all customer/office notifications are email-only.

**3. Source of truth.** `docs/` = the EGO BUILD PACK, read in order: README → 01-PRD → 02-WORKFLOWS → 03-DATA-MODEL → 04-SCREENS → 05-TECH-STACK → 06-DEVELOPER-PROMPT. If ambiguous, ask one concise question rather than guessing.

**3b. UI source of truth.** `docs/PULSE-UI-DESIGN-SYSTEM.md` is the design system (tokens, themes, component specs, icons, charts) scraped from PULSE UI — read it before any UI tweak / restructure / new screen. Reuse `app/src/components/ui/*` primitives and semantic tokens (`bg-primary`, `text-muted-foreground`), never raw hex. Default theme = `dark-blue` (glassmorphic). Do not add fonts / colours / radii / shadows without recording them in that doc.

**4. Layout & ports.** `landing/` (Vite, 5050) marketing site from PULSE UI `landing-page`; `app/` (Vite, 5051) field-service PWA from PULSE UI `pulse-ui-react`; `api/` (PHP, 8080 local) backend; `docs/` build pack. Vite `base`: `/` (landing), `/app/` (app); dev serves at `/`, build sets base via `deploy.sh`.

**5. Deploy.** Standalone on `egolimited.com` (cPanel docroot `~/egolimited.com/`). Build static → push build output only. Source + `docs/` not deployed. Never push `config.php` / `error_log` / `uploads/`. Routing: landing → `~/egolimited.com/` (base `/`); app → `~/egolimited.com/app/` (base `/app/`); api → `~/egolimited.com/api/` (config.php server-side only). `deploy.sh` builds + rsyncs landing + app over the `cpanel` SSH alias; the API is rsynced manually.

**6. Non-negotiables.** Centralise (one module each, reused): job-status state machine, invoice numbering/totals/VAT, customer access tokens. Server-side authorisation on every request (role + ownership). Sequential invoice numbers with no gaps (UK VAT, allocate transactionally). No secrets in repo (`config.php` server-side). GDPR: soft-delete, retention, secure photos. One milestone per turn, review between.

**7. Status.** Near-complete multi-role app. All in-scope milestones M1–M9, M11–M16 done; M10 (SMS) dropped. Built — app surfaces (`app/src/pages/ego/`): dashboard, customers, jobs, schedule, invoices, engineer PWA, customer portal, team, settings, integrations, auth. API (`api/`): PHP backend with `lib/` modules `job_status`, `invoicing`, `inbox`, `mailer`; `schema.sql` of `ego_` tables (users, sessions, customers, addresses, company_settings, jobs, activity_log, job_photos, job_notes, invoices, invoice_lines, tasks, recurring_plans, customer_access, messages, integrations, payments) + `emails`; plus `cron.php`, `migrate.php`, `seed.php`. Features: job-complete alerts + invoice reminders, recurring/maintenance jobs, engineer offline indicator, AI triage, task board (kanban, dnd-kit), live integrations (SMTP/IMAP/weather), role hierarchy + team management, customer reviews, role-based nav, Activity feed, Payments receivables.

**8. Conventions.** Conventional commits (`feat:` / `fix:` / `chore:`), small and frequent. One milestone ≈ one branch (`feat/m3-jobs`). TypeScript everywhere, avoid `any`. Remote: `github.com/devgeereact/egolimited`.

**9. Isolation (hard rule).** As above — nothing shared with any other project (no shared code, DB/tables, secrets, or cross-project memory). The `egolimited_com` underscore folder on port 5173 is a different, foreign project.

**10. Verified infra (checked 2026-06-28).** As captured in the project-memory section above (server, DB, repo, auth, demo logins).

### Deploy mechanics (from CLAUDE.md — rsync over SSH alias `cpanel`)

- **App build MUST set base:** `cd app && npx vite build --base=/app/` (a plain `npm run build` uses base `/`, shipping an `index.html` that points at `/assets/*` from `/app/` → 404 / blank app). Verify with `grep assets app/dist/index.html` showing `/app/assets/...`.
- App: `rsync -az --delete app/dist/ cpanel:~/egolimited.com/app/`.
- Landing: `cd landing && npx vite build --base=/` then `rsync -az --delete --exclude /api --exclude /app landing/dist/ cpanel:~/egolimited.com/`.
- API source: `rsync -az --exclude config.php --exclude error_log --exclude uploads --exclude .impeccable --exclude .htaccess api/ cpanel:~/egolimited.com/api/` (NO `--delete` — preserves the server's `config.php`, `.htaccess`, `uploads/`).
- SPA history fallback: the app ships `app/public/.htaccess` rewriting non-file requests to `/app/index.html`; the landing root needs its own `.htaccess` falling back to `/index.html`. Don't drop them.
- Always use `--itemize-changes` plus a `-n` dry-run first.
- Smoke test: `curl https://egolimited.com/api/health` → `{"ok":true}`; app + landing return 200; founder login returns a token.

## Repo documentation index

Every Markdown file in the repo, with its path, what it is, and key contents. (Vendor template files `app/LICENSE.md` and `app/_reference/README.md` are omitted as boilerplate.)

| File path | What it is | Key contents |
|-----------|------------|--------------|
| `/Users/gideonakinlotan/WebstormProjects/egolimited/CLAUDE.md` | Project local context for Claude Code | Persona, stack deviation, source of truth, layout/ports, deploy mechanics, non-negotiables, status, isolation, verified infra, demo logins, history (condensed in "Local context" above). |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/README.md` | Top-level repo README | Project pitch; why PHP/MySQL not Next.js; folder layout table (landing/app/api/docs); dev ports table (5050/5051/8080); domain & routing; deploy via `deploy.sh`; dedicated DB; status (M1–M9, M11–M16 done, M10 dropped). |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/app/README.md` | App folder README | Vendor "PulseUI Core" boilerplate — a free admin dashboard template built on React, Tailwind, shadcn/ui. Not project-specific; the real app context lives in `CLAUDE.md` and `docs/`. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/landing/README.md` | Landing folder README | Default Vite "React + TypeScript + Vite" scaffold readme (plugins, ESLint config tips). Boilerplate; no project specifics. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/api/README.md` | API folder README | Backend = cPanel PHP + MySQL. Mirrors `docs/03-DATA-MODEL.md` (Postgres → MySQL) plus PHP endpoints and session/token auth. Core logic to centralise: job-status state machine, invoice numbering/totals/VAT, customer access tokens. Dev port 8080; secrets in server-side `config.php`. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/README.md` | Build pack index ("Brightwork") | Single-tenant FSM tool; the three roles (Admin/Engineer/Customer) and their devices; the customer → cash spine; build phases (1 MVP, 2 comms+portal, 3 AI+inbound email); document index; how to drive it with an AI agent; the "adoption" rule. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/00-OVERVIEW.md` | EGO-specific project overview | Three surfaces table (landing/app/api with stacks + dev ports); state as of 2026-06-28 (api mature M1–M15, landing/app re-scaffolded); server-enforced role hierarchy `founder > manager > office > engineer`; customers have no login (tokenised link); secrets locations; deploy scripts. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/01-PRD.md` | Product Requirements | Overview & outcomes; constraints (single tenant, bank-transfer only, invited customers, UK VAT/GDPR); users & roles; permissions matrix; MVP + Phase 2/3 features, user stories, acceptance criteria, success metrics. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/02-WORKFLOWS.md` | Workflows & state machines | Job-to-cash lifecycle; the job status state machine (new → scheduled → en_route → on_site → on_hold → completed → invoiced → paid → closed / cancelled) with who-sets-what and transition rules; notification matrix; edge cases. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/03-DATA-MODEL.md` | Data model | Entities, fields, relationships; Mermaid ERD (users, customers, addresses, jobs, invoices, invoice_lines, payments, job_photos, activity_log, customer_access, messages); example SQL schema. Postgres-assumed in the doc; translated to MySQL `ego_` tables in `api/schema.sql`. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/04-SCREENS.md` | Screen-by-screen spec | For each screen: purpose, key elements, actions, states (loading/empty/error). Covers Admin app (dashboard, customers, jobs, job detail, schedule, invoices, messages, settings), Engineer PWA, and the Customer portal. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/05-TECH-STACK.md` | Tech stack & architecture (build pack's recommendation) | Recommended Next.js + TS + Tailwind + Prisma + Postgres + Supabase/Vercel; single Next.js app for three roles; repo structure; integrations (SMTP, IMAP, Twilio, PDF, Anthropic), security, UK compliance, deployment. **Overridden** by CLAUDE.md to PHP/MySQL on cPanel — kept as functional reference. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/06-DEVELOPER-PROMPT.md` | AI build prompts | Milestone-by-milestone copy-paste prompts for an AI coding agent; kickoff prompt (read docs first, centralise core logic, server-side authz, one milestone per turn); ordered milestones with definitions of done. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/PULSE-UI-DESIGN-SYSTEM.md` | UI design system (law) | Design tokens (HSL CSS variables, semantic names only); radius/container/dark-mode rules; the 5 themes (`dark-blue` default + classic-light, gaussian-black, semi-dark) with feel/primary; component specs, icons, charts. Foundation: shadcn/ui (New York) + Radix + Tailwind + CVA + `cn()`. |
| `/Users/gideonakinlotan/WebstormProjects/egolimited/docs/SCREENS-AND-NAV.md` | Screens & navigation inventory | Master page/nav map: what to reuse from PULSE UI vs build new. Three nav shells (Admin sidebar, Engineer bottom tabs, Customer tokenised page); three dashboards; admin sidebar item-by-item source mapping; shared status-pill colour scheme; extended template pages the owner wants kept. |

## Build pack (docs/) summary

The `docs/` folder is the EGO BUILD PACK — the authoritative functional spec. Read in order:

- **README.md** — orientation: the three roles, the customer → cash spine, the phased build order, and how to drive the build with an AI agent. The one rule: adoption (it must be faster than the whiteboard/notebook/WhatsApp).
- **00-OVERVIEW.md** — the EGO-specific overview (as opposed to the generic "Brightwork" README): three surfaces with real stacks and dev ports, current build state, the `founder > manager > office > engineer` role hierarchy, and secrets/deploy specifics.
- **01-PRD.md** — what to build and why: outcomes, hard constraints (single tenant, bank-transfer only, invited customers, UK VAT/GDPR), roles, permissions matrix, and the feature set across MVP and Phases 2/3 with acceptance criteria.
- **02-WORKFLOWS.md** — how a job moves: the job-to-cash lifecycle, the status state machine and its transition rules (enforced server-side), the notification matrix, and edge cases.
- **03-DATA-MODEL.md** — the entities, relationships, ERD, and example schema. Written for Postgres; translated to MySQL `ego_` tables in `api/schema.sql`, which is the true schema.
- **04-SCREENS.md** — the screen-by-screen functional spec for all three apps (purpose, elements, actions, states).
- **05-TECH-STACK.md** — the build pack's *recommended* architecture (Next.js + Supabase + Prisma). Overridden for this project by the cPanel PHP/MySQL decision, but retained as a functional reference for integrations, security, and UK compliance.
- **06-DEVELOPER-PROMPT.md** — the ordered, milestone-based AI build prompts (kickoff + per-milestone), emphasising centralised core logic, server-side authorisation, and one-milestone-per-turn review.
- **PULSE-UI-DESIGN-SYSTEM.md** — the binding UI design system (tokens, themes, components). Follow exactly; default theme `dark-blue`.
- **SCREENS-AND-NAV.md** — the reuse-vs-build map tying the functional spec to PULSE UI components, plus the nav shells and the shared status-pill colours.

## Key facts at a glance

| Item | Value |
|------|-------|
| Product | EGO LIMITED — single-tenant field-service management app (homes + commercial maintenance) |
| Build-pack codename | "Brightwork" (placeholder; real name = EGO LIMITED) |
| Live domain | https://egolimited.com (app at `/app/`, api at `/api/`) |
| Surfaces & dev ports | landing 5050 · app 5051 · api 8080 (local) |
| Frontend stack | Vite + React + TypeScript + Tailwind SPA (PULSE UI); default theme `dark-blue` |
| Backend stack | PHP + MySQL (mysqli) on cPanel / LiteSpeed |
| Server | cPanel/LiteSpeed `premium152.web-hosting.com` (CloudLinux); SSH alias `cpanel`, user `devgeereact`, port 21098 |
| Docroot | `/home/devgeereact/egolimited.com/` → landing `/`, app `/app/`, api `/api/` |
| Database | MySQL `devgeereact_egolimited` (user `devgeereact_egolimited`, host `localhost`), `ego_`-prefixed tables; truth = `api/schema.sql` |
| DB recovery source | shared `devgeereact_soulrefresh` DB (old subpath deployment, kept as fallback) |
| GitHub repo | `github.com/devgeereact/egolimited` — PRIVATE, branch `main` |
| API auth | `POST /api/auth/login` → `{token,user}`; Bearer token, 30-day session; health `GET /api/health` |
| Deploy | `deploy.sh` builds + rsyncs landing + app over `cpanel`; API rsynced manually; `config.php` server-side only |
| Roles (server-enforced) | `founder` > `manager` > `office` > `engineer`; customers have no login (tokenised `/track` link) |
| Milestones | M1–M9 and M11–M16 done; M10 (SMS / Twilio) DROPPED — email-only |
| Secrets | server-side `api/config.php` + `ego_integrations` table; local `.env` (gitignored) — never in repo |

**Demo logins** (from `seed.php` — one password per role). Passwords are **(stored in repo seed/config — rotate before real data)**:

| Email | Role | Password |
|-------|------|----------|
| admin@egolimited.co.uk | founder | (stored in repo seed/config — rotate before real data) |
| manager@egolimited.co.uk | manager | (stored in repo seed/config — rotate before real data) |
| office@egolimited.co.uk | office | (stored in repo seed/config — rotate before real data) |
| tom@egolimited.co.uk | engineer | (stored in repo seed/config — rotate before real data) |
| sarah@egolimited.co.uk | engineer | (stored in repo seed/config — rotate before real data) |

## History & decisions log

Dated decisions and events, newest first.

- **2026-06-28 — DB accidentally dropped and recovered.** During cleanup, the dedicated `devgeereact_egolimited` DB was accidentally dropped (no dump existed). It was restored by recreating the DB (uapi Mysql `create_database` + `set_privileges_on_database` ALL) and copying all 18 `ego_*` tables from the shared `devgeereact_soulrefresh` DB via `mysqldump`. The soulrefresh DB remains the recovery source if the API ever reports `500 Database connection failed`.
- **2026-06-28 — Made standalone + dedicated DB cutover.** Cut the DB over to dedicated `devgeereact_egolimited` (schema + all `ego_*` / `emails` data copied, row counts verified; previous shared DB left intact as fallback; old config backed up to `~/ego_config_backups/` outside the webroot). Rebased the whole project off the old subpath onto standalone `egolimited.com` (base `/`): all URLs, asset paths, API bases, deploy targets, and docs rewritten. Dev ports moved to 5050 / 5051 / 8080. Infra verified live and in sync.
- **2026-06-27 — Feature build-out + key fixes.** Added Activity / Reviews / Contacts / Payments pages, role hierarchy + team management, AI triage, task board, live integrations. Fixed an authz / state-machine bug (`job_can_transition` only matched literal `"admin"`, so office-class staff were wrongly blocked 422 from job-status transitions — now mirrors `app/src/lib/jobStatus.ts`). Added SPA history fallback.
- **2026-06-27 — M10 (Outbound SMS / Twilio) DROPPED.** Out of scope; all customer/office notifications are email-only. No `TWILIO_*` keys, no `sms` channel; SMS rows in the spec are ignored.
- **2026-06-26 — Backend decided: cPanel PHP + MySQL.** Overriding the build pack's Next.js + Vercel + Supabase recommendation because the host is cPanel / LiteSpeed (no Node SSR). Secrets to live in server-side `config.php`; hand-rolled session/token auth; data model translated Postgres → MySQL.
- **2026-06-26 — Phase 0 scaffolded.** PULSE UI placed in `landing/` and `app/`; build pack placed in `docs/`.

**Standing isolation directive (owner, explicit):** EGO LIMITED stays fully self-contained — never mix code, DB, secrets, or memory with any other project. It is a standalone product on its own domain and dedicated DB. The separate `egolimited_com` (underscore) folder on port 5173 is a different, foreign project — do not merge, copy, or deploy from it.
