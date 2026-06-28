# 04 — Screens & navigation

Screen-by-screen spec for the three apps. For each screen: **purpose**, **key elements**, **actions**,
and **states** (loading / empty / error where relevant). See the interactive prototype for the visual
reference.

---

## A. Admin app (desktop-first, mobile-capable)

**Global nav (left sidebar):** Dashboard · Customers · Jobs · Schedule · Invoices · Messages · Settings.
Logo top, signed-in user bottom.

### A1. Dashboard
- **Purpose:** "What needs me today" at a glance.
- **Elements:** Stat cards (today's jobs, jobs to schedule, unpaid/overdue total, new messages);
  today's schedule list (each row → job); needs-attention list (completed-not-invoiced, overdue invoices).
- **Actions:** Click any item → its record. "New job" button.
- **States:** Empty = "No jobs scheduled today. Create a job to get started."

### A2. Customers — list
- **Elements:** Search bar; table (name, contact, last job, outstanding balance).
- **Actions:** Search/filter; click row → detail; "New customer".
- **Empty:** "No customers yet."

### A3. Customer — detail
- **Elements:** Contact info, address(es), notes, outstanding balance, job history (status + ref), invoice history.
- **Actions:** Edit customer; add address; "New job for this customer".

### A4. Customer — new / edit (form)
- **Fields:** Name*, phone, email, address(es), notes. (* required: name + one contact method.)
- **Actions:** Save, cancel. **Error:** inline validation.

### A5. Jobs — list
- **Elements:** Status filter tabs + search; table (ref, title, customer, status pill, engineer, scheduled date).
- **Actions:** Filter; click row → detail; "New job".

### A6. Job — detail (the core screen)
- **Elements:** Reference + status pill; customer + site address; description; assigned engineer + schedule;
  photos gallery; notes; sign-off; linked invoice; activity log (chronological).
- **Actions (status-aware):**
  - `new` → **Schedule & assign**
  - `completed` → **Raise & send invoice**
  - `invoiced` → **Mark as paid**
  - Always: edit details, change status (override), add note, cancel job.
- **States:** Loading skeleton; error banner if save fails ("Couldn't save — try again").

### A7. Job — new / edit (form)
- **Fields:** Customer (search/create inline)*, site address*, title*, description, priority, quoted amount.
- **Actions:** Save → job created (`new`). Save & schedule → opens schedule step.

### A8. Schedule
- **Elements:** Day/week calendar; jobs as blocks, coloured per engineer; engineer filter.
- **Actions:** Click a job → detail; assign/reschedule (drag-and-drop optional); navigate days/weeks.
- **Empty:** "Nothing scheduled for this day."

### A9. Invoices — list
- **Elements:** Status filter (draft/sent/overdue/paid); table (number, customer, amount, status, due date).
- **Actions:** Click → detail; mark paid (quick action on `sent`/`overdue`).

### A10. Invoice — create / detail
- **Elements:** Customer + job link; line items (description, qty, unit price, line total); subtotal, VAT, total;
  bank details + payment reference; issue/due dates; status.
- **Actions:** Add/edit/remove line items; recalc totals live; **Send** (PDF + Phase 2 email); **Download PDF**;
  **Mark as paid** (records date/amount); **Void** (with reason).
- **States:** Error if number generation fails (retry, never duplicate a number).

### A11. Messages (Phase 2)
- **Elements:** Threads by customer; message body; channel badge (email/SMS).
- **Actions:** Reply (email/SMS), use template, **AI draft** (Phase 3), open linked job.

### A12. Settings
- **Sections:** Company details (name, address, contact, logo); VAT (number, default rate);
  bank details (account name, sort code, account number); invoicing (prefix, next number, payment terms);
  engineers (list, add, deactivate); message templates (Phase 2).
- **Actions:** Save each section. **Validation:** sort code / account number format.

---

## B. Engineer app (mobile PWA — stripped to the bone)

**Bottom tab bar:** Today · Jobs · Profile. No money, no customer list, no settings.

### B1. Today
- **Elements:** Greeting + date; ordered list of today's job cards (ref, title, address, time window, status pill).
- **Actions:** Tap card → job detail. Tap address → open maps.
- **Empty:** "No jobs today."

### B2. My jobs
- **Elements:** Upcoming assigned jobs grouped by day.
- **Actions:** Tap → detail.

### B3. Job detail (the field screen)
- **Elements:** Ref + status; customer name + phone (tap to call); site address (tap to navigate);
  "what needs doing"; photos added; notes.
- **Actions (status-aware, one big primary button):**
  - `scheduled` → **I'm on my way** (→ `en_route`)
  - `en_route` → **Arrived on site** (→ `on_site`)
  - `on_site` → **Add photo**, **Add note**, **Mark job complete** (→ capture sign-off → `completed`)
  - `completed`/beyond → read-only "Job complete ✓ — the office handles the invoice".
- **States:** Optimistic update on tap; if offline, queue + show "will sync" (Phase 2); error toast on fail.

### B4. Profile
- **Elements:** Name, contact, simple availability toggle; log out.

---

## C. Customer portal (mobile/web, opened via unique link — no signup)

### C1. Track my job  (`/track/{token}`)
- **Elements:** Company logo; job title + reference; **status timeline**
  (Booked → Scheduled → On the way → On site → Completed → Paid) with the current step highlighted;
  appointment window; engineer name (and "on the way" card when `en_route`/`on_site`).
- **Actions:** "Message the office".
- **States:** Invalid/expired token → friendly "This link has expired — contact the office."

### C2. Invoice & payment (Phase 2, same page or linked)
- **Elements:** Amount due; bank details (account name, sort code, account number); **payment reference**
  (the job/invoice number); status (Awaiting payment / Paid); plain instruction: "Pay by bank transfer using
  the reference above." Download invoice PDF.
- **States:** Paid → green "Paid — thank you".

### C3. Contact
- **Elements:** Simple message box → office (creates a `messages` record / Phase 2 thread).

---

## Shared components
- **Status pill:** consistent colour per status across all three apps (see prototype): scheduled = blue,
  en route / on site = amber, completed / paid = green, invoice sent = purple, overdue = red.
- **Job reference & money:** monospace, so they read like a work docket.
- **Empty states:** always a one-line "what to do next", never a blank screen.
- **Errors:** say what happened and how to fix it, in the app's voice; never a raw stack trace.
