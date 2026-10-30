# EGO LIMITED

Field service management app for **EGO LIMITED**, a general maintenance company for homes and
commercial property. Standalone product on its own domain **`egolimited.com`**.

> The build pack calls the app **"Brightwork"** (placeholder). Real name = **EGO LIMITED**.

## Why this stack (not the build pack's Next.js)
The build pack (`docs/05-TECH-STACK.md`) recommends Next.js + Vercel + Supabase. The host is
**cPanel / LiteSpeed** (static + PHP/MySQL, no Node SSR), so:

- **Frontend:** Vite + React + TypeScript + Tailwind SPA (PULSE UI framework) → static build.
- **Backend:** PHP + MySQL on cPanel. Secrets in server-side `config.php` (gitignored, never
  committed/deployed); hand-rolled session/token auth; photos on cPanel disk.
- The build pack's **PRD / workflows / data model / screens stay the functional spec** — only the
  implementation tech changes (Postgres/Prisma → MySQL; Next API/server actions → PHP endpoints;
  Auth.js → PHP session/token auth).

## Folder layout
| Path | Role | Source |
|------|------|--------|
| `landing/` | Marketing landing page (Vite React SPA) | PULSE UI `landing-page` |
| `app/` | The 3-role application (Vite React SPA) | PULSE UI `pulse-ui-react` kit |
| `api/` | PHP backend endpoints | — |
| `docs/` | EGO BUILD PACK — source of truth, read in order | provided |

## Dev
| Surface | Port | URL | Run |
|---------|------|-----|-----|
| landing | 5050 | http://localhost:5050 | `cd landing && npm install && npm run dev` |
| app | 5051 | http://localhost:5051 | `cd app && npm install && npm run dev` |
| api | 8080 | http://localhost:8080 | PHP backend (runs on server) |

Ports are pinned with `strictPort: true` in each `vite.config.ts`, so a busy port **fails loudly**
(`Port 5051 is already in use`) rather than drifting to a random one. If `npm run dev` won't start,
something is already holding the port — `lsof -iTCP:5051 -sTCP:LISTEN` will name it.

The dev frontends call the **live production API** at `https://egolimited.com/api` (CORS allows
`localhost:5050/5051`). There is no local PHP server. Two consequences worth internalising:

- A local screen shows **real customer data**, and its writes are **real writes**.
- A screen that assumes the server already has its new fields will crash locally while passing every
  build. **New API fields must be optional on the client** until the API is deployed.

## Tests & quality gates
No root `package.json` — each surface owns its own scripts.

```bash
cd app && npm test                          # vitest — frontend unit tests
cd app && npx vitest run src/lib/query.test.ts   # one file
cd app && npx vitest run -t "prefix"        # tests whose NAME matches (a substring, not a filename)
cd app && npx tsc -b && npm run lint

php api/tests/run.php               # API suite: pure domain logic + static guards. Needs no DB.
php -l api/index.php                # syntax check (CI lints every .php file)
```

The API suite is **zero-dependency** (no Composer, no `vendor/` — a virtue on shared hosting: nothing
to CVE-patch). It covers the pure domain modules in `api/lib/*` — invoicing, VAT, job-status
transitions, pipeline stage derivation, tender matching — plus two *static* guards that read
`index.php` itself and fail the build on a class of bug rather than an instance of one.

## Automation (cron, on the server)
Five jobs, all CLI-only. **Automation drafts and prompts; a human sends and decides** — no cron ever
emails a prospect.

| Job | When | Does |
|-----|------|------|
| `cron.php` | */15 | job/invoice reminders, recurring jobs, SLA escalation |
| `campaign_worker.php` | */15, Mon–Fri business hours | drains the queued-send queue (skips UK bank holidays) |
| `pipeline_cron.php` | hourly | re-derives contact stages, raises chases, flags dormancy |
| `tenders_cron.php` | 06:15 daily | pulls Contracts Finder notices (`docs/TENDERS.md`) |
| `backup.php` | 03:17 daily | DB backup outside the web root |

## Domain & routing
- Landing → `https://egolimited.com/`
- App → `https://egolimited.com/app/` (SPA; client-side routing)
- API → `https://egolimited.com/api/`

Vite `base` is `/` (landing) and `/app/` (app), set at build time by the `release.json` build step. SPA fallback handled
via `.htaccess` in each deployed folder.

## Deploy
`pnpm release` (dry run) then `pnpm release --go`, from this Mac over SSH: landing, app and PHP API in one step, with a snapshot of every changed server file and an automatic restore if the smoke test fails. Every push to `main` runs the same release in GitHub Actions (SSH, no FTP); docs-only pushes do not deploy. `config.php` and the API `.htaccess` live server-side only. Details: `docs/DEPLOY.md`.

## Database
Dedicated MySQL DB **`devgeereact_egolimited`** (`ego_`-prefixed tables). Schema: `api/schema.sql`.
All money, numbering and job-status logic is **server-owned** — the client renders, never re-implements.

## Where work comes from
Two directions, and only one of them is new:

- **Outbound** — the **Pipeline** (`/ego/pipeline`) is the one place a business exists, from stranger
  to paying customer. Stages are **derived from facts**, never hand-set. Sequences are a tool applied
  to contacts, not a place you go.
- **Inbound** — **Tenders** (`/ego/tenders`) reads the official Contracts Finder OCDS API, where public
  bodies are legally required to publish work they need doing. Open API, no scraping, no personal data.
  See `docs/TENDERS.md` for why this exists instead of harvesting contacts from LinkedIn.

## Status
Near-complete multi-role app. All in-scope milestones (M1–M9, M11–M16) done; M10 (SMS) dropped
(email-only). See `CLAUDE.md` for the full status, architecture invariants and deploy mechanics.
