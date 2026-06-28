# 01 — Product Requirements (PRD)

## 1. Overview

**Product:** A single-company field service management (FSM) app for a maintenance business.
**Goal:** Replace the spreadsheet, the paper diary, and the WhatsApp chaos with one system that tracks
every job from enquiry to paid, and lets customers self-serve job status so the phone stops ringing.

**Primary outcomes (why this exists):**
- Nothing falls through the cracks — every enquiry becomes a tracked job.
- Faster "job to cash" — completed work gets invoiced and chased without manual memory.
- Fewer "is the engineer coming?" calls — customers track their own job.
- One person can run the whole back office from a phone or laptop.

**Constraints / decisions already made:**
- Single tenant (one company). No multi-company SaaS billing.
- Payment is **bank transfer only**. No card gateway. Reconciliation is manual but assisted.
- Customers do **not** self-sign-up. They are invited by a job (unique link + code).
- UK business: invoices are VAT-ready; data handling is UK GDPR-compliant.

---

## 2. Users & roles

### 2.1 Admin (office / owner)
Full control. Creates and runs everything. Desktop-first, mobile-capable.

### 2.2 Engineer (field staff)
Sees only their assigned work. Mobile-only experience. No access to money, customers' full history,
or settings. Can update job status, add photos/notes, capture sign-off.

### 2.3 Customer (client)
No account in MVP. Accesses a single job via a tokenised link + short code. Read-mostly:
sees status, appointment, and (Phase 2) invoice/payment details. Can message the office.

### 2.4 Permissions matrix

| Capability | Admin | Engineer | Customer |
|---|:---:|:---:|:---:|
| View all customers | ✅ | ❌ | ❌ |
| Create / edit customer | ✅ | ❌ | ❌ |
| Create / edit job | ✅ | ❌ | ❌ |
| Assign engineer / schedule | ✅ | ❌ | ❌ |
| View assigned jobs | ✅ | ✅ (own) | ✅ (own job) |
| Update job status on site | ✅ | ✅ | ❌ |
| Add job photos / notes | ✅ | ✅ | ❌ |
| Capture customer sign-off | ✅ | ✅ | ❌ |
| Create / send invoice | ✅ | ❌ | ❌ |
| Mark invoice paid | ✅ | ❌ | ❌ |
| View own invoice + bank details | ✅ | ❌ | ✅ |
| Send messages to customer | ✅ | ❌ | ❌ |
| Message the office | ✅ | ❌ | ✅ |
| Manage settings / users | ✅ | ❌ | ❌ |

---

## 3. Scope by phase

| Area | Phase 1 (MVP) | Phase 2 | Phase 3 |
|---|---|---|---|
| Auth & users | ✅ | | |
| Customers | ✅ | | |
| Jobs | ✅ | recurring jobs | |
| Scheduling / dispatch | ✅ | | route hints |
| Engineer mobile | ✅ | offline tolerance | |
| Invoicing | ✅ | reminders | |
| Payments (manual) | ✅ | bank-ref matching | |
| Dashboard | ✅ | | AI summary |
| Outbound email/SMS | | ✅ | |
| Customer portal | basic status only | full | |
| Notifications | | ✅ | |
| AI assistant | | | ✅ |
| Inbound email reading | | | ✅ |

---

## 4. MVP (Phase 1) — detailed requirements

User stories use: **As a [role], I want [capability], so that [reason].**
Each feature lists **acceptance criteria (AC)** — the conditions that must be true for it to be "done".

### 4.1 Authentication & users
- **US-1.1** As an admin, I want to log in securely, so that only authorised staff access the system.
  - AC: Email + password login (or magic link). Sessions persist. Logout works. Passwords hashed.
- **US-1.2** As an admin, I want to add engineer accounts, so that field staff can use the mobile app.
  - AC: Admin can create an engineer (name, email, phone, role). Engineer receives an invite to set a password.
- **US-1.3** As an engineer, I want to log in on my phone, so that I see only my jobs.
  - AC: Engineer login lands on the mobile "Today" view. Engineer cannot reach admin screens (enforced server-side, not just hidden).

