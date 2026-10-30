This is the canonical "what is actually built" reference for EGO LTD, compiled from the real codebase (not the spec). It covers the public landing site, the multi-role app (admin desktop, engineer mobile PWA, tokenised customer portal), the PHP/MySQL API surface, the data model, and the cross-cutting systems that tie it together. Where the build pack and the code disagree, the code wins.

EGO LTD is a single-tenant field-service management product for a UK general maintenance company (homes and commercial). The core loop is: enquiry → customer → job → schedule → on-site → complete → invoice → payment → closed. Roles run Founder > Manager > Office (Employee Admin) > Engineer, plus customers who have no login and reach the system only through a tokenised job link.

## Landing site — page by page

Marketing site built with Vite + React + TypeScript + Tailwind. Copy lives in one file (`landing/src/site/content.ts`) drawn from the EGO brand pack; voice is plain and direct (a price and a date, no jargon). Local-area SEO pages live in `landing/src/site/areas.ts`. All pages render through `SiteLayout` (nav + footer) and carry per-page SEO via a shared `<Seo>` component.

| Route | Page file | Purpose | Key sections / CTAs |
|-------|-----------|---------|---------------------|
| `/` | `Home.tsx` | Marketing home | Hero ("The jobs that need doing, done properly."), three pillars (reactive repairs, planned upkeep, the small jobs), animated counter band, process (4 steps), sectors, proof points, reviews feed, primary CTAs: get a quote / call `07539 705576` / track a job |
| `/about` | `About.tsx` | Company story + "the people who turn up" | Promise, intro, role-based team cards, trust points |
| `/services` | `Services.tsx` | Full trade catalogue hub | Cards for all 8 services, packages, indicative pricing table, CTA to quote |
| `/services/:slug` | `ServiceDetail.tsx` | Per-service detail (dynamic) | Body copy, bullet points, "good to know", hand-tuned SEO title/description per slug |
| `/sectors` | `Sectors.tsx` | Audiences EGO serves | Homeowners, landlords, letting/managing agents, commercial & facilities — each with worry + what we provide |
| `/areas` | `Areas.tsx` | Local-area SEO hub | Cards linking to each area page |
| `/areas/:slug` | `AreaDetail.tsx` | Local landing pages (dynamic) | North / South / East London. Localised intro, services with internal links, coverage boroughs, reused 4-step process, `areaServed` schema |
| `/accreditations` | `Accreditations.tsx` | Trust & insurance ("Trust" in nav) | Fully insured, priced in writing, regulated work done by specialists, honest-about-limits. Deliberately NOT claiming in-house gas/electrical registration |
| `/contact` | `Contact.tsx` | Enquiry form | Name/email/phone/address/service/message → `POST /api/enquiry`; newsletter opt-in adds to subscribers |
| `/track` | `Track.tsx` | Customer job tracking entry | Look up a job by short code / token → `POST /api/track/lookup` |
| `/portal` | `Portal.tsx` | Customer portal landing | Entry point to the tokenised track experience |
| `/verify` | `Verify.tsx` | Verification helper page | Public verify surface |
| `/legal/:kind` | `Legal.tsx` | Legal pages | Privacy / terms (noindex), dynamic by `kind` |
| `/404` | `NotFound.tsx` | Not found | Catch-all |

Service catalogue (8): Carpentry & Joinery, Painting & Decorating, Minor Plumbing (non-gas), Walls & Tiling, Exterior & Grounds, Mounting & Fitting, Property Turnarounds, Planned Maintenance.

Top nav: About · Who we help (Sectors) · Areas · Trust (Accreditations), plus a Services mega-menu and a phone CTA. Live legal identifiers (VAT number, Companies House number) are blank in content and merged at runtime from `GET /api/public/company` (set in the app under Settings → Tax).

SEO notes: per-service and per-article SEO maps (`serviceSeo`, `articleSeo`) give hand-tuned titles (≤60 chars) and meta descriptions (150–160 chars). Area pages carry `areaServed` schema and are deliberately localised so no two read alike (avoids doorway-page treatment). Reviews shown publicly fall back to bundled placeholders only when the live `/api/public/reviews` feed is empty; attributed by role + London area, never invented named reviews.

## App — module by module

Vite + React + TS + Tailwind SPA (PULSE UI framework). Routing is `react-router-dom` `createBrowserRouter` in `app/src/routes/index.tsx`; the basename auto-matches the Vite base (`/` in dev, `/app` in production). Nav is role-filtered in `app/src/components/app-sidebar.tsx` — but the server re-enforces every request. Route guards use `RequireRole`; role minimums below.

