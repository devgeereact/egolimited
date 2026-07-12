# EGO LIMITED — Executive Product & Engineering Review
**Date:** 12 July 2026 · **Reviewed by:** Executive Product Team (CEO/CPO/CTO/CDO + architecture, design, engineering, security, privacy, QA, growth)
**Scope:** `app/` (React SPA, 174 TS files, ~21.4k LOC) · `api/` (vanilla PHP, ~5.9k LOC, 189 endpoints, 35 tables) · `landing/` (React marketing site, 46 TS files) · `docs/` · CI/CD.
**Constraints acknowledged:** single-tenant, one company, bank transfer only (no card/Stripe), cPanel/LiteSpeed host (no Node SSR), email-only comms (SMS dropped).

---

## 0. The one thing to read

**This is not a SaaS startup. It is one company's operating system.** The single biggest risk to this product is not code quality — it is **scope**. A ~20-person maintenance firm is being handed a product with **19+ sidebar destinations**, **189 API endpoints**, **35 database tables**, and modules for procurement, subcontractor management, PPM contracts, RAMS, incidents, certificates, kanban tasks, cold-email drip campaigns, AI lead prospecting, and Google review import — while the PRD it was built from specifies **seven screens**.

Every product in the comparison set (Linear, Stripe, Notion) won by **removing** surface, not adding it. The correct transformation here is a **subtraction exercise**, not a modernisation exercise. The engineering underneath is genuinely better than most agency work — prepared statements everywhere, a real state machine, gap-free invoice numbering, HMAC-signed private photo URLs, off-webroot storage, sensible rate limiting. That foundation deserves a product with half the surface area and twice the polish.

**Verdict:** healthy engine, overloaded chassis, no instrumentation panel. Ship-ready for a soft launch after the P0 list. Not ready to be relied on financially until observability exists.

---

## 1. Executive Assessment

| Dimension | Finding |
|---|---|
| **Does it work?** | Yes. Live at egolimited.com, all core loops (enquiry → job → schedule → complete → invoice → payment → closed) implemented end-to-end and hardened. |
| **Is it safe?** | Mostly. Prior security sweep closed the real holes (IDOR, SQLi in `interval_unit`, forced password change, rate limiting, private photos). Residual risk is **operational**, not exploitative — see §5. |
| **Can you tell when it breaks?** | **No.** This is the critical gap. One `error_log()` call in 5.9k lines of PHP. The top-level exception handler (`api/index.php:48-51`) prints `{"error":"Server error"}` and **logs nothing**. A silent 500 in the invoice flow is invisible until a human complains. |
| **Will it scale?** | For one company, yes — for years. Table sizes are small. The scaling problem is **human**: a 4,543-line `index.php` with a 198-case `switch` is approaching the limit of what one person can safely change. |
| **Is it maintainable?** | Declining. Zero backend tests. 3 frontend tests. CI runs no tests and no lint. Direct-to-`main`-to-production. This combination will produce a costly regression within months. |
| **Is it profitable?** | It has no revenue model and doesn't need one — its ROI is **operational**: fewer admin hours, faster invoice turnaround, fewer missed jobs. **None of that is currently measured.** |

**Product maturity: 5.5 / 10.** A capable, security-conscious v1 with real business value and a real maintainability cliff ahead of it.

---

## 2. Product Scorecard

