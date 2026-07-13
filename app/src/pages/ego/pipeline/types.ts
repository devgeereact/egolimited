export type Stage = "prospect" | "contacted" | "interested" | "quoted" | "customer" | "dormant" | "lost"

export interface Contact {
  id: number
  name: string
  company: string | null
  email: string | null
  phone: string | null
  stage: Stage
  source: string
  owner_id: number | null
  owner_name: string | null
  next_action_at: string | null
  last_activity_at: string | null
  stage_locked?: number
  website?: string | null
  notes?: string | null
}

export interface ContactEvent {
  kind: string
  summary: string
  created_at: string
  actor_name: string | null
}

export interface ContactJob {
  id: number
  reference: string
  title: string
  status: string
  created_at: string
}

export interface ContactDoc {
  id: number
  kind: "quote" | "invoice"
  number: string | null
  status: string
  total: string
  created_at: string
}

/**
 * The stages, in the order the office cares about them — not the order a business moves through.
 * "Interested" is first because it is the most perishable thing in the company: someone said yes,
 * and every hour it sits there it cools.
 */
export const STAGES: { key: Stage; label: string; help: string }[] = [
  { key: "interested", label: "Interested", help: "They replied. Someone must act today." },
  { key: "quoted", label: "Quoted — chasing", help: "The quote is out. No answer yet." },
  { key: "prospect", label: "Prospects", help: "Found, not contacted." },
  { key: "contacted", label: "Contacted", help: "We've emailed. No reply yet." },
  { key: "customer", label: "Customers", help: "We've done work for them." },
  { key: "dormant", label: "Dormant", help: "Customers who've gone quiet." },
  { key: "lost", label: "Lost", help: "Said no, or went cold." },
]

export const STAGE_META: Record<Stage, { label: string; className: string }> = {
  interested: { label: "Interested", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  quoted: { label: "Quoted", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  prospect: { label: "Prospect", className: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  customer: { label: "Customer", className: "bg-primary/10 text-primary" },
  dormant: { label: "Dormant", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  lost: { label: "Lost", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
}

/** Where a business came from. Answerable for the first time. */
export const SOURCE_LABEL: Record<string, string> = {
  enquiry: "Website enquiry",
  cold: "Cold outreach",
  phone: "Phone",
  referral: "Referral",
  repeat: "Repeat",
  unknown: "—",
}

/** What each timeline entry means, in a word. */
export const EVENT_LABEL: Record<string, string> = {
  enquiry: "Enquiry",
  email_out: "We emailed",
  reply: "They replied",
  quote_sent: "Quote",
  quote_chase: "Chase",
  escalated: "Escalated",
  dormant: "Dormant",
  job: "Job",
  note: "Note",
  stage: "Stage",
}
