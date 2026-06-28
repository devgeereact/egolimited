# 02 — Workflows (start to finish)

This document describes how a job moves through the system, who does what, what the system does
automatically, and how the three roles stay in sync. The golden rule: **one job is the single source of
truth, and all three roles are just different views of it.**

---

## 1. The job-to-cash lifecycle

```
[Enquiry] → [Customer created/matched] → [Job created]
   → [Scheduled & engineer assigned] → [Engineer: en route → on site → completed]
   → [Invoice raised & sent] → [Payment received (bank transfer)] → [Job closed]
```

A single job carries one **status** through this loop. Changing the status is what drives the dashboard,
the engineer's app, the customer's tracking page, and (Phase 2) the notifications.

---

## 2. Job status state machine

| Status | Set by | Means | Can move to | Triggers (Phase 2+) |
|---|---|---|---|---|
| `new` | Admin | Job created, not yet scheduled | `scheduled`, `cancelled` | — |
| `scheduled` | Admin | Date/time set, engineer assigned | `en_route`, `cancelled`, `new` (unschedule) | Email/SMS: appointment confirmed |
| `en_route` | Engineer | Engineer travelling | `on_site`, `cancelled` | SMS: "engineer on the way" |
| `on_site` | Engineer | Engineer working | `completed`, `on_hold` | — |
| `on_hold` | Admin/Engineer | Paused (parts needed, access issue) | `scheduled`, `on_site`, `cancelled` | Optional notify |
| `completed` | Engineer | Work done + signed off | `invoiced` | Notify: work complete |
| `invoiced` | Admin | Invoice raised & sent | `paid`, `completed` (void invoice) | Email: invoice + bank details |
| `paid` | Admin | Payment received & matched | `closed` | Email/SMS: payment received, thanks |
| `closed` | Admin/system | Finished and archived | — | — |
| `cancelled` | Admin | Job won't happen | — | Optional notify |

**Rules**
- Only valid transitions are allowed (enforce server-side).
- Engineers may only move `scheduled → en_route → on_site → completed` (+ `on_hold`).
- Admin may make any valid transition and may correct mistakes.
- Every transition writes to the **activity log**: `{job_id, from, to, actor, timestamp, note?}`.

## 3. Invoice status state machine

| Status | Set by | Means | Can move to |
|---|---|---|---|
| `draft` | Admin/system | Created, not sent | `sent`, `void` |
| `sent` | Admin | Delivered to customer | `paid`, `overdue`, `void` |
| `overdue` | System | Sent + past due date, still unpaid | `paid`, `void` |
| `paid` | Admin | Payment received & marked | — |
| `void` | Admin | Cancelled / written off | — |

When an invoice becomes `paid`, the linked job moves `invoiced → paid → closed`.

---

## 4. Step-by-step flows

### 4.1 Customer onboarding (invite-by-job — no self-signup)
1. Enquiry arrives (phone, email, or the portal contact form).
2. Admin searches existing customers. If found → use them. If not → create a new customer record.
3. When the admin creates the **job**, the system mints a customer **access token + short code** for that job.
4. (Phase 2) The customer is sent a tracking link (`/track/{token}`) by SMS/email. They open it — no password,
   no signup. The link is scoped to that one job and can expire.
5. (Optional, later) The customer can set a password to see their full history across jobs.

### 4.2 Enquiry → job creation (Admin)
1. Admin clicks **New job**.
2. Picks an existing customer or creates one inline.
3. Enters site address, title, description, priority, optional quoted price.
4. Saves → job created with status `new`, reference auto-generated (`JOB-0142`).

### 4.3 Scheduling & dispatch (Admin)
1. From the job (or the schedule), admin sets a date + time window and assigns an engineer.
2. Status → `scheduled`. The job now appears in that engineer's "Today/Upcoming" list.
3. (Phase 2) Customer receives an appointment confirmation.

### 4.4 Engineer on site (Engineer)
1. Engineer opens the job from "Today".
2. Taps **I'm on my way** → status `en_route`. (Phase 2: customer notified.)
3. On arrival, taps **Arrived on site** → status `on_site`.
4. Does the work; adds **photos** and **notes** as needed.
5. (`on_hold` if blocked — e.g. needs a part — with a note; admin re-schedules.)

### 4.5 Job completion (Engineer)
1. Engineer taps **Mark job complete**.
2. Captures the customer's **sign-off** (signature or confirmation + name).
3. Status → `completed`. Office is notified it's ready to invoice.

### 4.6 Invoicing (Admin)
1. From a `completed` job, admin clicks **Raise & send invoice**.
2. Invoice pre-fills customer, address, and quoted amount (if any). Admin adds/edits line items.
3. VAT applied per settings; a **unique sequential invoice number** is assigned; **payment reference** =
   the job/invoice number.
4. Admin sends it (MVP: download/share PDF; Phase 2: auto-email). Invoice → `sent`, job → `invoiced`.

### 4.7 Payment & reconciliation (Admin)
1. Customer pays by **bank transfer**, quoting the payment reference.
2. Admin sees the deposit in the bank, finds the invoice by its reference, clicks **Mark as paid**
   (records date + amount).
3. Invoice → `paid`; job → `paid → closed`; customer balance updates.
4. (Phase 2) "Payment received — thank you" notification sent.

### 4.8 Customer tracking (Customer)
1. Customer opens their unique link.
2. Sees a live status timeline (Booked → Scheduled → On the way → On site → Completed → Paid), the
   appointment window, and the engineer's name.
3. Once invoiced (Phase 2 portal): sees the amount, the bank details, and the payment reference.
4. Can message the office from the same page.

---

## 5. Notification matrix (Phase 2)

| Event (job/invoice) | Channel | Recipient | Template |
|---|---|---|---|
| Job `scheduled` | Email + SMS | Customer | Appointment confirmed: date, window, engineer |
| Status `en_route` | SMS | Customer | "Your engineer {name} is on the way" |
| Status `completed` | Email | Customer | "Work completed — summary" |
| Invoice `sent` | Email | Customer | Invoice attached + bank details + reference |
| Invoice unpaid after N days | Email + SMS | Customer | Payment reminder |
| Invoice `paid` | Email | Customer | Receipt + thanks |
| New enquiry / unmatched email (Phase 3) | In-app | Admin | "New enquiry needs action" |

All customer-facing templates live in Settings and support merge fields. Each event can be toggled on/off.

---

## 6. Edge cases & exceptions

| Case | Handling |
|---|---|
| **Reschedule** | Admin edits date/engineer; status returns to `scheduled`; customer re-notified; activity logged. |
| **Cancellation** | Admin sets `cancelled` with a reason; no invoice; customer optionally notified; job archived. |
| **Customer not home / no access** | Engineer sets `on_hold` with a note; admin re-schedules. |
| **Parts needed** | `on_hold` + note; optional follow-up job created. |
| **Partial payment** | Record amount paid; invoice stays `sent`/`overdue` with a balance until fully paid (Phase 2 supports multiple payments per invoice). |
| **Wrong payment reference** | Admin matches manually by amount/date/customer; mark paid with a note. |
| **Invoice error after sending** | `void` the invoice (with reason); raise a corrected one (new sequential number — never reuse). |
| **Dispute / hold on payment** | Keep invoice `sent`; add internal note; do not auto-chase. |
| **Recurring maintenance (Phase 2)** | A job template with a repeat rule auto-creates the next job when one closes. |
| **Engineer offline on site** | Status taps/photos queue locally and sync when signal returns (Phase 2 hardening). |
| **Customer link shared/leaked** | Token is single-job scoped, contains no other customers' data, and can be expired/rotated. |