| Area | Score | Justification |
|---|:---:|---|
| **UX** | 6/10 | Core loops are complete and coherent. But 19+ nav items for a company that needs 7; zero shared `<EmptyState>` (30 pages hand-roll `.length === 0 &&`); one live route (`ego/portal/contact`) is an unbuilt `<PageSkeleton>` placeholder shipped to production; no error boundary anywhere — one render crash white-screens the app. |
| **UI** | 7/10 | Strongest area. Coherent shadcn/Radix system, 41 primitives, 4 named themes, glassmorphic default, colour-blind-safe status pills, real loading skeletons, themed `confirmDialog()` replacing all 26 `window.confirm()`. Loses points for template debris (13 dead components, "Acme Inc." auth screens live in the router) and **two conflicting Tailwind configs** (`tailwind.config.js` wins; the `.ts` is gutted and dead — a trap for the next editor). |
| **Architecture** | 5/10 | Honest, dependency-free, works on the host it must run on. But: 4,543-line `index.php`; authorization is a `require_role()` call **copy-pasted into ~150 of 189 cases** — forget it once and the endpoint is public; `cron.php` and `campaign_cron.php` each **re-declare their own `db_one/db_all/db_exec`**; the same DDL for campaign tables exists in **three places** (schema.sql, index.php self-heal, campaign_cron.php self-heal). |
| **Performance** | 5/10 | Main bundle **618 KB** unsplit (`manualChunks` was reverted after it caused a TDZ white-screen — the fix was reverted, the problem was not solved). Frontend has **no caching layer at all**: no react-query, no SWR — every navigation refetches from scratch via ad-hoc `useEffect` in 50 page files. Landing ships **25 MB of PNG/JPEG** with exactly one WebP and no image pipeline. Backend: leading-wildcard `LIKE '%q%'` scans on jobs/customers/assets; `GET /invoices` sorts by an unindexed `created_at`. |
| **Accessibility** | 4/10 | Radix gives keyboard/ARIA for free inside primitives; almost nothing is authored above them. 48 `aria-label` across the entire app, 16 `role=`, 6 focus calls total. No skip-link, no focus restoration, no error boundary, no announced live regions. Would fail a WCAG 2.2 AA audit today. |
| **Security** | 7/10 | Genuinely good for the class. Prepared statements **everywhere** (verified — no request data concatenated into SQL). Correct CORS (reflected origin + credentials, never `*`). Private photos off-webroot behind HMAC-signed expiring URLs. TOTP 2FA. Sliding-window rate limiting. Deductions: `backup.php`/`restore.php`/`campaign_cron.php` are **not in the `.htaccess` blocklist** — they rely on a single in-code `PHP_SAPI !== "cli"` guard as their only defence, and `restore.php` can destructively overwrite production. No CSP/HSTS headers. Sessions never rotate. |
| **Scalability** | 5/10 | Fine for the load. Poor for the *team* — the codebase resists safe change, which is the scalability that actually binds here. |
| **Developer Experience** | 4/10 | **The weakest score, and the root cause of most others.** CI (`.github/workflows/deploy.yml`) runs `tsc -b` + `vite build`, then FTPs straight to production. It never runs `vitest` (the script exists), never runs `eslint` (both scripts exist). Zero PHP tests. No staging. No rollback. **Two divergent deploy paths** (CI over FTPS, `deploy.sh` over rsync) that can drift. Direct commits to `main` ship to live. |
| **AI Readiness** | 6/10 | Solid plumbing: multi-model OpenRouter fallback chain, prompt/token caps, per-user daily call caps, shared brand system prompt (`lib/brand.php`). But the "spend caps" are **call-count caps, not cost caps** — actual token/£ spend is never tracked. AI is used for drafting, not for the two places it would actually pay: triage-to-schedule and invoice-chasing. |
| **Brand** | 7/10 | "The jobs that need doing, done properly" is a genuinely good line — plainspoken, confident, correct register for the trade. Landing has real NAP JSON-LD, area pages written to avoid doorway penalties, three real webfonts. The **app** and the **landing** share no typography and no visual language — they read as two companies. |
| **Business Model** | 5/10 | Internal tool; correct call to skip Stripe (bank-transfer-only matches how the trade actually gets paid, avoids 1.4%+20p on every invoice and PCI scope). But **no ROI is instrumented** — no measure of admin hours saved, invoice days-to-paid, or quote win rate, which are the only numbers that justify the build. |
| **Documentation** | 5/10 | Substantial (`docs/` build pack + 24-file `notion-export/`) and substantially **wrong**. The PRD still describes 2 roles (`admin`/`engineer`); the app ships 4 (`founder > manager > office > engineer`). Docs still say "Brightwork" and recommend Next.js/Prisma/Supabase — a stack that was never used. Two doc trees, no index linking them. |
| **Legal Compliance** | 5/10 | Cookie banner, Privacy/Terms/Cookies pages, soft-delete, 6-year retention, ICO route — all present. But: **Terms and Privacy tell customers they can pay by card via a "payment provider" that does not exist** (contradicts the bank-transfer-only design, and misstates data-sharing to a third party that never receives data). Cookie banner gates **nothing** (there is no analytics script to gate). No AI transparency notice despite customer-facing AI drafting. No accessibility statement. |

---

## 3. Strengths — protect these