### 4.2 Customers
- **US-2.1** As an admin, I want to create a customer record, so that I can attach jobs to them.
  - AC: Fields — name, phone, email, one or more site addresses, notes. Name + at least one contact method required.
- **US-2.2** As an admin, I want to search and view customers, so that I can find them fast.
  - AC: Search by name/phone/address. Customer detail shows contact info, addresses, job history, and outstanding balance.
- **US-2.3** As an admin, I want to edit a customer, so that details stay current.
  - AC: Edit all fields. Changes are saved with an updated timestamp.

### 4.3 Jobs
- **US-3.1** As an admin, I want to create a job, so that work is tracked from the start.
  - AC: Fields — customer (existing or new), site address, title, description, priority (low/normal/urgent),
    optional quoted price, status (defaults to `new`). A unique human-readable reference is auto-generated (e.g. `JOB-0142`).
- **US-3.2** As an admin, I want to see all jobs filtered by status, so that I know what's where.
  - AC: Jobs list with filters (new, scheduled, in progress, completed, invoiced, paid, cancelled) and search.
- **US-3.3** As an admin, I want a full job record, so that everything about the job lives in one place.
  - AC: Job detail shows customer, address, description, assigned engineer, schedule, status, photos, notes,
    linked invoice, and a chronological activity log.
- **US-3.4** As an admin, I want to change a job's status manually when needed, so that I can correct or override.
  - AC: Admin can set any valid status. Each change is recorded in the activity log with who + when.

### 4.4 Scheduling & dispatch
- **US-4.1** As an admin, I want to schedule a job and assign an engineer, so that the right person turns up.
  - AC: Set date + time window, assign one engineer. Job status moves to `scheduled`. Assigned job appears in
    the engineer's app.
- **US-4.2** As an admin, I want a day/week calendar of jobs, so that I can see and avoid clashes.
  - AC: Calendar shows scheduled jobs by day, grouped/coloured per engineer. Re-assign or re-schedule by editing
    the job (drag-and-drop is a nice-to-have, not required for MVP).

### 4.5 Engineer mobile app
- **US-5.1** As an engineer, I want to see today's jobs in order, so that I know where to go.
  - AC: "Today" list shows job title, customer, address (tap to open maps), time window, and status.
- **US-5.2** As an engineer, I want to update my status on site, so that the office and customer know progress.
  - AC: From a job, the engineer can move `scheduled → en route → on site → completed`. Each tap updates the
    job server-side and is logged.
- **US-5.3** As an engineer, I want to add photos and notes, so that the work is documented.
  - AC: Upload one or more photos to a job. Add free-text notes. Both visible to admin.
- **US-5.4** As an engineer, I want to capture the customer's sign-off, so that completion is confirmed.
  - AC: On completion, capture a signature (drawn) or a confirmation tick + name. Stored against the job.

### 4.6 Invoicing
- **US-6.1** As an admin, I want to create an invoice from a completed job, so that I don't re-type details.
  - AC: From a `completed` job, generate an invoice pre-filled with customer, address, and (if present) the quoted
    amount. Add/edit line items (description, qty, unit price). VAT calculated per settings. A unique sequential
    invoice number is assigned.
- **US-6.2** As an admin, I want an invoice to show our bank details and a unique payment reference, so that the
  customer can pay by transfer and I can match it later.
  - AC: Invoice displays company details, line items, VAT breakdown, total, bank account details, and a unique
    payment reference (the job/invoice number). Downloadable/printable as PDF.
- **US-6.3** As an admin, I want to send the invoice, so that the customer receives it.
  - AC (MVP): Generate a PDF and a shareable link; mark invoice `sent`. (Automated email send is Phase 2 — in MVP,
    admin can download/share manually.)

### 4.7 Payments (manual, bank transfer)
- **US-7.1** As an admin, I want to mark an invoice as paid, so that the job closes and stops being chased.
  - AC: One action marks an invoice `paid` (records date + optional amount/reference). The linked job moves to
    `paid` then `closed`. Customer balance updates.
- **US-7.2** As an admin, I want to see unpaid and overdue invoices, so that I can chase them.
  - AC: Invoices list filterable by `draft / sent / paid / overdue`. Overdue = sent + past due date.

