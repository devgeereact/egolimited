# 06 — Developer build prompts

This file is written to be handed to an **AI coding agent** (Claude Code, Cursor, etc.) — or a human
developer. It turns the rest of the pack into an ordered, low-risk build. The key idea: **build one
milestone at a time, review, then move on.** Do not ask the agent to "build the whole app" in one go.

---

## How to use

1. Create a new empty Git repo. Put this whole `build-pack/` folder at the root (e.g. in `/docs`).
2. Open the repo in your coding agent.
3. Paste the **Kickoff prompt** below. It tells the agent to read the docs and set up the project.
4. Then paste **Milestone 1**, review the result, commit, and continue to Milestone 2, and so on.
5. After each milestone, run the app and check the "Definition of done" before moving on.

---

## Kickoff prompt (paste first)

```
You are my senior full-stack engineer building a single-company field service management app.

Before writing any code, read every file in /docs (build-pack): README, 01-PRD, 02-WORKFLOWS,
03-DATA-MODEL, 04-SCREENS, 05-TECH-STACK. Treat them as the source of truth. If anything is ambiguous,
ask me a short question rather than guessing.

Stack (from 05-TECH-STACK): Next.js (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL.
Use Supabase for Postgres, Auth, and Storage unless I say otherwise.

Principles:
- Build in the milestone order I give you. Do ONE milestone per turn. Stop and let me review before the next.
- Centralise core logic: the job status state machine, invoice numbering/totals, and customer access tokens
  must each live in one module and be reused everywhere (see 05-TECH-STACK section 4).
- Enforce authorisation on the server for every request (role + ownership), not just by hiding UI.
- Keep it simple and readable. Small components. Clear names. No premature abstraction.
- Mobile-first for the engineer app; desktop-first for admin.
- Write a short test for any money or status-transition logic.

First task: scaffold the project (Next.js + TypeScript + Tailwind + Prisma), create the Prisma schema that
mirrors 03-DATA-MODEL.md exactly, set up the database connection and migrations, and add a seed script with
one company settings row, one admin, two engineers, three customers, and a few sample jobs. Then show me how
to run it locally. Do not build any screens yet.
```

**Definition of done:** project runs locally; `prisma migrate` creates the schema; seed data loads.

---

## Phase 1 (MVP) milestones

### Milestone 1 — Auth & roles
```
Implement authentication and roles per 01-PRD section 4.1 and 05-TECH-STACK section 7.
- Admin and engineer login (email/password or magic link).
- Server-side session + role guards: a reusable helper that protects routes by role and (for engineers)
  by job ownership.
- Admin can create/deactivate engineer accounts; engineers get an invite to set a password.
- Route groups: /admin/* (admin only), /app/* (engineer), /track/[token] (public — stub for now).
Add a couple of tests for the role guard. Stop and let me review.
```
**Done:** can log in as admin and as engineer; engineers are blocked from /admin server-side.

### Milestone 2 — Customers
```
Build the Customers area per 04-SCREENS A2–A4 and 01-PRD 4.2.
- List with search, customer detail (with job history + balance placeholder), new/edit form with validation.
- Server actions/API with proper auth. Soft-delete (deleted_at), never hard-delete.
Stop and let me review.
```
**Done:** create, search, view, edit customers; validation works.

### Milestone 3 — Jobs (core record)
```
Build Jobs per 04-SCREENS A5–A7 and 01-PRD 4.3, and implement the JOB STATUS STATE MACHINE from
02-WORKFLOWS section 2 as a single reusable module.
- New job form (customer inline-create, address, title, description, priority, quoted amount).
- Auto-generate the job reference (JOB-####) transactionally from company_settings.
- Jobs list with status filter + search; job detail showing all fields + activity log.
- Every status change goes through the state-machine module and writes to activity_log.
Add tests for the state machine (valid + invalid transitions, per role).
Stop and let me review.
```
**Done:** create/list/view jobs; references generate with no gaps; status changes are validated + logged.

### Milestone 4 — Scheduling & dispatch
```
Build scheduling per 04-SCREENS A8 and 01-PRD 4.4.
- From a job, set date/time window and assign an engineer → status `scheduled`.
- A day/week schedule view showing jobs per engineer (drag-and-drop optional, not required).
Stop and let me review.
```
**Done:** assign + schedule a job; it appears on the schedule and is ready for the engineer app.