1. **The money module is right.** `lib/invoicing.php` is a single source of truth: `compute_totals`, `allocate_doc_number` with `FOR UPDATE` row-lock inside a transaction, gap-free per-customer numbering. UK VAT correctness is a legal requirement and it was treated as one.
2. **The job state machine is centralised and mirrored.** `api/lib/job_status.php` ↔ `app/src/lib/jobStatus.ts`, both unit-tested. The client mirror is explicitly documented as non-authoritative.
3. **SQL discipline is exemplary.** Every request-driven query goes through `db_one/db_all/db_exec` with `prepare` + `bind_param`. Zero interpolation of user input. Many teams with 10× the budget do worse.
4. **Private file handling is textbook.** Job photos stored outside the web root, served only via HMAC-signed, time-limited URLs, extension-whitelisted, 6 MB capped.
5. **Zero-dependency backend.** No Composer, no supply chain. On a shared cPanel host this is a feature, not a limitation — nothing to CVE-patch at 2am.
6. **Design tokens are semantic.** No raw hex in the app. Themes are swappable. This is what makes the UI modernisation in §7 cheap rather than a rewrite.
7. **The brand voice.** Landing copy is confident and unpretentious. Do not let a designer "elevate" it.

---

## 4. Weaknesses — what's holding it back

1. **Scope inflation, unowned.** 19+ nav items, none of which appear in the PRD. Procurement, RAMS, certificates, incidents, subcontractors, campaigns, kanban — each was cheap to build and is expensive to *maintain, train, and support*. Nobody has asked whether the office staff will ever open them.
2. **You cannot see the system.** No logging, no APM, no request IDs, no error tracking. `/health` checks `SELECT 1` and nothing else — not SMTP, not IMAP, not OpenRouter.
3. **Quality gates are absent from CI.** Tests exist and are never run. Linters exist and are never run. Production is one `git push` from any keyboard.
4. **The frontend has no data layer.** 88 raw `api()` calls across 50 pages inside `useEffect`. Every back-navigation is a full refetch, every page owns its own loading/error/empty state by hand, and there is no cache to invalidate — so "did my edit save?" is answered by a full page reload.
5. **Authorization is convention, not structure.** ~150 hand-placed `require_role()` calls. The 151st endpoint someone adds in a hurry will be the one that's public.
6. **Documentation actively misleads.** A new engineer reading `docs/` would build the wrong app on the wrong stack with the wrong roles.
7. **Dead weight in production.** 13 unimported components, a whole dead `src/App.tsx`, two unbranded "Acme Inc." auth skins (992 lines, 12 files) **registered as live routes**, a placeholder `PortalContact` page reachable by customers.

---

## 5. Critical Issues — fix before you rely on this financially

| # | Issue | Where | Why it's critical |
|:--:|---|---|---|
| **P0-1** | **Silent failures.** Uncaught exceptions log nothing. | `api/index.php:48-51` | An invoice that fails to send, a payment that half-applies, a cron that dies — all invisible. You will find out from a customer. **Add `error_log()` with a request ID to the handler today. It is a 5-line fix.** |
| **P0-2** | **`POST /payments/delete` hard-deletes from the financial ledger with no transaction.** | `api/index.php:3987-4004` | `DELETE FROM ego_payments` → re-sum → conditionally update invoice status → conditionally update job status, as **four unguarded statements**. A mid-sequence failure leaves an invoice marked paid with no payment behind it. Also: it is the only hard delete among the "delete" endpoints — every other one soft-deletes. For UK record-keeping (6 years), payments must never be hard-deleted. **Wrap in a transaction; convert to soft-delete/reversal.** |
| **P0-3** | **`POST /invoices/void` is not atomic.** | `api/index.php:1840-1855` | Invoice voided, job left `invoiced`. Same class of bug. |
| **P0-4** | **`restore.php` and `backup.php` are web-reachable.** | `api/.htaccess:9,17` blocklist omits them | `restore.php` can overwrite the production database. Its only protection is one `if (PHP_SAPI !== "cli")` line. That is single-layer defence on the most destructive script you own. **Add them to `.htaccess`; better, move both outside the web root entirely.** |
| **P0-5** | **No error boundary.** | `app/src/` — zero `<ErrorBoundary>` | One render exception in any mounted page = white screen. You have **already shipped a white-screen incident twice** (commits `2380494`, `b402129`). react-router's `errorElement` does not catch render errors inside a mounted page. |
| **P0-6** | **Legal copy promises card payments you don't accept.** | `landing/src/site/pages/Legal.tsx` | Terms and Privacy tell customers they can pay by card via a third-party "payment provider," and Privacy discloses data sharing with it. Neither exists. This is a misrepresentation in your published terms and a false statement in a GDPR privacy notice. **Delete those clauses this week.** |
| **P0-7** | **CI has no test or lint gate.** | `.github/workflows/deploy.yml` | Two lines of YAML. There is no argument for not adding them. |

---

## 6. UX Redesign Recommendations (screen by screen)

**Governing principle:** the office staff should be able to run a normal day from **one screen**. Everything else is a destination they visit on purpose.