Note: `app/src/App.tsx` is a legacy placeholder shell and is NOT the live entry — `main.tsx` mounts the real router.

| Module (sidebar group) | Routes | Min role | What it does |
|------------------------|--------|----------|--------------|
| Dashboard (Overview) | `ego/dashboard` | office | KPIs / operational overview (`GET /dashboard`) |
| Jobs (Operations) | `ego/jobs`, `ego/jobs/detail`, `ego/jobs/new` | office | Job list with status/search filters; create job (existing or inline customer); detail with activity log, checklist, invoices, track link, messages, AI brief, status transitions |
| Schedule (Operations) | `ego/schedule` | office | Calendar board: assign engineer + slot, drag from waitlist, unschedule back to waitlist (`GET /schedule`, `POST /jobs/schedule`, `/jobs/unschedule`) |
| Contacts (Operations) | `ego/contacts` | office | Customer contact directory (comms-oriented view) |
| Task Board (Operations) | `ego/tasks` | office | Kanban board (`pages/kanban/TaskBoard.tsx`), dnd-kit drag/drop, assignee colour-coding |
| Invoices (Finance) | `ego/invoices`, `ego/invoices/detail` | office | Quotes + invoices (one model, `kind`), draft → send (allocates gap-free number), void, mark paid, email, PDF, reminders |
| Payments (Finance) | `ego/payments` | office | Receivables: record/delete payments against invoices |
| Email (Workspace) | `ego/inbox` | office | Inbound IMAP inbox threaded to customers/jobs; acknowledge, reply, set engineer visibility |
| Campaigns (Workspace) | `ego/campaigns` | manager | Bulk email to subscribers/contacts, AI-drafted copy, send |
| Reviews (Workspace) | `ego/reviews` | office | Reviews hub (app reviews + imported Google reviews, unified) |
| Announcements (Workspace) | `ego/announcements`, `/new`, `/edit` | manager | Role-audience broadcasts (all / engineers / office), pin/active |
| Parts (Procurement) | `ego/parts`, `/new`, `/edit` | office | Parts catalogue / pricebook (cost & sale), stock level, reorder level |
| Purchase Orders (Procurement) | `ego/purchase-orders`, `/new`, `/edit` | office | POs (header + items), draft → ordered → received (updates stock), cancel |
| Suppliers (Procurement) | `ego/suppliers`, `/new`, `/edit` | office | Supplier records |
| Subcontractors (Procurement) | `ego/subcontractors`, `/new`, `/edit` | office | Subbie register: trades, coverage, insurance expiry, day rate, rating, status |
| Assets (Assets & Contracts) | `ego/assets`, `/new`, `/edit` | office | Asset register per customer + service history, next-service tracking |
| Contracts & PPM (Assets & Contracts) | `ego/contracts`, `/new`, `/edit` | office | Maintenance contracts: SLA hours, PPM cadence, billing cadence, resource allocations, bill / service-done actions |
| Incidents (Compliance) | `ego/incidents`, `/new`, `/edit` | office | H&S incidents: type, severity (incl. RIDDOR), status |
| RAMS (Compliance) | `ego/rams`, `/new`, `/edit` | office | Risk assessments & method statements, review dates |
| Certificates (Compliance) | `ego/certificates`, `/new`, `/edit` | office | Certificate register, holder/engineer link, expiry tracking |
| Activity (Admin) | `ego/activity` | office | Cross-job activity feed (`GET /activity`) |
| Settings (Admin) | `ego/settings` | manager | Company settings: tax/VAT, bank, invoice/job/quote numbering, payment terms, completion-notify email |
| Integrations (Admin) | `ego/integrations` | founder | Secret API keys: SMTP, IMAP, OpenWeather, OpenRouter (AI), Google Places |
| Team | `ego/team` | manager | User management within role hierarchy: create/invite, edit, change role (below own rank), deactivate, soft-delete, force password change |
| Account profile | `ego/account/profile` | office | User profile |

Auth / shell routes (outside the app chrome): `welcome` (in-app landing), `ego/login`, `ego/invite/:token` (accept invite, set password), `ego/account/security` (password + TOTP 2FA), `ego/lock` (lock screen), plus public `track/:token`.

Role gate summary: most operations are **office and up**; Settings / Team / Announcements / Campaigns are **manager and up**; Integrations is **founder only**; the engineer field app is **engineer-exact**.

## Engineer PWA + Customer portal