### Milestone 5 — Engineer mobile app (PWA)
```
Build the engineer app per 04-SCREENS B1–B4 and 01-PRD 4.5. Mobile-first; make it an installable PWA
(manifest + icons). 
- Today list, my jobs, job detail with the status-aware primary action button
  (scheduled → en route → on site → completed), photo upload (to storage), notes, and sign-off capture.
- Use optimistic UI for status taps. Reuse the SAME status state machine from Milestone 3.
- Engineers see only their own assigned jobs (enforced server-side).
Test on a real phone viewport. Stop and let me review.
```
**Done:** an engineer can run a job end to end on a phone; admin sees the updates live.

### Milestone 6 — Invoicing
```
Build invoicing per 04-SCREENS A9–A10 and 01-PRD 4.6. Implement invoice numbering + totals + VAT as a
single reusable module (05-TECH-STACK section 4).
- From a `completed` job, create an invoice pre-filled from the job; editable line items; live subtotal/VAT/total.
- Allocate a unique SEQUENTIAL invoice number transactionally (no gaps/duplicates).
- Show company + bank details + payment reference (the invoice/job number). Generate a PDF.
- "Send" sets status `sent` and job `invoiced` (MVP: produce PDF + shareable link; email is Phase 2).
Add tests for totals, VAT, and numbering. Stop and let me review.
```
**Done:** raise an invoice from a job; correct VAT/totals; sequential number; downloadable PDF with bank details.

### Milestone 7 — Payments (manual) & dashboard
```
Build manual payments per 01-PRD 4.7 and the dashboard per 04-SCREENS A1.
- "Mark as paid" records a payment (date, amount, reference), sets invoice `paid`, job `paid → closed`,
  updates the customer balance.
- Invoices list with draft/sent/overdue/paid filters; overdue = sent + past due date.
- Dashboard: today's jobs, jobs to schedule, unpaid/overdue total, recent activity — each links to its record.
Stop and let me review.
```
**Done:** full job-to-cash loop works; dashboard reflects reality.

### Milestone 8 — Settings & polish
```
Build Settings per 04-SCREENS A12 and 01-PRD 4.9, then a polish pass.
- Company details, VAT, bank details, invoice prefix/next-number, payment terms, engineer management.
- Polish: empty states with a "next action", friendly errors, loading skeletons, keyboard focus, mobile checks.
Stop and let me review.
```
**Done:** settings drive invoices correctly; the app feels finished and fast. **MVP complete.**

---

## Phase 2 milestones (after MVP is in use)
```
M9  — Outbound email via SMTP (Nodemailer): send invoices + confirmations; templates with merge fields.
M10 — Outbound SMS (Twilio): status nudges. — DROPPED 2026-06-27: out of scope. No SMS in this app; notifications are email-only.
M11 — Customer portal (full): tokenised /track/[token] with live timeline, invoice + bank details + reference,
      "message the office". Implement the access-token module (mint/verify/expire).
M12 — Automated notifications (02-WORKFLOWS section 5) + invoice reminders, each toggleable in Settings.
M13 — Recurring/maintenance jobs (templates + repeat rules) + offline hardening for the engineer app.
```

## Phase 3 milestones
```
M14 — AI assistant (Anthropic API): draft replies/quotes, tidy engineer notes, summarise threads.
      Human approves before anything sends. Log all AI actions. AI never changes money or status.
M15 — Inbound email (IMAP): read the inbox, thread to customer/job, unmatched → new enquiry.
M16 — AI triage + dashboard summary.
```

---

## Conventions for the agent
- **Commits:** small and frequent; conventional style (`feat:`, `fix:`, `chore:`). One milestone ≈ one PR/branch.
- **Branches:** `feat/m3-jobs`, etc.
- **Types:** TypeScript everywhere; no `any` without a reason.
- **No secrets in the repo:** use `.env` + `.env.example`.
- **Reuse, don't duplicate:** status transitions, invoice numbering/totals, and access tokens each have exactly
  one home.
- **Ask, don't guess:** if a requirement is unclear, ask one concise question before building.
- **Stop after each milestone** for review. Never jump ahead.

## A note for the human (you)
After each milestone, actually click through it as the relevant role. The most important checks aren't in the
code — they're "is this fast and obvious for my wife and the engineers?" If a screen makes either of them
hesitate, fix it before moving on. That feedback loop is what makes the app get used.
