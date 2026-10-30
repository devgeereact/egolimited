# Current Task Contract

## Outcome

Audit EGO LIMITED against the applicable GEE OS 0.9.0 standards and apply safe, reversible local improvements, preserving its purpose, working behaviour, data and existing work.

## Mode

Existing Application. Workflow: Existing Application, with the Change Safety protocol for each edit.

## Scope

- In scope: baseline inspection and checks, findings ranked P0 to P4, small local fixes to code, documentation and agent instructions, reports under `../reports/egolimited/`.
- Out of scope: deletions, dependency or runtime changes, database migrations, authentication, payment or business-rule changes, deployment, commits and pushes, production or external mutations.

## Authority

- Research: yes, read-only.
- Create planning artefacts: yes, under `../reports/egolimited/`.
- Edit local files: safe, reversible changes only.
- Use external services: no.
- Change production: no.
- MCP reads: documentation lookups only.
- MCP mutations: no.

## Risk and dependencies

- Risk level: production. `./deploy.sh` rsyncs landing and app to egolimited.com; the API is rsynced by hand. Local development calls the live API, so local writes are real writes.
- Affected areas: `app/` field-service PWA, `landing/` site, `api/` PHP backend, `deploy.sh`, project documentation.
- Required decisions: listed in `../reports/egolimited/AUDIT-AND-POLISH-2026-10-08.md`.

## Evidence

- Required checks: app `npx tsc -b`, `npm run lint`, `npm test`, `npx vite build --base=/app/`; landing `npx tsc -b`, `npm run lint`, `npx vite build --base=/`; `php api/tests/run.php` and `php -l` (PHP is not installed on this computer); manual review of changed files.
- Completion conditions: every change verified or marked NOT TESTED, project report and workspace summary updated, no unrelated work altered.

## Previous task

GEE OS 0.5.0 local adoption (wave 1) is complete. Its record is `docs/GEE-OS.md`.
