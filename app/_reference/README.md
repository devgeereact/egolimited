# `_reference/` — PULSE UI demo, kept for reuse

Not part of the live EGO LIMITED app. Lives **outside `src/`** so no tsconfig ever
type-checks it and Vite never bundles it; gitignored so it stays local-only. Kept so the
original PULSE template material can be copied back when a real EGO screen needs it.

## Contents

| Path | What it is | Reuse when |
|------|-----------|-----------|
| `app-sidebar.full.tsx.txt` | Original kitchen-sink sidebar — full PULSE demo `navMain`, `projects`, `teams` nav data. | You need a menu pattern / icon mapping for a new EGO section. |
| `pages/dashboard/` | Demo dashboards (analytics, crm, eCommerce) + their widget subcomponents. | Reusing a chart/stat card on the EGO dashboard. |
| `pages/widgets/` | Demo widget showcases (data + statistics). Depend on `pages/dashboard/` subcomponents. | Same as above. |
| `pages/weather/` | Standalone weather page. (The dashboard weather widget is live; this full page isn't.) | Building a dedicated weather screen. |
| `pages/maps/` | Leaflet map demo. | Adding a job/engineer map. |
| `pages/maintenance/` | Maintenance-mode splash demo. | — |
| `pages/kanban/ProductionBoard.tsx` | Kanban production board demo. | A job-pipeline board. |

> Imports inside these files use the old `@/pages/...` aliases and will NOT resolve from
> here — that's expected. Fix the paths when you copy a file back into `src/`.

## Cleanup log

- **2026-06-26 (section 1)** — Trimmed live sidebar to EGO-only; stashed the original.
- **2026-06-26 (section 2 — Dashboard→Settings)**:
  - Deleted the **demo dashboards** (analytics/crm/eCommerce) + demo **widgets**; app index
    now renders the real **EgoDashboard**. Moved both page trees here.
  - Removed **production board, map, weather page, maintenance** routes; moved pages here.
  - Sidebar re-categorised into labelled sections (Overview / Operations / Finance / Comms /
    Surfaces / Configuration) and added **Inbox** (client messages live there).
  - Weather **widget** on the EGO dashboard kept + repolished (the `/weather` API stays).
  - Fixed pre-existing dead-code (unused imports/vars) in shared files so `tsc -b` is green
    again: `AppLayout`, `data-table`, `ui/sidebar`, `ui/colored-progress`, two eCommerce
    demo pages, wizard context.
