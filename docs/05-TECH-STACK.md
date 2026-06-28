# 05 — Tech stack & architecture

An opinionated, pragmatic stack chosen so a small team (or a single developer / AI coding agent) can build,
ship, and maintain it without a large ops burden. Alternatives noted where they matter.

## 1. Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One codebase serves all three role surfaces; SSR + API in one place; PWA-capable for the engineer app |
| Styling | **Tailwind CSS** | Fast, consistent; matches the prototype |
| Database | **PostgreSQL** | Relational data (customers, jobs, invoices) fits perfectly; durable |
| DB access | **Prisma ORM** | Type-safe schema + migrations; great with TypeScript and AI agents |
| Auth | **Auth.js (NextAuth)** or **Supabase Auth** | Email/password or magic link for admin/engineer; tokenised links for customers |
| File storage | **Supabase Storage** or **S3** | Job photos, invoice PDFs |
| Email (outbound) | **Nodemailer over SMTP** (Phase 2) | Meets the "SMTP integration" requirement; **Resend** is an easier drop-in alternative |
| Email (inbound) | **IMAP via `imapflow`** (Phase 3) | Read the company inbox and thread to jobs |
| SMS | **Twilio** (Phase 2) | Reliable UK SMS |
| PDF | **`@react-pdf/renderer`** or HTML→PDF (Playwright) | Invoice PDFs |
| AI | **Anthropic API (Claude)** (Phase 3) | Drafting, summarising, triage |
| Hosting | **Vercel** (app) + **Supabase/Neon** (Postgres) | Low-ops, scales with the business |

> **Simplest path:** Next.js + Supabase (Postgres + Auth + Storage in one) + Prisma. Fewer moving parts for a
> first build. You can split services out later if needed.

## 2. Why a single Next.js app for three roles
- **Admin** = desktop routes under `/admin/*` (auth: admin).
- **Engineer** = mobile routes under `/app/*`, installable as a PWA (auth: engineer).
- **Customer** = public tokenised routes under `/track/{token}` (no login).

Shared data layer, shared status logic, one deploy. Role checks are enforced in the API/server layer, not
just by hiding UI.

## 3. Suggested repo structure

```
/app
  /admin            # admin screens (dashboard, customers, jobs, invoices, settings)
  /app              # engineer PWA screens (today, job detail, profile)
  /track/[token]    # customer portal (public)
  /api              # route handlers (or use server actions)
/lib
  /db               # prisma client
  /auth             # session + role guards
  /jobs             # status state machine + transitions (single source of truth)
  /invoices         # numbering, totals, VAT, PDF
  /notifications    # email/SMS senders (Phase 2)
  /ai               # Claude helpers (Phase 3)
/prisma
  schema.prisma     # mirrors 03-DATA-MODEL.md
/components         # shared UI (status pill, forms, tables)
/public             # manifest.json, icons (PWA)
```

## 4. Core logic to centralise (don't scatter)
- **Job status transitions:** one module that validates `from → to` per role and writes the activity log.
  Every status change in any app goes through it.
- **Invoice numbering & totals:** one module that allocates the next sequential number transactionally and
  computes subtotal/VAT/total. Never duplicate or skip numbers.
- **Customer access tokens:** one module to mint/verify/expire `/track` tokens.

## 5. Integrations

### SMTP email (Phase 2)
- Configure via env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
- Send invoices, confirmations, reminders. Templates with merge fields live in Settings.

### Inbound email / IMAP (Phase 3)
- Poll or use a webhook; parse sender + subject + reference; thread to customer/job; unmatched → new enquiry.

### SMS (Phase 2)
- Twilio: `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. Short status nudges only.

### AI (Phase 3)
- Anthropic API: `ANTHROPIC_API_KEY`. Use for drafting/summarising/triage only. **Human approves before send.**
  Log every AI action. Never let AI change money or status autonomously.

## 6. Environment variables (starter)
```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
STORAGE_BUCKET=
# Phase 2
SMTP_HOST=  SMTP_PORT=  SMTP_USER=  SMTP_PASS=  MAIL_FROM=
TWILIO_SID=  TWILIO_AUTH_TOKEN=  TWILIO_FROM=
# Phase 3
IMAP_HOST=  IMAP_USER=  IMAP_PASS=
ANTHROPIC_API_KEY=
```

## 7. Security
- HTTPS only. Hash passwords with argon2 or bcrypt. Sessions httpOnly + secure cookies.
- **Server-side authorisation** on every request (role + ownership). Engineers can only read/write their jobs.
- Customer `/track` tokens: cryptographically random, single-job scoped, optionally expiring, rotatable.
- Validate and sanitise all input. Rate-limit auth and the public portal.
- Audit log for sensitive actions (status changes, invoice send, mark paid).
- Secrets in environment/secret manager, never in the repo.

## 8. UK compliance
- **GDPR:** lawful basis for holding customer data; a privacy notice; honour erasure/access requests;
  configurable retention; soft-delete (don't keep data longer than needed). Photos may contain personal data —
  store securely, restrict access.
- **VAT invoices:** if VAT-registered, invoices must include a unique sequential number, supplier name +
  address + VAT number, customer details, supply date, description, VAT rate, VAT amount, and total. Keep
  records for the legally required period. Sequential numbering must have no gaps where required — allocate
  transactionally.

## 9. Deployment
- Vercel for the app; managed Postgres (Supabase/Neon); managed object storage for photos/PDFs.
- Automated daily DB backups; test a restore.
- Separate staging and production environments + env vars.

## 10. Testing
- Unit-test the **status state machine**, **invoice totals/VAT**, and **numbering** (highest-risk logic).
- Integration-test the core flow: create job → schedule → engineer completes → invoice → mark paid.
- Manual mobile testing on a real phone for the engineer app (the adoption make-or-break).