- **Dashboard → "Today".** Replace the KPI-tile dashboard with an operational cockpit: unassigned jobs, jobs at risk of SLA breach, invoices >14 days unpaid, unread enquiries. Every item is directly actionable inline (assign, schedule, chase) without navigating away. KPIs move to Analytics where they belong.
- **Jobs list.** Add saved views (My jobs / Unassigned / This week / Overdue) as first-class chips, replacing the hunt-through-filters pattern. Server-side pagination (currently capped at 500 rows and scanned in full).
- **`JobDetail.tsx` (606 lines).** Decompose into `<JobHeader>`, `<JobTimeline>`, `<JobActions>`, `<JobPhotos>`. This file is the single hardest thing in the app to change safely.
- **Schedule.** This is the highest-value screen in the product and it's underweighted. Drag-and-drop is currently "nice-to-have" in the PRD — make it required. Add engineer capacity/travel visibility. Unassigned jobs live in a rail on the same screen, dragged onto the board.
- **Invoices/Quotes.** Currently the same component behind two routes with a `defaultKind` prop. Keep the unification (it's correct), but make the mode switch an explicit, visible tab so users know where they are.
- **Engineer PWA.** The offline story stops at an indicator. For a field engineer in a basement in Croydon, "offline indicator" is a description of failure. **Implement an outbox: queue status changes, notes, and photos in IndexedDB, sync on reconnect.** This is the single highest-impact UX investment in the product.
- **Customer portal.** `ego/portal/contact` is an unbuilt placeholder in production — build it or delete the route. The track page should show: what's happening, who's coming, when, and one button to reply.
- **Empty states.** Build one `<EmptyState icon title body action>` and use it in all 30 places. Every empty state should offer the action that fills it.
- **Onboarding.** There is none. A first-run checklist (company details → bank details → VAT → first engineer → first customer) turns a 45-minute confused setup into a 5-minute guided one.
- **Global search (⌘K).** Already exists. Promote it — most staff don't know it's there. Add a persistent hint in the header.

---

## 7. UI Modernisation Plan

The design system is sound; the work is **consolidation, not redesign**.

1. **Delete the second Tailwind config.** `tailwind.config.ts` is gutted and dead; `.js` is what actually compiles. This will bite someone.
2. **Unify typography across app and landing.** Landing loads Barlow Semi Condensed + Inter + Source Code Pro; the app uses the Tailwind system stack. They must be the same product. Adopt **Inter (UI) + Barlow Semi Condensed (display)** in both, self-hosted (not Google Fonts CDN — one less third-party, one less GDPR disclosure, faster LCP).
3. **Cut the theme count from 4 to 2.** `dark-blue` (default) + `classic-light`. `gaussian-black` and `semi-dark` are variance without purpose, and the current mechanism runs **two independent theming systems** (`next-themes` for light/dark, a zustand store for named skins) that fight each other — `ThemePicker.tsx:27` forces `next-themes` to `"light"` to stop the collision. Collapse to one.
4. **Delete template debris:** `src/App.tsx`, `components/calendar/*`, `components/file-manager/*`, `appLauncher-dropdown`, `columns`, `data-table`, `language-dropdown` (which lists countries as languages), `nav-projects`, `team-switcher`, and the entire `auth/basic/*` + `auth/cover/*` "Acme Inc." skins — **12 files, 992 lines, currently live routes**.
5. **Density.** Field-service admin work is table work. Move to a compact density scale (Linear's, not Notion's) — 32px rows, tabular numerals for money columns.
6. **Motion.** framer-motion is loaded; use it for state transitions (job status changes, invoice paid) and nothing else. No decorative animation.

---

## 8. Feature Matrix

| Feature | Verdict | Reasoning |
|---|:---:|---|
| Jobs, state machine, scheduling | **KEEP** | The product. |
| Customers, addresses | **KEEP** | The product. |
| Invoices/quotes, VAT, numbering, payments | **KEEP** | Legally correct and load-bearing. |
| Engineer PWA | **IMPROVE** | Add a real offline outbox. Highest ROI item in the roadmap. |
| Customer portal `/track` | **IMPROVE** | Finish `PortalContact` or delete the route. |
| Bank-transfer-only payments | **KEEP** | Correct commercial call. Saves ~1.6% of revenue and all PCI scope. Add a "Pay by bank transfer" instruction block with a QR code containing the payee/reference — free, and it measurably shortens days-to-paid. |
| Dashboard | **REDESIGN** | Into "Today" (§6). |
| Analytics + CSV export | **KEEP** | Cheap, and the only place ROI can be proven. Add: days-to-paid, quote win rate, first-time-fix rate. |
| SLA targets + escalation | **KEEP** | Well-implemented, real operational value. |
| Recurring/PPM jobs | **KEEP** | Real revenue driver for maintenance firms. |
| Inbox (IMAP) | **SIMPLIFY** | Rebuilding an email client is a losing battle. Keep **inbound threading onto jobs/customers** (that's the value); drop folders/flags/bulk-actions — staff already have Outlook/Gmail. |
| Task board (kanban) | **MERGE** | Fold into Jobs as a saved view. A separate kanban competes with the job list for the same mental model. |
| Announcements | **MERGE** | Into the notification bell. It does not need three routes (list/new/edit). |
| Contacts | **MERGE** | Into Customers. Two address books is one too many. |
| Reviews + Google import | **KEEP** | Low cost, drives landing conversion. |
| Suppliers, Parts, Purchase Orders, Stock | **JUSTIFY OR REMOVE** | ~9 endpoints, 5 tables, 4 nav items. **Ask the client directly: do you buy parts through this system, or from a van and a receipt?** If the honest answer is "receipt," this is dead weight that will never be used and must still be maintained forever. |
| Subcontractors | **JUSTIFY OR REMOVE** | Same question. Keep only insurance-expiry tracking (genuinely useful, legally relevant) and attach it to the engineer record. |
| Assets + asset services | **KEEP (narrow)** | Justified only if commercial PPM contracts exist. Tie it to `ego_contracts` or drop it. |
| Contracts & PPM | **KEEP** | Recurring revenue. |
| RAMS / Incidents / Certificates | **KEEP (compliance)** | Non-negotiable for commercial work in the UK. But these are **document lockers**, not workflows — simplify each to upload + expiry + reminder. Currently they have full CRUD forms nobody will fill in.
| Campaigns / leads / cold-email drip | **REMOVE FROM THIS APP** | This is a **different product** living inside an FSM tool. It has its own cron, its own tables (`ego_leads`, `ego_campaign_steps`, `ego_campaign_sends`, `ego_campaign_automation`), AI web-search prospecting, PECR unsubscribe handling, bank-holiday gating — ~600 lines of the largest page in the app. **Also: it is your biggest live legal exposure** (see §14). If cold outreach is a real business need, it belongs in a dedicated tool (Instantly, Lemlist, Apollo) that already handles suppression lists, deliverability, and PECR compliance properly. Removing it deletes 4 tables, 12 endpoints, a cron job, and a compliance liability. |
| AI drafting (jobs, emails, incidents, announcements) | **SIMPLIFY** | Six near-identical `POST /*/draft` endpoints. Collapse to one `POST /ai/draft {context, kind}`. |
| AI image generation | **REMOVE** | A maintenance company does not need a paid image model. It exists because it was easy, not because it was needed. |
| 4 UI themes | **SIMPLIFY → 2** | §7. |
| "Surfaces" founder-only preview nav | **REMOVE** | Debug affordance shipped to production. |
| `auth/basic/*` + `auth/cover/*` | **REMOVE** | Dead template routes. |

**Net effect of the removals:** ~5 nav items, ~4 tables, ~20 endpoints, one cron job, and one legal liability gone — with **zero loss of function the business actually uses.**

---

## 9. Information Architecture — proposed

```
TODAY            ← operational cockpit (was Dashboard)
JOBS             ← list · saved views · kanban view · task board (merged)
SCHEDULE         ← drag-drop board, unassigned rail
CUSTOMERS        ← contacts merged in
MONEY
  ├─ Quotes
  ├─ Invoices
  └─ Payments
CONTRACTS        ← PPM · recurring plans · assets (merged)
COMPLIANCE       ← RAMS · certificates · incidents (one section, doc-locker UX)
INBOX            ← job/customer-threaded mail only
ANALYTICS
REVIEWS
─────────────────
SETTINGS         ← company · people · integrations · SLA · appearance · security · activity
```
**12 destinations, down from 19+.** Procurement lives under Settings → Suppliers **only if the client confirms they use it**. Engineer PWA and Customer portal stay as separate surfaces, not nav items.

---

## 10. Technical Modernisation

**Backend — the `index.php` problem.** Do **not** rewrite to a framework; the host constraint and the zero-dependency virtue are both real. Do this instead, incrementally, no behaviour change:

```php
// api/routes/jobs.php, invoices.php, customers.php, …
return [
  'GET /jobs'        => ['role' => 'office', 'handler' => 'jobs_list'],
  'POST /jobs/status'=> ['role' => 'office', 'handler' => 'jobs_status', 'rate' => '60/min'],
];
```
A ~40-line dispatcher reads the table, **enforces `role` and `rate` structurally before dispatch**, and calls the handler. This kills the copy-pasted-`require_role()` class of bug permanently, splits a 4,543-line file into ~12 readable ones, and adds no dependency. Move `db_*` helpers into `lib/db.php` so `cron.php` and `campaign_cron.php` stop re-declaring them. Delete the duplicated self-heal DDL — `schema.sql` + `migrate.php` is the only source of truth.

**Observability (P0).**
```php
set_exception_handler(function (Throwable $e) {
    $rid = bin2hex(random_bytes(6));
    error_log("[$rid] {$e->getMessage()} @ {$e->getFile()}:{$e->getLine()}\n{$e->getTraceAsString()}");
    http_response_code(500);
    echo json_encode(["error" => "Server error", "ref" => $rid]);
});
```
Then: `/health` checks DB + SMTP + IMAP + OpenRouter. Cron writes a heartbeat row; a dead cron emails the founder. Frontend errors POST to `/client-error`.

**Frontend data layer.** Adopt **TanStack Query** (already a dependency in `landing/`, so it's a known quantity). This single change removes ~50 hand-rolled `useEffect` fetch blocks, gives free caching, background refetch, optimistic updates, and consistent loading/error states — and is the prerequisite for making the app *feel* fast.

**Bundle.** The `manualChunks` revert (commit `b402129`) left the real problem unsolved: 618 KB in one chunk. The TDZ crash came from a hand-rolled chunker splitting a circular module graph. The fix is not "never split" — it is to split on **explicit, safe boundaries only** (`recharts`, `jspdf`, `fullcalendar` are already lazy; keep React+Radix+router together in one vendor chunk and stop there). Target: <250 KB shell.

**Indexes to add now:** `ego_invoices(created_at)`, `ego_payments(invoice_id, paid_on)`, `ego_messages(channel, archived)`, `ego_tasks(status)`, `ego_recurring_plans(active, next_due)`, `ego_activity_log(created_at)`.

**Search.** Replace `LIKE '%q%'` with MySQL `FULLTEXT` on jobs/customers before the tables reach five figures.

**CI.** Add `npm test` + `npm run lint` as gates. Add a post-deploy smoke test (`curl /api/health` + assert the app's `index.html` references the new bundle hash). Retire `deploy.sh` **or** the FTPS workflow — having two divergent deploy paths guarantees they drift.

**Tests.** Target the money and the state machine, nothing else at first: PHP tests for `compute_totals`, `allocate_doc_number` (concurrency!), `job_can_transition`, and the payment→invoice→job cascade. Then one Playwright happy path: enquiry → job → schedule → complete → invoice → paid.

---

## 11. AI Enhancement Strategy

**Cut the AI that exists for its own sake; add the AI that saves hours.**

| Remove | Why |
|---|---|
| AI image generation | No business need. Paid model. |
| AI lead prospecting / web search | Goes with the campaigns module (§8, §14). |
| 6 separate `/*/draft` endpoints | Collapse to one. |

| Add | Measurable value |
|---|---|
| **Enquiry → structured job** | Free-text enquiry (or inbound email) parsed into: customer match, address, service type, urgency, suggested priority, draft title. Human approves in one click. **Saves ~3 min per enquiry.** |
| **Photo → job note** | Engineer uploads a photo of a broken part; the model drafts the note and suggests the part. **Saves the engineer typing on a phone in a loft.** |
| **Invoice chaser** | Drafts a polite, escalating chase email per overdue invoice, staged by age. Human sends. **Directly shortens days-to-paid — the single most valuable number in the business.** |
| **Weekly ops digest** | Monday email to the founder: revenue, jobs completed, SLA breaches, overdue invoices, engineer utilisation, with a one-paragraph narrative of what changed. |

**Guardrails (from the PRD, currently unenforced):** AI must never send a message, change a price, or mark anything paid. **Add an `ego_ai_log` table** — prompt, model, tokens, cost, user, outcome. Convert the "spend caps" from call-count throttles into **actual £ tracking**, because right now nobody can answer "what did AI cost us last month?"

---

## 12. Brand Refresh

**Do not rebrand.** EGO LIMITED + "The jobs that need doing, done properly" is honest, memorable, and correctly pitched at people who hire tradesmen. A rebrand would burn budget on the one thing that isn't broken.

**Do fix the split personality.** The landing site (Barlow/Inter, warm, confident) and the app (system font, glassmorphic dark-blue admin template) look like different companies. Unify: one type scale, one colour spine, one icon set (lucide) across both surfaces. The customer sees both — the enquiry form and the `/track` page — so the seam is public.

**Positioning to sharpen:** "the small jobs other firms turn down" is the strongest differentiator in the copy and it's buried. Lead with it. It is the whole reason a landlord picks EGO over a big FM contractor.

---

## 13. Enterprise Readiness Review

**Blunt assessment: most of the "enterprise readiness" checklist does not apply, and pursuing it would be value-destroying.**

| Item | Verdict |
|---|---|
| Multi-tenancy | **Don't.** Single-tenant is a deliberate, correct choice. Adding tenancy adds a `tenant_id` to 35 tables, a whole class of leak bugs, and zero value to a company of one. |
| Internationalisation | **Don't.** UK maintenance company, UK customers, UK VAT. Hardcoded English is correct. |
| API ecosystem / public API | **Not yet.** No consumer exists. |
| SSO / SAML | **No.** ~20 users. TOTP 2FA is the right ceiling. |
| RBAC | **Done, and good.** 4-tier hierarchy, founder-hidden, server-enforced. |
| Audit logs | **Partially.** `ego_activity_log` exists but is unindexed on `created_at`/`actor_id` and doesn't capture settings changes, permission changes, or AI actions. Fix that — it's the one enterprise feature that *is* worth having, because it's what you'll want the day something goes wrong. |
| Backups / DR | **Done, and good.** Daily dump, 14-day rotation, off-webroot, documented runbook (RPO ≤24h, RTO 15-30min). **But no restore drill has been logged.** An untested backup is a hypothesis. **Run a drill this month.** |
| Compliance (commercial clients) | RAMS/certificates/incidents exist, which is what a commercial client's procurement team will ask for. Keep. |

**The real "enterprise" gap is operational maturity, not features:** monitoring, alerting, tested restores, a staging environment, and a deploy you can roll back. Those are the things that let one person sleep while a business depends on their code.

---

## 14. Legal & Compliance Review

| Issue | Severity | Action |
|---|:---:|---|
| **Terms & Privacy promise card payments via a "payment provider"** that doesn't exist; Privacy discloses data-sharing with it. | **HIGH** | Misrepresentation in published terms + inaccurate GDPR privacy notice. **Remove this week.** `landing/src/site/pages/Legal.tsx`. |
| **Cold-email drip campaigns to scraped/AI-prospected B2B leads.** | **HIGH** | UK PECR + UK GDPR. B2B cold email to corporate addresses is permissible, but you need: a lawful basis (legitimate interest) with a documented **LIA**, identity of sender, a working opt-out on **every** message, a **suppression list that is checked before every send**, and no sending to sole traders/partnerships without consent (they are treated as individuals). The AI web-search prospecting also raises a **transparency obligation (Art. 14)** — data collected *about* people not *from* them requires notification. **The compliant version of this is a dedicated outreach tool. The current version is an ICO complaint waiting for a bad week.** Recommend removing it from the app (§8). |
| No AI transparency notice. | MEDIUM | Customer-facing emails may be AI-drafted. Say so in the Privacy notice; disclose the sub-processor (OpenRouter and downstream model providers) — this is a **required Art. 28/30 disclosure** and it is currently missing entirely. |
| Cookie banner gates nothing. | MEDIUM | There is no analytics script. Either add analytics and wire consent to it properly, or simplify the banner to a notice. A consent UI that does nothing is worse than none — it implies processing that isn't happening and undermines the record. |
| No accessibility statement. | MEDIUM | Expected for UK service businesses; effectively required if you bid for public-sector work. Also the honest prerequisite: fix §2's accessibility score first. |
| No DPA / sub-processor list. | MEDIUM | You process customer data with OpenRouter, an SMTP provider, an IMAP host, and a weather API. Commercial clients will ask. |
| Records retention. | LOW | 6-year retention documented, soft-delete implemented. Good — but **payments hard-delete** (P0-2) breaks it. |

---

## 15. Prioritised Roadmap

### Phase 0 — Stop the bleeding (this week, ~2 days)
1. Log uncaught exceptions with a request ID. (`api/index.php:48`)
2. Wrap `payments/delete` and `invoices/void` in transactions; make payment deletion a soft reversal.
3. Add `backup.php`, `restore.php`, `campaign_cron.php` to the `.htaccess` blocklist.
4. Add `<ErrorBoundary>` at the app root and per route group.
5. Delete the card-payment clauses from Terms & Privacy.
6. Add `npm test` + `npm run lint` to CI.

### Phase 1 — Foundations (2–3 weeks)
7. Route-table dispatcher; structural role + rate enforcement; split `index.php`.
8. TanStack Query; delete ~50 `useEffect` fetch blocks.
9. Delete dead code: template auth skins, 13 unused components, `App.tsx`, the dead `tailwind.config.ts`.
10. Add the missing indexes; FULLTEXT search.
11. Backend tests for money + state machine. One Playwright happy path.
12. Restore drill — actually do it, log it.

### Phase 2 — The product (3–4 weeks)
13. **Engineer offline outbox** (IndexedDB queue + sync). Highest business value in this document.
14. "Today" cockpit replaces Dashboard.
15. IA collapse: 19 → 12 destinations. Merge tasks/contacts/announcements. **Decide with the client: procurement stays or goes.**
16. Shared `<EmptyState>`, onboarding checklist, finish or delete `PortalContact`.
17. Remove the campaigns module (or migrate it to a compliant external tool).

### Phase 3 — Polish & proof (2–3 weeks)
18. Unify typography/brand across app + landing; 4 themes → 2.
19. Accessibility pass to WCAG 2.2 AA: skip links, focus management, labels, live regions. Publish an accessibility statement.
20. Bundle split to <250 KB shell; landing images to WebP/AVIF (25 MB → ~4 MB).
21. AI: enquiry→job triage, invoice chaser, weekly digest. `ego_ai_log` with real cost tracking.
22. Instrument the ROI: days-to-paid, quote win rate, first-time-fix rate, admin hours saved.

### Long term
Job costing (labour + parts + travel vs invoice = **profit per job**, the number the founder actually wants). Customer self-serve booking. Van stock. Photo-to-quote.

---

## 16. Production Readiness Checklist

- [ ] Uncaught exceptions logged with request ID
- [ ] All multi-table money operations transactional
- [ ] Payments soft-delete (6-year retention intact)
- [ ] `backup.php` / `restore.php` unreachable from the web
- [ ] Error boundary at app root
- [ ] CI runs tests + lint before deploy
- [ ] Post-deploy smoke test (health + bundle hash)
- [ ] One deploy path, not two
- [ ] Rollback procedure tested, not just documented
- [ ] **Restore drill performed and logged**
- [ ] Cron heartbeat + dead-cron alert
- [ ] `/health` checks DB, SMTP, IMAP, AI
- [ ] Founder password set; **all demo credentials rotated** (DB, SMTP, IMAP, OpenRouter, weather)
- [ ] Real company/bank/VAT details replace the demo values (`04-00-04` / `12345678` / `GB123456789` are fake and currently live)
- [ ] Legal copy matches reality (no card payments)
- [ ] AI sub-processor disclosed in Privacy
- [ ] Accessibility statement published
- [ ] Docs updated: 4 roles, PHP/MySQL stack, "EGO" not "Brightwork"
- [ ] Placeholder routes removed from production

---

## 17. Success Metrics

**Instrument these or the build cannot prove its worth.**

| Metric | Target | Why |
|---|---|---|
| **Days-to-paid** (invoice sent → payment recorded) | −30% in 90 days | The single most valuable number in a maintenance business. Cash is the constraint. |
| **Enquiry → job conversion** | Baseline, then +10% | Measures whether the funnel works. |
| **Quote win rate** | Baseline, then +5% | Not currently measured at all. |
| **Admin minutes per job** (enquiry → invoice sent) | −40% | This *is* the ROI of the whole product. |
| **First-time-fix rate** | Baseline | Drives customer satisfaction and margin simultaneously. |
| **Engineer app: offline actions successfully synced** | >99% | The offline outbox either works or the field team stops trusting the app — and once trust is gone it does not come back. |
| **SLA compliance** by priority | >95% | Already instrumented. Surface it. |
| **Daily active staff** | 100% of office + engineers by week 4 | If someone still uses a spreadsheet, the product has failed for them — find out why. |
| **Uncaught 500s / week** | <1 | Currently **unknowable**. That is the point. |
| **p95 page load (app shell)** | <1.5s | Currently a 618 KB unsplit bundle. |
| **WCAG 2.2 AA violations** (axe) | 0 critical | Currently unmeasured; realistically dozens. |
| **AI cost / month** | Tracked, capped, <£20 | Currently untracked. |
| **Restore drill** | Passed, quarterly | An untested backup is a hypothesis, not a backup. |

---

## Closing recommendation

Three moves, in order:

1. **Phase 0 this week.** Seven fixes, two days, and the business stops being one silent exception away from a financial error it cannot see.
2. **Cut the surface.** 19 destinations → 12. Remove campaigns. Interrogate procurement. Every screen must earn its place, and right now several are squatting.
3. **Build the offline outbox.** It is the difference between an app the engineers tolerate and one they rely on — and engineer adoption is the difference between this being a system of record and an expensive second data-entry job.

Everything else in this document is important. Those three are the ones that change the outcome.
