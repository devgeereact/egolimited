import { AlertTriangle, Clock, CheckCircle2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type SlaState = "on_track" | "at_risk" | "breached" | "met" | "na"

const META: Partial<Record<SlaState, { label: string; cls: string; icon: LucideIcon }>> = {
  breached: { label: "SLA breached", cls: "bg-red-500/15 text-red-600 dark:text-red-400", icon: AlertTriangle },
  at_risk:  { label: "SLA at risk",  cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", icon: Clock },
  met:      { label: "On time",      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
}

/** SLA state chip. Renders nothing for on_track / na / unknown — only surfaces what needs attention. */
export function SlaBadge({ sla, className }: { sla?: string | null; className?: string }) {
  const m = sla ? META[sla as SlaState] : undefined
  if (!m) return null
  const Icon = m.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", m.cls, className)}>
      <Icon className="size-3" aria-hidden /> {m.label}
    </span>
  )
}
