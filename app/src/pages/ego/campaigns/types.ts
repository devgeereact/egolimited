export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived"
export type EnrollState = "active" | "completed" | "replied" | "bounced" | "unsubscribed" | "stopped"

export interface Campaign {
  id: number
  name: string
  status: CampaignStatus
  audience: "leads" | "subscribers" | "customers"
  from_name: string | null
  from_email: string | null
  started_at: string | null
  total: number
  active: number
  replied: number
  completed: number
  sent: number
  queued: number
  failed: number
  steps: number
}

export interface Step {
  id: number
  step_no: number
  delay_days: number
  subject: string
  body: string
  image_url: string | null
}

export interface Enrollment {
  id: number
  campaign_id: number
  lead_id: number | null
  email: string
  name: string | null
  company: string | null
  website: string | null
  state: EnrollState
  current_step: number
  next_due_at: string | null
  stop_reason: string | null
  sent_count: number
  last_sent_at: string | null
}

export interface Lead {
  id: number
  email: string
  name: string | null
  company: string | null
  website: string | null
  status: "found" | "approved" | "rejected" | "emailed"
  created_at: string
}

export interface Suppression {
  email: string
  reason: "unsubscribed" | "bounced" | "complained" | "manual"
  source: string | null
  note: string | null
  created_at: string
}

/** How a recipient's state reads to a human. Colour is meaning, not decoration. */
export const STATE_META: Record<EnrollState, { label: string; className: string }> = {
  active: { label: "In sequence", className: "bg-primary/10 text-primary" },
  completed: { label: "Finished", className: "bg-muted text-muted-foreground" },
  replied: { label: "Replied", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  bounced: { label: "Bounced", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  unsubscribed: { label: "Unsubscribed", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  stopped: { label: "Stopped", className: "bg-muted text-muted-foreground" },
}

export const STATUS_META: Record<CampaignStatus, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-muted-foreground/40" },
  active: { label: "Sending", dot: "bg-emerald-500" },
  paused: { label: "Paused", dot: "bg-amber-500" },
  completed: { label: "Finished", dot: "bg-blue-500" },
  archived: { label: "Archived", dot: "bg-muted-foreground/30" },
}
