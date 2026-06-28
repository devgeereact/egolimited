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

Ports pinned with `strictPort: true` in each `vite.config.ts`. The dev frontends call the live API at
`https://egolimited.com/api` (CORS allows `localhost:5050/5051`).

## Domain & routing
- Landing → `https://egolimited.com/`
- App → `https://egolimited.com/app/` (SPA; client-side routing)
- API → `https://egolimited.com/api/`

Vite `base` is `/` (landing) and `/app/` (app), set at build time by `deploy.sh`. SPA fallback handled
via `.htaccess` in each deployed folder.

## Deploy
`./deploy.sh` builds + rsyncs landing + app to the `egolimited.com` cPanel docroot over the `cpanel`
SSH alias. PHP API is rsynced manually (see `CLAUDE.md` → Deploy mechanics). `config.php` lives
server-side only — never deployed from the repo. Source folders + `docs/` stay in the repo, not deployed.

## Database
Dedicated MySQL DB **`devgeereact_egolimited`** (`ego_`-prefixed tables). Schema: `api/schema.sql`.
All money, numbering and job-status logic is **server-owned** — the client renders, never re-implements.

## Status
Near-complete multi-role app. All in-scope milestones (M1–M9, M11–M16) done; M10 (SMS) dropped
(email-only). See `CLAUDE.md` for the full status + deploy mechanics.
