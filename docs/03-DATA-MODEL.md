# 03 — Data Model

> **Source of truth:** [`api/schema.sql`](../api/schema.sql) (MySQL, `ego_`-prefixed
> tables in the shared SoulRefresh DB). Run/refresh idempotently via `php seed.php`.
> This file is the human map; the SQL wins on any conflict.

## Entities

| Table | Purpose |
|-------|---------|
| `ego_users` | Staff logins. Roles: founder / manager / office / engineer. Soft-delete, availability toggle. |
| `ego_sessions` | Bearer tokens → user, with expiry. |
| `ego_customers` | Customers (+ `ref_code` 6-char code). No login. |
| `ego_addresses` | Customer addresses (one primary). |
| `ego_company_settings` | Single-row config: VAT rate, invoice/job/quote numbering, bank details, notify settings. |
| `ego_jobs` | Jobs. Status state machine (see below), priority, scheduling, sign-off, parts/hold, engineer brief. |
| `ego_job_photos` / `ego_job_notes` / `ego_job_checklist` | Engineer field data per job. |
| `ego_activity_log` | Audit trail across jobs/invoices. |
| `ego_invoices` | Quotes **and** invoices (`kind`). Number allocated on send (no gaps). Subtotal/VAT/total. |
| `ego_invoice_lines` | Line items. |
| `ego_payments` | Payments against invoices. |
| `ego_customer_access` | Tokenised per-job customer portal links. |
| `ego_messages` | Email in/out (IMAP/SMTP), reviews (rating), acknowledgements. |
| `ego_integrations` | Integration secrets (SMTP/IMAP/OpenWeather/OpenRouter) — **MySQL only, never in repo**. |
| `ego_recurring_plans` | Recurring/maintenance job templates + repeat rules. |
| `ego_tasks` | Task board (kanban) with assignee + accent colour. |

## Job status state machine

```
new → scheduled → en_route → on_site → completed → invoiced → paid → closed
                     ↘ on_hold ↗                              ↘ cancelled
```

Centralised server-side in `api/lib/job_status.php`. The client must not encode
the transition rules — call the API and render what it returns.

## Money / numbering rules (server-owned)

- Invoice/quote/job numbers come from `ego_company_settings.*_next_number` —
  allocated atomically on send so there are **no gaps**. Never generate client-side.
- VAT: `vat_rate` + `vat_amount` computed server-side (`api/lib/invoicing.php`).
- `payment_reference` on an invoice is the **job reference** — threads job ↔ invoice ↔ payment.
