/**
 * EGO LIMITED — Job status state machine (client mirror of api/lib/job_status.php).
 * Source of truth for which status transitions are offered in the UI. The SERVER
 * re-validates every transition (PHP job_can_transition) — this is UX only.
 * Mirrors docs/02-WORKFLOWS §2. Keep in sync with the PHP module.
 */
import type { Role } from "@/lib/roles"

export type JobStatus =
  | "new"
  | "scheduled"
  | "en_route"
  | "on_site"
  | "on_hold"
  | "completed"
  | "invoiced"
  | "paid"
  | "closed"
  | "cancelled"

export const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  new: ["scheduled", "cancelled"],
  scheduled: ["en_route", "cancelled", "new"],
  en_route: ["on_site", "cancelled"],
  on_site: ["completed", "on_hold"],
  on_hold: ["scheduled", "on_site", "cancelled"],
  completed: ["invoiced"],
  invoiced: ["paid", "completed"],
  paid: ["closed"],
  closed: [],
  cancelled: [],
}

// Engineers may only walk the field chain (+ on_hold). Admin: any valid transition.
const ENGINEER_ALLOWED = new Set<string>([
  "scheduled|en_route",
  "en_route|on_site",
  "on_site|completed",
  "on_site|on_hold",
  "on_hold|on_site",
])

export const STATUS_LABEL: Record<JobStatus, string> = {
  new: "New",
  scheduled: "Scheduled",
  en_route: "En route",
  on_site: "On site",
  on_hold: "On hold",
  completed: "Completed",
  invoiced: "Invoiced",
  paid: "Paid",
  closed: "Closed",
  cancelled: "Cancelled",
}

export function canTransition(from: JobStatus, to: JobStatus, role: Role): boolean {
  if (!JOB_TRANSITIONS[from]?.includes(to)) return false
  if (role === "engineer") return ENGINEER_ALLOWED.has(`${from}|${to}`)
  return !!role // office-class (founder/manager/office) can make any valid transition
}

/** Status targets a given role may move `from` to (for building action buttons). */
export function allowedTargets(from: JobStatus, role: Role): JobStatus[] {
  return (JOB_TRANSITIONS[from] ?? []).filter((to) => canTransition(from, to, role))
}
