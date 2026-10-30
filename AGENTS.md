# egolimited Agent Contract

This existing project adopts the active shared GEE OS, minimum version 0.9.0. Read `.agent/PROJECT.yml` and `.agent/CURRENT-TASK.md`, then apply the constitution, loop and routing rules at `~/.agents/gee-os`.

## Read order

1. `AGENTS.md`, this shared entry point.
2. `.agent/PROJECT.yml`, project routing and risk.
3. `.agent/CURRENT-TASK.md`, current scope and evidence.
4. `CLAUDE.md`, preserved project knowledge pending modularisation (git-ignored, may be absent).
5. `docs/DEPLOY.md`, the tracked deploy record: what deploys where, what must never be uploaded and how to verify.
6. `README.md` and the relevant files under `docs/`.

## Commands

- Install: `npm ci` inside `app/` and inside `landing/` (no root `package.json`)
- Develop: `cd landing && npm run dev` (port 5050) or `cd app && npm run dev` (port 5051). Both call the live API at egolimited.com.
- Type check: `npx tsc -b` in each surface
- Lint: `npm run lint` in each surface
- Test: `cd app && npm test` (Vitest); `php api/tests/run.php` for the API
- Build: `npx vite build --base=/app/` (app) and `npx vite build --base=/` (landing)
- Deploy: `pnpm release` (dry run), then `pnpm release --go`, publishes to egolimited.com (see `docs/DEPLOY.md`). Production action, needs explicit approval.

## Shared rules

- Select one primary mode and load only relevant systems, workflows, skills and MCP rules.
- Preserve established business rules, architecture and user work.
- Treat documentation as evidence to verify against real code and behaviour.
- Apply the change safety protocol before modifying existing behaviour.
- Never claim fixed, secure, accessible or ready without matching evidence.
- Keep remote and production changes outside scope unless the current user authorises them explicitly.
- MCP and skill availability never expands user authority.

## Migration note

The existing `CLAUDE.md` remains intact during the first adoption wave. Its content will be classified and moved only after a project-specific review identifies the correct source of truth for each fact.
