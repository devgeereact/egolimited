# EGO LIMITED — Full Project Documentation

**Product:** EGO LTD — single-tenant Field Service Management (FSM) platform for a London general-maintenance company.
**Domain:** https://egolimited.com (app at `/app/`, API at `/api/`).
**Doc date:** 2026-06-29. Source of truth for code = the repo; this is the narrative companion.

---

## 1. What this is

EGO LIMITED replaces the spreadsheet, paper diary and WhatsApp chaos of a maintenance business with one system that tracks every job from enquiry to paid, and lets customers self-serve job status so the phone stops ringing.

**Core loop:** enquiry → customer → job → schedule → on-site → complete → invoice → payment → closed.

**Why it exists:**
- Nothing falls through the cracks — every enquiry becomes a tracked job.
- Faster "job to cash" — completed work is invoiced and chased without manual memory.
- Fewer "is the engineer coming?" calls — customers track their own job.
- One person can run the whole back office from a phone or laptop.

**Key product decisions:**
- Single tenant (one company). No multi-company SaaS billing.
- Payment is **bank transfer only**. No card gateway. Reconciliation is manual but assisted.
- Customers do **not** self-sign-up — they are invited per job via an unguessable tokenised link + short code.
- UK business: invoices VAT-ready (sequential numbering, no gaps); data handling UK-GDPR-compliant.
- **SMS dropped** (M10, 2026-06-27) — all customer/office notifications are **email-only**.

---

## 2. Architecture at a glance

Three surfaces, one cPanel/LiteSpeed deploy under `egolimited.com/`.

| Surface | Path | What it is | Stack | Dev port |
|---|---|---|---|---|
| `landing/` | `/` | Marketing site — lead-gen, SEO, "get a quote" | Vite + React 19 + TS + Tailwind v4 | 5050 |
| `app/` | `/app/` | Field-service PWA — jobs, invoices, ops (PULSE UI) | Vite + React 19 + TS + Tailwind v4 | 5051 |
| `api/` | `/api/` | Backend — token auth, jobs, invoicing, email | PHP + MySQL (mysqli) | 8080 (intended local) |

- **Frontend:** the owner-provided **PULSE UI** framework (glassmorphic, dark-blue default theme, semantic tokens — never raw hex). Design system documented in `docs/PULSE-UI-DESIGN-SYSTEM.md`.
- **Backend:** hand-rolled PHP. Secrets server-side only in `config.php` (gitignored, never deployed from repo) + the `ego_integrations` table. Auth = hand-rolled session/token. Data model translated from the original Postgres/Prisma spec to MySQL.
- **DB:** dedicated `devgeereact_egolimited` (own user), all tables `ego_`-prefixed. Schema truth = `api/schema.sql`.

> **Stack deviation:** the original build pack (`docs/05-TECH-STACK.md`) specified Next.js + Vercel + Supabase. Overridden because the host is cPanel/LiteSpeed (static + PHP/MySQL, no Node SSR). The build-pack PRD/workflows/data-model/screens remain the authoritative functional spec — translated Postgres→MySQL, Next API→PHP, Auth.js→PHP token auth.

---

## 3. Roles & access (server-enforced)

`founder` > `manager` > `office` > `engineer`. Customers have **no login**.

| Capability | Founder | Manager | Office | Engineer | Customer |
|---|:--:|:--:|:--:|:--:|:--:|
| View/manage all customers | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create/edit/schedule jobs | ✅ | ✅ | ✅ | ❌ | ❌ |
| View assigned jobs | ✅ | ✅ | ✅ | ✅ (own) | ✅ (own job, token) |
| Update job status on site | ✅ | ✅ | ✅ | ✅ | ❌ |
| Photos / notes / sign-off | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create / send invoice | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark invoice paid | ✅ | ✅ | ✅ | ❌ | ❌ |
| View own invoice + bank details | — | — | — | ❌ | ✅ |
| Manage settings / users / integrations | ✅ | ✅ | partial | ❌ | ❌ |

Authorization is enforced **server-side on every request** (role + ownership), not just hidden in the UI. The job-status state machine, invoice numbering/totals/VAT, and customer access tokens are each centralised in one module and reused — never duplicated.

---

## 4. The App (`app/`) — field-service PWA

Built on PULSE UI. All EGO screens live under `app/src/pages/ego/`. Modules:

