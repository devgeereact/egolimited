import {
  Circle, CalendarClock, Truck, MapPin, PauseCircle, CheckCircle2, FileText, Send,
  BadgePoundSterling, AlertTriangle, XCircle, Lock, Pencil, ThumbsUp, Ban, type LucideIcon,
} from "lucide-react"
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

const STATUS: Record<EgoStatus, { label: string; className: string; icon: LucideIcon }> = {
  new:        { label: "New",        icon: Circle,             className: "bg-muted text-muted-foreground ring-border" },
  scheduled:  { label: "Scheduled",  icon: CalendarClock,      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20" },
  en_route:   { label: "En route",   icon: Truck,              className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20" },
  on_site:    { label: "On site",    icon: MapPin,             className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20" },
  on_hold:    { label: "On hold",    icon: PauseCircle,        className: "bg-muted text-muted-foreground ring-border" },
  completed:  { label: "Completed",  icon: CheckCircle2,       className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
  invoiced:   { label: "Invoiced",   icon: FileText,           className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20" },
  sent:       { label: "Sent",       icon: Send,               className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20" },
  paid:       { label: "Paid",       icon: BadgePoundSterling, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
  overdue:    { label: "Overdue",    icon: AlertTriangle,      className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20" },
  cancelled:  { label: "Cancelled",  icon: XCircle,            className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20" },
  closed:     { label: "Closed",     icon: Lock,               className: "bg-muted text-muted-foreground ring-border" },
  draft:      { label: "Draft",      icon: Pencil,             className: "bg-muted text-muted-foreground ring-border" },
  accepted:   { label: "Accepted",   icon: ThumbsUp,           className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" },
  declined:   { label: "Declined",   icon: XCircle,            className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20" },
  void:       { label: "Void",       icon: Ban,                className: "bg-muted text-muted-foreground ring-border line-through" },
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
      <s.icon className="size-3" aria-hidden />
      {s.label}
    </span>
  )
}

export default StatusPill
