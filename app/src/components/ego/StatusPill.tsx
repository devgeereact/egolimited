import { cn } from "@/lib/utils"

/**
 * EGO LIMITED job/invoice status pill. One source of truth for status colours
 * across Admin, Engineer, and Customer surfaces (see docs/04-SCREENS.md §Shared
 * and PULSE-UI-DESIGN-SYSTEM.md):
 *   scheduled = blue · en route / on site = amber · completed / paid = green
 *   invoice sent = purple · overdue = red · new = neutral · cancelled = muted
 */
export type EgoStatus =
  | "new"
  | "scheduled"
  | "en_route"
  | "on_site"
  | "on_hold"
  | "completed"
  | "invoiced"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"
  | "closed"
  // document (quote/invoice) statuses
  | "draft"
  | "accepted"
  | "declined"
  | "void"

const STATUS: Record<EgoStatus, { label: string; className: string }> = {
  new:        { label: "New",        className: "bg-muted text-muted-foreground ring-border" },
  scheduled:  { label: "Scheduled",  className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20" },
  en_route:   { label: "En route",   className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20" },
  on_site:    { label: "On site",    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20" },
  on_hold:    { label: "On hold",    className: "bg-muted text-muted-foreground ring-border" },
  completed:  { label: "Completed",  className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
  invoiced:   { label: "Invoiced",   className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20" },
  sent:       { label: "Sent",       className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20" },
  paid:       { label: "Paid",       className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
  overdue:    { label: "Overdue",    className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20" },
  cancelled:  { label: "Cancelled",  className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20" },
  closed:     { label: "Closed",     className: "bg-muted text-muted-foreground ring-border" },
  draft:      { label: "Draft",      className: "bg-muted text-muted-foreground ring-border" },
  accepted:   { label: "Accepted",   className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
  declined:   { label: "Declined",   className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20" },
  void:       { label: "Void",       className: "bg-muted text-muted-foreground ring-border line-through" },
}

export interface StatusPillProps {
  status: EgoStatus
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  const s = STATUS[status] ?? STATUS.new
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        s.className,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

export default StatusPill