### Core operations
- **Dashboard** (`dashboard/EgoDashboard.tsx`) — "what needs me today": today's jobs + status, jobs needing scheduling, unpaid/overdue invoice total, recent activity, weather.
- **Customers** (`customers/`) — list, detail, create/edit. Contact info, multiple site addresses, job history, outstanding balance. Search by name/phone/address.
- **Jobs** (`jobs/`) — list (filter by status), detail (customer, address, engineer, schedule, status, photos, notes, checklist, linked invoice, chronological activity log), create/edit form. Auto reference (e.g. `JOB-0142`). Centralised status state machine.
- **Schedule** (`schedule/ScheduleBoard.tsx`) — day/week calendar, jobs grouped/coloured per engineer, assign + reschedule.
- **Invoices** (`invoices/`) — list + detail. Generate from completed job, line items, VAT breakdown, sequential number, bank details + unique payment reference, PDF, send/email, remind, void, mark paid.
- **Payments** (`finance/PaymentsPage.tsx`) — receivables; unpaid/overdue tracking; mark paid → job closes.

### Engineer (mobile PWA)
- **Today / My Jobs** (`engineer/EngineerToday.tsx`, `EngineerMyJobs.tsx`) — only their assigned work, ordered.
- **Job field view** (`engineer/EngineerJobField.tsx`) — status updates (`scheduled → en route → on site → completed`), add photos/notes, tick checklist, capture customer sign-off (drawn signature / confirmation + name).
- **Profile / availability** (`engineer/EngineerProfile.tsx`), offline tolerance (queues update + syncs).

### Customer portal (no login)
- **Track job** (`portal/TrackJob.tsx`) — tokenised link + code; live status timeline, appointment, engineer name, invoice + bank details + payment reference.
- **Contact** (`portal/PortalContact.tsx`) — "message the office" thread.

### Extended operations (beyond original MVP — already built)
- **Assets** (`assets/`) — asset register + servicing history (`ego_assets`, `ego_asset_services`).
- **Compliance** (`compliance/`) — certificates, incident reports, RAMS (risk assessment method statements).
- **Contracts** (`contracts/`) — planned-maintenance contracts, allocations, service-done logging, contract billing.
- **Procurement** (`procurement/`) — suppliers, subcontractors, parts, purchase orders + items, stock movements.
- **Comms** (`comms/`) — inbox (IMAP sync), contacts.
- **Campaigns** (`campaigns/`) — bulk email + subscribers, AI-drafted campaigns.
- **Announcements** (`announcements/`) — internal announcements.
- **Workspace** — activity feed (`workspace/ActivityPage.tsx`), reviews (`workspace/ReviewsPage.tsx`).
- **Team** (`team/TeamPage.tsx`) — role hierarchy + member management, invites.
- **Settings** (`settings/SettingsPage.tsx`) — company/tax/invoice/bank config.
- **Integrations** (`integrations/`) — SMTP/IMAP email, weather.
- **Account security** (`account/AccountSecurity.tsx`) — password, TOTP 2FA; lock screen.
- **Auth** (`auth/`) — login, invite-accept, landing/home redirect.

The repo also retains the **stock PULSE UI demo pages** (buttons, cards, charts, eCommerce, forms, tables, etc.) under `app/src/pages/*` — these are the component library/reference, not part of the EGO product surface.

---

## 5. The Landing site (`landing/`) — marketing

Vite + React 19 SPA. Single source of corporate copy: `landing/src/site/content.ts` (drawn from the EGO brand pack — Brand Guidelines, Voice, Company Profile, Services & Capabilities, Website Copy Pack). Voice: plain, direct, give a price and a date, no jargon, never publish an unbackable claim.

### Pages (`landing/src/site/pages/`)
- **Home** — pillars, services, sectors, process, proof points, reviews, stats/counters, FAQ.
- **Services** + **ServiceDetail** — 8 services (carpentry, painting, minor plumbing, walls & tiling, exterior & grounds, mounting & fitting, property turnarounds, planned maintenance), each with hand-tuned SEO.
- **Sectors** — Homeowners, Landlords, Letting/managing agents, Commercial & facilities.
- **Areas** + **AreaDetail** — North/South/East London.
- **About**, **Accreditations** (reframed as honest trust/insurance — no false gas/electrical claims), **Contact** (get-a-quote → `/api/enquiry`).
- **Track** — customer job tracking entry. **Portal**, **Verify**.
- **Legal** — privacy / terms / cookies. **NotFound** (noindex).

### Content model (`content.ts`)
`company`, `pillars`, `services` + `serviceSeo`, `packages`, `pricing` (still "Price on request" — TODO real rates), `sectors`, `proofPoints`, `process`, `trust`, `faqs`, `articles` + `articleSeo`, `stats`, `counters`, `reviews` (placeholder fallback for `/api/public/reviews`), `team` (role-based, not invented identities).