### 4.8 Dashboard
- **US-8.1** As an admin, I want a "what needs me today" screen, so that I can run the day at a glance.
  - AC: Dashboard shows: today's jobs (with status), jobs needing scheduling, unpaid/overdue invoice total,
    and recent activity. Each item links to its record.

### 4.9 Settings
- **US-9.1** As an admin, I want to set company and invoice details, so that invoices are correct and legal.
  - AC: Company name, address, contact, VAT number + default VAT rate, logo, bank details (account name, sort code,
    account number), invoice number prefix/start, default payment terms (e.g. 14 days).
- **US-9.2** As an admin, I want to manage engineer accounts, so that I control access.
  - AC: List, add, deactivate engineers.

---

## 5. Phase 2 — communications & customer portal

- **Outbound email (SMTP):** Send invoices, appointment confirmations, and updates by email from the company
  address. Reusable templates with merge fields ({customer_name}, {job_ref}, {date}, {amount}, {payment_ref}).
- **Outbound SMS:** Short status nudges ("Your engineer is on the way", "Invoice sent"). Twilio (or similar).
- **Customer portal (full):** Tokenised link + short code per job. Live status timeline, appointment details,
  engineer name, invoice + bank details + payment reference, and a "message the office" thread.
- **Automated notifications:** Event-driven (see `02-WORKFLOWS.md` notification matrix) — e.g. on `scheduled`,
  `en route`, `completed`, `invoice sent`. Configurable on/off per event.
- **Invoice reminders:** Automatic reminder email/SMS X days after an invoice is sent if still unpaid.

## 6. Phase 3 — AI assistant & inbound email

- **AI drafting:** Draft replies, quotes, and customer messages; turn rough engineer notes into a tidy job
  summary; summarise long threads. Always admin-reviewed before sending (human in the loop).
- **AI triage:** Categorise and prioritise incoming enquiries; suggest the next available engineer to assign.
- **Inbound email (IMAP):** Read the company inbox, parse messages, and thread them to the matching customer/job
  (by sender, reference, or subject). New unmatched emails become enquiries for the admin to action.
- **AI dashboard summary:** A plain-English "here's your day / here's what needs attention" summary.

> **AI guardrails:** AI never sends a message, changes a price, or marks anything paid on its own. It drafts and
> suggests; the admin approves. All AI actions are logged.

---

## 7. Non-functional requirements

- **Performance:** Common screens load in < 2s on a mid-range phone over 4G. Status updates feel instant
  (optimistic UI).
- **Mobile/offline:** Engineer app is a PWA, installable, and tolerant of brief signal loss (queues a status
  update / photo and syncs when back online — full offline is a Phase 2 hardening goal).
- **Security:** HTTPS everywhere. Passwords hashed (bcrypt/argon2). Role checks enforced server-side. Customer
  portal tokens are unguessable, scoped to one job, and expirable. Audit log of sensitive actions.
- **Compliance (UK):** GDPR lawful basis + privacy notice, right to erasure, configurable data retention.
  Invoices meet UK requirements (sequential numbering, supplier + VAT details, VAT breakdown). See `05-TECH-STACK.md`.
- **Accessibility:** Keyboard navigable, visible focus, sufficient contrast, respects reduced motion.
- **Backups:** Daily automated database backups; photo storage durable.

## 8. Out of scope (for now)
Card/online payments · multi-company/franchise support · accounting-software sync (Xero/QuickBooks) ·
inventory/parts stock control · GPS live engineer tracking · customer self-signup/marketplace · payroll.
(Several are good Phase 4+ candidates.)

## 9. Success metrics
- % of enquiries that become tracked jobs (target: ~100%).
- Average days from job completion → invoice sent (target: same day).
- Average days from invoice sent → paid (trend down).
- % of jobs where the customer used the tracking link (Phase 2).
- Staff adoption: the team uses it daily instead of paper/WhatsApp.

## 10. Assumptions & open questions
- Team size assumed small (1 office + up to ~5 engineers). Confirm before scaling the schedule view.
- Work is a mix of reactive call-outs and scheduled maintenance — recurring jobs deferred to Phase 2.
- Confirm: VAT-registered? (Drives whether VAT shows on invoices by default.)
- Confirm: do engineers use personal phones (PWA install) or company devices?