### Engineer PWA (mobile, role: engineer)
Mobile shell via `EngineerLayout`, service worker registered in production (`sw.js`) for offline support. Engineers only ever see and act on their own jobs (ownership enforced server-side in `load_owned_job` / `/me/*` routes).

| Screen | Route | Purpose |
|--------|-------|---------|
| Today | `ego/engineer/today` | Today's assigned jobs, priority-ordered (`GET /me/jobs/today`) |
| My Jobs | `ego/engineer/jobs` | All active assigned jobs (`GET /me/jobs`) |
| Job (Field) | `ego/engineer/job` | On-site job view: brief + checklist (toggle items), notes (AI-assist draft), photos, customer/office messages, status walk (en route → on site → completed / on hold), capture sign-off name + signature on completion |
| Profile | `ego/engineer/profile` | Own profile + availability toggle (`POST /me/availability`), work history (`GET /me/history`) |

Engineer status moves are restricted to the field chain (scheduled→en_route→on_site→completed, plus on_site↔on_hold). On-hold can capture a reason + parts-required flag/note. Completion writes `completed_at`, sign-off name and signature, and fires an office notification.

### Customer portal (tokenised, no login)
Each job mints an unguessable access token (`ego_customer_access`) and a short code. The public URL is `https://egolimited.com/app/track/<token>`. Reached via landing `/track` or the in-app `ego/portal/track` / `ego/portal/contact` shells.

| Capability | Endpoint | Notes |
|-----------|----------|-------|
| Look up a job | `POST /track/lookup` | By token or short code |
| View job status | `GET /track` | Scoped strictly to the token's job |
| View a document | `GET /track/document` | E.g. invoice/quote for that job |
| Leave a review | `POST /track/review` | Star rating + comment, stored as a `review`-channel message |
| Message the office | `POST /track/message` | Threaded to the job as an inbound message |

## API surface — by domain

PHP front controller `api/index.php` (~2,865 lines), MySQL via mysqli (host has no `pdo_mysql`). Bearer-token auth (`Authorization: Bearer <token>`, 30-day sessions). Every route enforces role + ownership server-side. CORS limited to configured origins. Health: `GET /health` → `{"ok":true,"service":"ego-api"}`.

**Auth & account:** `POST /auth/login` (+ optional TOTP gate), `GET /auth/me`, `POST /auth/logout`, `POST /me/availability`, `POST /me/change-password`, `POST /me/totp/setup` · `/enable` · `/disable`, `POST /invite/accept`.

**Team & engineers:** `GET/POST /team`, `POST /team/update` · `/delete` · `/force-password-change`, `GET/POST /engineers`, `POST /engineers/deactivate`.

**Customers:** `GET /customers`, `GET /customers/get`, `POST /customers` · `/update` · `/delete` (soft).

**Jobs:** `GET /jobs`, `GET /jobs/get`, `POST /jobs` (transactional create + reference), `POST /jobs/brief`, `POST /jobs/ai-brief`, `POST /jobs/status`, `POST /jobs/delete`. Engineer-scoped: `GET /me/jobs/today` · `/me/jobs` · `/me/jobs/get` · `/me/history`, `POST /me/note/ai`, `POST /jobs/note`, `POST /jobs/photo`, `POST /jobs/checklist/toggle` · `/add`.

**Schedule:** `GET /schedule`, `POST /jobs/schedule` · `/jobs/unschedule`.

**Invoices & payments:** `GET /invoices`, `GET /invoices/get`, `POST /invoices` · `/update` · `/send` · `/void` · `/pay` · `/email` · `/remind` · `/delete`, `POST /payments/delete`.

**Dashboard / activity / reviews / notifications:** `GET /dashboard`, `GET /activity`, `GET /reviews`, `GET /notifications`, `POST /notifications/seen`, `POST /reviews/add`, `POST /reviews/import-google`.

**Settings & integrations:** `GET/POST /settings`, `GET/POST /integrations`, `GET /weather`.

**Email & messaging:** `POST /email/send` · `/email/draft`, `POST /ai/draft`, `POST /inbox/sync`, `GET /inbox` · `/inbox/get`, `POST /messages/ack` · `/reply` · `/visibility` · `/delete`.

**Campaigns & subscribers:** `GET/POST /subscribers`, `POST /subscribers/delete`, `POST /campaigns/draft` · `/campaigns/send`, `GET /unsubscribe`.

