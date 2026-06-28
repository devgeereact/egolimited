@~/.claude/CLAUDE.md

---

# Client: egolimited (EGO LTD — SoulRefresh sub-project)

| Field | Value |
|-------|-------|
| NN (client number) | 01 |
| Status | active — api mature (M1–M15), frontend scaffolded fresh 2026-06-28 |
| Repo path | `~/WebstormProjects/egolimited` (standalone per-client repo) |
| Business | Property maintenance & repairs across London (homeowners, landlords, agents) |

## Ports (isolated block — NN = 01)

| Surface | Port | Command | Stack |
|---------|------|---------|-------|
| landing | 5011 | `npm run dev:landing` | Vite + React 19 + TS + Tailwind v4 |
| app     | 5012 | `npm run dev:app`     | Vite + React 19 + TS + Tailwind v4 (PULSE UI) |
| api     | 8011 | PHP built-in / cPanel | PHP + MySQL (mysqli) |

> Ports pinned with `strictPort: true` in each `vite.config.ts` — a clash fails loud.

## Deploy

| Surface | Target | Notes |
|---------|--------|-------|
| landing | cPanel `public_html/egolimited/` | `npm run deploy:landing` (rsync; preserves app/, api/, images/) |
| app | cPanel `public_html/egolimited/app/` | `npm run deploy:app` (rsync --delete dist) |
| api | cPanel `public_html/egolimited/api/` | manual PHP deploy; `config.php` lives server-side only |

Live URL: **https://soulrefresh.net/egolimited/** (app at `/egolimited/app/`).
SSH alias `cpanel` (see global CLAUDE.md). Vite `base` is set per surface for the
production subpath; dev serves at `/`.

## Brief

- **Goal:** Lead-gen landing site + installable field-service PWA for engineers/office,
  backed by the existing PHP/MySQL API (jobs, quotes, invoices, payments, customer portal).
- **Audience:** Public (landing); EGO staff founder→manager→office→engineer (app).
  Customers get tokenised job links, no login.
- **Constraints:** Shares the SoulRefresh MySQL DB (`ego_`-prefixed tables). All money,
  numbering and job-status logic is **server-owned** — client renders, never re-implements.

## Notes

- API source pulled from cPanel into `api/`; **secrets excluded** (`config.php`,
  `uploads/`, `error_log`). DB/integration secrets live in `api/config.php` (server)
  and the `ego_integrations` table — never committed.
- Data model: [`docs/03-DATA-MODEL.md`](docs/03-DATA-MODEL.md); truth = `api/schema.sql`.
- The deployed landing/app bundles were build artifacts only; the React/TS source
  here is the new source of truth — rebuild screens against the live API.
