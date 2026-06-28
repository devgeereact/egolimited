# EGO LIMITED — Project Overview

Property-maintenance business in London. Three surfaces, one cPanel deploy under
`egolimited.com/` → **egolimited.com**.

| Surface | Path | What it is | Stack | Dev port |
|---------|------|-----------|-------|----------|
| `landing/` | `/` | EGO LTD marketing site — lead-gen, SEO, "get a quote" | Vite + React 19 + TS + Tailwind v4 | 5050 |
| `app/` | `/app/` | Field-service PWA for engineers/office — jobs, invoices (PULSE UI) | Vite + React 19 + TS + Tailwind v4 | 5051 |
| `api/` | `/api/` | Backend — token auth, jobs, invoicing | PHP + MySQL (mysqli) | 8080 |

## State (2026-06-28)

- **api** — mature. Milestones M1–M15 already implemented and deployed: auth +
  roles, customers/addresses, jobs + status state machine, quotes/invoices +
  VAT + payments, customer portal access tokens, email in/out, recurring plans,
  task kanban. Source pulled from cPanel into `api/` (secrets excluded). Schema
  is the source of truth: [`api/schema.sql`](../api/schema.sql).
- **landing / app** — scaffolded fresh. The previously deployed bundles were
  build artifacts only (no source). These scaffolds are the new source of truth;
  rebuild screens against the existing API.

## Roles (server-enforced)

`founder` > `manager` > `office` > `engineer`. Customers have **no login** — they
get an unguessable tokenised job link (`ego_customer_access`).

## Secrets

- API DB + integration secrets live **server-side only**: `api/config.php`
  (gitignored, never deployed from repo) and the `ego_integrations` MySQL table.
- Local app secrets → root `.env` (gitignored). See `.env.example`.

## Deploy

- `npm run deploy:app` → builds + rsyncs `app/dist/` to `…/app/`.
- `npm run deploy:landing` → builds + rsyncs `landing/dist/` to `…/`
  (preserves `app/`, `api/`, `images/`). Review before running — outward-facing.
- `api/` deploys manually (PHP, no build); `config.php` stays on the server.
