import type { EgoStatus } from "@/components/ego/StatusPill"

export type JobPriority = "low" | "normal" | "high" | "urgent"

export interface JobActivity {
  at: string
  text: string
}

export interface Job {
  id: string
  ref: string
  title: string
  customer: { name: string; phone: string; email: string }
  siteAddress: string
  description: string
  priority: JobPriority
  quotedAmount: number
  status: EgoStatus
  engineer: string | null
  scheduledFor: string | null // ISO; null = not scheduled
  window: string | null // e.g. "09:00–11:00"
  createdAt: string
  photos: string[]
  notes: string[]
  activity: JobActivity[]
}

export const PRIORITY_LABEL: Record<JobPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
}

export const PRIORITY_CLASS: Record<JobPriority, string> = {
  low: "bg-muted text-muted-foreground ring-border",
  normal: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
}

export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

export const JOBS: Job[] = [
  {
    id: "1",
    ref: "JOB-0001",
    title: "Boiler not firing — no hot water",
    customer: { name: "Margaret Hughes", phone: "+44 7700 900123", email: "m.hughes@example.co.uk" },
    siteAddress: "14 Oakfield Road, Birmingham, B15 3JQ",
    description: "Worcester combi boiler locking out (fault E133). No hot water or heating since this morning.",
    priority: "urgent",
    quotedAmount: 180,
    status: "scheduled",
    engineer: "Tom Baker",
    scheduledFor: "2026-06-27",
    window: "09:00–11:00",
    createdAt: "2026-06-26",
    photos: [],
    notes: ["Customer works from home — call before arrival."],
    activity: [
      { at: "2026-06-26 08:42", text: "Enquiry received by phone." },
      { at: "2026-06-26 09:10", text: "Job created (JOB-0001)." },
      { at: "2026-06-26 09:15", text: "Scheduled for 27 Jun, 09:00–11:00 · assigned Tom Baker." },
    ],
  },
  {
    id: "2",
    ref: "JOB-0002",
    title: "Kitchen tap leaking under sink",
    customer: { name: "David Okafor", phone: "+44 7700 900456", email: "david.okafor@example.com" },
    siteAddress: "7 Maple Court, Solihull, B91 2AB",
    description: "Slow leak from the mixer tap isolation valve. Cupboard base getting damp.",
    priority: "normal",
    quotedAmount: 95,
    status: "completed",
    engineer: "Tom Baker",
    scheduledFor: "2026-06-25",
    window: "13:00–15:00",
    createdAt: "2026-06-24",
    photos: [],
    notes: ["Replaced isolation valve + tap connector."],
    activity: [
      { at: "2026-06-24 16:20", text: "Job created (JOB-0002)." },
      { at: "2026-06-25 13:05", text: "Engineer on site." },
      { at: "2026-06-25 14:10", text: "Job completed · sign-off captured." },
    ],
  },
  {
    id: "3",
    ref: "JOB-0003",
    title: "Annual gas safety check (CP12)",
    customer: { name: "Priya Sharma", phone: "+44 7700 900789", email: "priya.s@example.co.uk" },
    siteAddress: "22 Elm Grove, Coventry, CV1 5RW",
    description: "Landlord gas safety certificate for rental property. 1 boiler, 1 gas hob.",
    priority: "low",
    quotedAmount: 75,
    status: "invoiced",
    engineer: "Sarah Coleman",
    scheduledFor: "2026-06-23",
    window: "10:00–12:00",
    createdAt: "2026-06-20",
    photos: [],
    notes: [],
    activity: [
      { at: "2026-06-20 11:00", text: "Job created (JOB-0003)." },
      { at: "2026-06-23 10:30", text: "Completed · CP12 issued." },
      { at: "2026-06-23 15:00", text: "Invoice INV-0014 raised & sent." },
    ],
  },
  {
    id: "4",
    ref: "JOB-0004",
    title: "Consumer unit upgrade (fuse board)",
    customer: { name: "James Whittaker", phone: "+44 7700 900222", email: "j.whittaker@example.com" },
    siteAddress: "3 Larch Avenue, Wolverhampton, WV3 9HT",
    description: "Replace old rewireable fuse box with new 18th-edition consumer unit + RCBOs.",
    priority: "high",
    quotedAmount: 540,
    status: "new",
    engineer: null,
    scheduledFor: null,
    window: null,
    createdAt: "2026-06-26",
    photos: [],
    notes: ["Quote approved by email — ready to schedule."],
    activity: [{ at: "2026-06-26 10:05", text: "Job created (JOB-0004)." }],
  },
  {
    id: "5",
    ref: "JOB-0005",
    title: "Blocked external drain",
    customer: { name: "Grace Bennett", phone: "+44 7700 900333", email: "grace.b@example.co.uk" },
    siteAddress: "9 Cedar Close, Dudley, DY1 4PL",
    description: "Standing water in rear gully, slow to clear. Suspected blockage in the run to the main.",
    priority: "normal",
    quotedAmount: 130,
    status: "overdue",
    engineer: "Sarah Coleman",
    scheduledFor: "2026-06-18",
    window: "08:00–10:00",
    createdAt: "2026-06-15",
    photos: [],
    notes: [],
    activity: [
      { at: "2026-06-15 09:30", text: "Job created (JOB-0005)." },
      { at: "2026-06-18 09:45", text: "Completed." },
      { at: "2026-06-18 16:00", text: "Invoice INV-0011 sent (due 25 Jun)." },
    ],
  },
]

export const getJob = (id: string) => JOBS.find((j) => j.id === id) ?? JOBS[0]