### SEO infrastructure
`Seo.tsx` manages per-page `<head>` (title/description/canonical/OG/Twitter + per-route JSON-LD) and ships schema helpers: `breadcrumbLd`, `serviceLd`, `articleLd`, `faqLd`, `localBusinessLd`. Sitewide `HomeAndConstructionBusiness` JSON-LD + full social tags live statically in `index.html`. `robots.txt` (disallows `/app`, `/login`) + `sitemap.xml`. **See `02-SEO-AUDIT.md` and `03-SEO-OPTIMIZER.md` for the full SEO state and fix plan.**

---

## 6. The API (`api/`) — PHP backend

Single front controller `api/index.php` routes a flat REST-ish surface. Shared logic in `api/lib/`:
- **`job_status.php`** — the centralised job-status state machine (`job_can_transition`, mirrors `app/src/lib/jobStatus.ts`). Office-class roles can transition (fixed 2026-06-27 authz bug where only literal `"admin"` matched).
- **`invoicing.php`** — invoice numbering (sequential, gap-free, allocated transactionally), totals, VAT.
- **`inbox.php`** — inbound email (IMAP) parse + thread to customer/job.
- **`mailer.php`** — outbound email (SMTP), templates with merge fields.
- **`totp.php`** — TOTP 2FA.

Other backend files: `schema.sql` (truth), `migrate.php`, `seed.php` (demo data + logins), `cron.php` (reminders, recurring jobs, inbox sync), `config.sample.php` (template — real `config.php` is server-side only), `.htaccess`.

### Endpoint map (selected)
- **Auth:** `POST /auth/login` → `{token,user}` (Bearer, 30-day session), `POST /auth/logout`, `GET /auth/me`, `POST /invite/accept`, `POST /me/change-password`, `POST /me/totp/{setup,enable,disable}`.
- **Health:** `GET /health` → `{ok:true,service:"ego-api"}`.
- **Customers:** `GET /customers[/get]`, `POST /customers[/update|/delete]`.
- **Jobs:** `GET /jobs[/get]`, `POST /jobs[/update|/delete]`, `/jobs/status`, `/jobs/schedule`, `/jobs/unschedule`, `/jobs/note`, `/jobs/photo`, `/jobs/checklist/{add,toggle}`, `/jobs/{brief,ai-brief}`.
- **Schedule/engineers:** `GET /schedule`, `GET /engineers`, `POST /engineers[/deactivate]`, `GET /me/jobs[/today|/get]`, `GET /me/history`, `POST /me/availability`, `POST /me/note/ai`.
- **Invoices/payments:** `GET /invoices[/get]`, `POST /invoices[/update|/delete|/send|/email|/pay|/remind|/void]`.
- **Comms:** `GET /inbox[/get]`, `POST /inbox/sync`, `POST /messages/{reply,ack,visibility,delete}`, `POST /email/{draft,send}`, `POST /ai/draft`.
- **Campaigns:** `POST /campaigns/{draft,send}`, `GET /subscribers`, `GET /unsubscribe`.
- **Compliance/ops:** `GET/POST /certificates`, `/incidents`, `/rams`, `/assets` (+ `/assets/service`), `/contracts` (+ `/contracts/{bill,service-done}`), `/suppliers`, `/subcontractors`, `/parts`, `/purchase-orders`, `GET /stock-movements`, `/announcements`.
- **Public (no auth):** `GET /public/company`, `GET /public/reviews`, `POST /enquiry`, `GET /track`, `GET /weather`.
- **Misc:** `GET /dashboard`, `GET /activity`, `GET /recurring`, `GET /reviews`, `GET /tasks`, `GET /notifications`, `POST /notifications/seen`, `GET /settings`, `POST /integrations`.

### AI guardrails
AI **drafts and suggests only** — never sends a message, changes a price, or marks anything paid on its own. Admin approves; all AI actions logged. Used for: enquiry triage, job-brief drafting, email/campaign drafting, engineer note tidy-up.

---

## 7. Data model — `ego_` tables (31)

| Domain | Tables |
|---|---|
| Identity & access | `ego_users`, `ego_sessions`, `ego_customer_access` |
| CRM | `ego_customers`, `ego_addresses` |
| Jobs | `ego_jobs`, `ego_job_notes`, `ego_job_photos`, `ego_job_checklist`, `ego_recurring_plans`, `ego_tasks`, `ego_activity_log` |
| Money | `ego_invoices`, `ego_invoice_lines`, `ego_payments` |
| Comms | `ego_messages`, `ego_announcements`, `ego_integrations` |
| Assets & compliance | `ego_assets`, `ego_asset_services`, `ego_certificates`, `ego_incidents`, `ego_rams_documents` |
| Contracts | `ego_contracts`, `ego_contract_allocations` |
| Procurement | `ego_suppliers`, `ego_subcontractors`, `ego_parts`, `ego_purchase_orders`, `ego_po_items`, `ego_stock_movements` |
| Config | `ego_company_settings` |

