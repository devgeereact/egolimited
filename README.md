# EGO LIMITED

Property maintenance & repairs in London. Monorepo for the marketing landing site,
the field-service PWA, and the PHP/MySQL API. Deploys to **soulrefresh.net/egolimited**.

## Layout

```
landing/   EGO LTD marketing site   — Vite + React 19 + TS + Tailwind v4   (dev :5011 → /egolimited/)
app/       Field-service PWA        — Vite + React 19 + TS + Tailwind v4   (dev :5012 → /egolimited/app/)
api/       Backend                  — PHP + MySQL (mysqli)                 (:8011 → /egolimited/api/)
docs/      Architecture + data model
```

## Quick start

```bash
npm install            # installs landing + app workspaces
npm run dev:landing    # http://localhost:5011
npm run dev:app        # http://localhost:5012
```

The `api/` is PHP — run on the cPanel host or a local PHP server pointed at `api/`,
with a local `config.php` (copy `api/config.sample.php`). Secrets never get committed.

## Build & deploy

```bash
npm run build          # builds both frontends
npm run deploy:app     # build + rsync app/dist → cPanel …/egolimited/app/
npm run deploy:landing # build + rsync landing/dist → cPanel …/egolimited/ (preserves app/, api/, images/)
```

Deploy uses the `cpanel` SSH alias. Review deploy commands before running.

## Docs

- [docs/00-OVERVIEW.md](docs/00-OVERVIEW.md) — surfaces, roles, state
- [docs/03-DATA-MODEL.md](docs/03-DATA-MODEL.md) — entities (truth: `api/schema.sql`)
- [CLAUDE.md](CLAUDE.md) — client card, ports, deploy targets