**Public (landing-facing, unauthenticated):** `POST /enquiry` (contact form, optional newsletter opt-in), `GET /public/company`, `GET /public/reviews`. Customer portal: `POST /track/lookup`, `GET /track` · `/track/document`, `POST /track/review` · `/track/message`.

**Recurring / tasks:** `GET/POST /recurring`, `POST /recurring/delete` · `/recurring/generate`, `GET/POST /tasks`, `POST /tasks/update` · `/assign` · `/move` · `/delete`.

**Procurement:** suppliers / subcontractors / parts (each `GET` list, `GET …/get`, `POST` create/update/delete), `GET /stock-movements`, purchase orders `GET /purchase-orders` · `/get`, `POST /purchase-orders` · `/update` · `/receive` · `/cancel`.

**Assets:** `GET /assets` · `/get`, `POST /assets` · `/update` · `/delete` · `/service`.

**Announcements:** `GET /announcements` (audience-filtered) · `/manage` · `/get`, `POST /announcements` · `/update` · `/delete`.

**Contracts / PPM:** `GET /contracts` · `/get`, `POST /contracts` · `/update` · `/delete` · `/bill` · `/service-done`.

**Compliance:** RAMS (`GET /rams` · `/get`, `POST /rams` · `/update` · `/delete`), incidents (`/incidents` …), certificates (`/certificates` …).

**Notes:** `POST /notes`.

Support scripts: `api/cron.php` (invoice reminders, recurring-job generation, contract billing/PPM), `api/migrate.php`, `api/seed.php`, `api/config.sample.php` (real `config.php` is server-side only).

## Data model — `ego_` tables

From `api/schema.sql` (plus two tables created lazily at runtime). Soft-delete via `deleted_at` where present.

| Table | Purpose |
|-------|---------|
| `ego_users` | Staff accounts: name, email, password hash, role (founder/manager/office/engineer), availability, invite token, TOTP secret/enabled, must-change-password |
| `ego_sessions` | Bearer tokens → user, 30-day expiry |
| `ego_customers` | Customers: name, phone, email, notes, 6-char `ref_code` |
| `ego_addresses` | Customer / site addresses, primary flag |
| `ego_company_settings` | Single-row company config: tax/VAT, bank, invoice/job/quote prefixes + next numbers, payment terms, completion-notify email, Companies House no |
| `ego_jobs` | Jobs: reference, customer, address, engineer, status, priority, quoted amount, schedule, sign-off, brief/summary, hold reason, parts-required |
| `ego_job_checklist` | Per-job on-site checklist items (done state) |
| `ego_job_photos` | Engineer-uploaded job photos |
| `ego_job_notes` | Job notes (author, body) |
| `ego_activity_log` | Audit trail of job/invoice actions |
| `ego_invoices` | Quotes + invoices (`kind`): number (gap-free on send), status, dates, subtotal/VAT/total, payment reference = job ref, reminded-at |
| `ego_invoice_lines` | Invoice/quote line items |
| `ego_payments` | Payments recorded against invoices |
| `ego_customer_access` | Tokenised customer-portal access per job (token + short code) |
| `ego_messages` | Inbound/outbound email + portal messages + reviews (direction, channel, rating, source, ack, engineer-visibility) |
| `ego_integrations` | Integration secrets (SMTP/IMAP/OpenWeather/OpenRouter/Google Places) — values only in MySQL, never in repo |
| `ego_tasks` | Kanban task board cards (status, accent, assignee) |
| `ego_recurring_plans` | Recurring / maintenance job templates + repeat rules |
| `ego_announcements` | Role-audience broadcasts (all/engineers/office), pinned/active |
| `ego_suppliers` | Suppliers / merchants |
| `ego_subcontractors` | Subcontractor register (trades, insurance expiry, day rate, rating) |
| `ego_parts` | Parts catalogue / pricebook + stock level |
| `ego_stock_movements` | Stock ledger (qty deltas with reason/reference) |
| `ego_purchase_orders` | PO headers (supplier, status, dates, totals) |
| `ego_po_items` | PO line items |
| `ego_assets` | Asset register (customer, type, status, next-service date) |
| `ego_asset_services` | Per-asset service history |
| `ego_contracts` | Maintenance contracts: SLA hours, PPM cadence, billing cadence |
| `ego_contract_allocations` | Resourcing per contract (employee/subcontractor) |
| `ego_rams_documents` | RAMS documents (trade, review date, content) |
| `ego_incidents` | H&S incidents (type, severity incl. RIDDOR, status) |
| `ego_certificates` | Certificate register (holder/engineer, expiry, status) |
| `ego_subscribers` | Marketing subscriber/contact list (created lazily) |