Plus an `emails` table (outbound/inbound log). Truth: `api/schema.sql`.

---

## 8. Security & compliance

- HTTPS everywhere. Passwords hashed. Bearer-token sessions (30-day). TOTP 2FA available.
- Role + ownership checks **server-side on every request**.
- Customer portal tokens: unguessable, scoped to one job, expirable.
- Secrets: `api/config.php` (server-side, gitignored, never deployed from repo) + `ego_integrations` table. Local `.env` gitignored. **Never commit/deploy `config.php`, `error_log`, or `uploads/`.**
- UK GDPR: lawful basis + privacy notice, right to erasure, soft-delete, configurable retention, secure photo storage.
- Invoices meet UK VAT requirements: sequential numbering (no gaps, transactional), supplier + VAT details, VAT breakdown.

---

## 9. Infrastructure (verified live & in sync 2026-06-28)

- **Server:** cPanel/LiteSpeed `premium152.web-hosting.com` (CloudLinux). SSH alias `cpanel` → user `devgeereact`, port 21098, identity `~/.ssh/cpanel_deploy`.
- **Docroot:** `/home/devgeereact/egolimited.com/` → landing `/`, app `/app/`, api `/api/`.
- **DB:** MySQL `devgeereact_egolimited` (user `devgeereact_egolimited`, host localhost). Password only in server `config.php`.
  - **Recovery note:** `ego_*` data also exists in the legacy shared `devgeereact_soulrefresh` DB (old subpath deploy, kept as fallback). If API returns `500 Database connection failed`, check DB/grants first; recovery source = soulrefresh DB.
- **Repo:** `/Users/gideonakinlotan/WebstormProjects/egolimited`. GitHub `github.com/devgeereact/egolimited` (PRIVATE), branch `main`.
- **Live health:** `GET https://egolimited.com/api/health` → `{"ok":true,"service":"ego-api"}`.

> A separate folder `~/WebstormProjects/egolimited_com/` (underscore, port 5173) is a **different** project — not this one. Do not merge or deploy from it.

---

## 10. Build & deploy

**App (MUST set base `/app/`):**
```bash
cd app && npx vite build --base=/app/
grep assets app/dist/index.html   # expect /app/assets/...
rsync -az --delete app/dist/ cpanel:~/egolimited.com/app/
```
**Landing (base `/`):**
```bash
cd landing && npx vite build --base=/
rsync -az --delete --exclude /api --exclude /app landing/dist/ cpanel:~/egolimited.com/
```
**API (no `--delete` — preserves server config/htaccess/uploads):**
```bash
rsync -az --exclude config.php --exclude error_log --exclude uploads \
  --exclude .impeccable --exclude .htaccess api/ cpanel:~/egolimited.com/api/
```
- SPA history fallback: app ships `app/public/.htaccess` (→ `/app/index.html`); landing root needs its own `.htaccess` (→ `/index.html`). Don't drop them.
- Always `--itemize-changes` + a `-n` dry-run first.
- Smoke test: `/api/health` ok; app + landing 200; founder login returns a token.

---

## 11. Status

Near-complete multi-role app. **All in-scope milestones M1–M9, M11–M16 done. M10 (SMS) dropped — email-only.**
Built: dashboards, customers, jobs, schedule, invoicing + VAT + payments, engineer PWA (offline-tolerant), customer portal, team + role hierarchy, settings, integrations (SMTP/IMAP/weather), assets, compliance (certs/incidents/RAMS), contracts + planned-maintenance billing, procurement, campaigns + subscribers, inbox, activity, reviews, AI triage/draft (human-in-the-loop), TOTP 2FA.

**Conventions:** Conventional Commits, small + frequent. One milestone ≈ one branch. TS everywhere, avoid `any`. Default app theme `dark-blue`. Reuse PULSE UI primitives + semantic tokens.

---

## 12. Demo logins (rotate before real customer data)

| Email | Password | Role |
|---|---|---|
| admin@egolimited.co.uk | `Admin123!` | founder |
| manager@egolimited.co.uk | `Manager123!` | manager |
| office@egolimited.co.uk | `Office123!` | office |
| tom@egolimited.co.uk | `Engineer123!` | engineer |
| sarah@egolimited.co.uk | `Engineer123!` | engineer |