## Cross-cutting features

**Auth & roles.** Hand-rolled session/token auth. Hierarchy Founder(4) > Manager(3) > Office/Employee-Admin(2) > Engineer(1), defined in both `api/index.php` (`ROLE_RANK`, `require_role`/`require_min`) and `app/src/lib/roles.ts`. `require_role(…, "admin")` means any office-class user. Engineers are gated exactly (field app + ownership). Customers never log in.

**Job status state machine.** Single source of truth server-side in `api/lib/job_status.php`, mirrored UX-side in `app/src/lib/jobStatus.ts` (must be kept in sync). States: new → scheduled → en_route → on_site → (completed | on_hold) → invoiced → paid → closed, plus cancelled. Engineers may only walk the field chain (+ on_hold↔on_site); office-class may make any valid transition. Server re-validates every transition (returns 422 if not allowed).

**Invoice numbering / VAT.** Centralised in `api/lib/invoicing.php` (mirrored in `app/src/lib/invoicing.ts`). Customers get a deterministic 6-char `ref_code` (from name + phone + postcode). References are per-customer: `CODE-J#` (jobs), `CODE-Q#` (quotes), `CODE-I#` (invoices). Document numbers are allocated transactionally with `SELECT … FOR UPDATE` so there are no gaps and no duplicates (UK VAT requirement). Totals computed centrally: line totals → subtotal → VAT (rate from settings) → grand total, all rounded to 2dp. PDF generation in `app/src/lib/invoicePdf.ts`.

**Customer access tokens.** One unguessable 40-hex token + short code per job (`mint_track_token`), reused if still valid. Powers the tokenised portal; verified by `verify_track_token` which scopes every portal call to exactly one job.

**AI triage / drafting.** Via OpenRouter (model configurable in Integrations, default `openai/gpt-4o-mini`). Used for: engineer job briefs + checklists (`/jobs/ai-brief`, trade-aware), engineer note drafting (`/me/note/ai`), email drafts (`/email/draft`, `/ai/draft`), campaign copy (`/campaigns/draft`). A human always approves before anything sends.

**Integrations.** Outbound email (SMTP), inbound email (IMAP), weather (OpenWeather), AI (OpenRouter), Google reviews import (Places API). All keys stored only in `ego_integrations` in MySQL; secrets never echoed to the client.

**Email system.** Self-contained raw-SMTP mailer (`api/lib/mailer.php`) — PHPMailer was dropped because LiteSpeed choked on it; falls back to local `sendmail`/`mail()` if web-initiated outbound TLS is blocked. Inbound sync (`api/lib/inbox.php`) reads the provider inbox over IMAP, dedupes by message-id, and threads messages to a customer (by from-address) and a job (by `CODE-J#` reference in subject/body). Branded HTML shell via `ego_email_shell`. Office gets a "ready to invoice" email on job completion; invoice reminders are throttled via `reminded_at`.

**Task / kanban board.** `ego_tasks` + `pages/kanban/TaskBoard.tsx`, dnd-kit drag/drop, workers assign cards to each other (assignee colour).

**2FA.** Optional TOTP (RFC 6238, SHA1/6-digit/30s) in `api/lib/totp.php`; additive — only gates users who opt in, never locks others out.

## Tech stack summary

| Layer | Technology |
|-------|-----------|
| Landing | Vite + React + TypeScript + Tailwind (PULSE UI), static, base `/` |
| App | Vite + React + TypeScript + Tailwind (PULSE UI) SPA, base `/app/`, `react-router-dom`, service worker for engineer PWA |
| State / auth (client) | Auth store (`useAuth`), bearer token in client, role-filtered nav |
| Backend | PHP (front-controller `index.php`) on cPanel / LiteSpeed |
| Database | MySQL via mysqli, dedicated DB `devgeereact_egolimited`, `ego_`-prefixed tables |
| Auth | Hand-rolled bearer-token sessions (30-day), optional TOTP 2FA, server-side role + ownership checks |
| AI | OpenRouter (model configurable) |
| Email | Raw SMTP out + IMAP in (no heavy vendor lib) |
| Other integrations | OpenWeather, Google Places (reviews import) |
| Hosting | cPanel/LiteSpeed `egolimited.com`; landing `/`, app `/app/`, api `/api/`; secrets in server-side `config.php` only |
| Tests | Vitest unit tests for invoicing + job-status libs (`*.test.ts`) |
