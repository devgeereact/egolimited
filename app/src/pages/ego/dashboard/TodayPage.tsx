import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  AlertTriangle, ArrowRight, BadgePoundSterling, CalendarPlus, CheckCircle2, Clock, FileText,
  Loader2, Mail, Sparkles, Truck, UserPlus, Wrench,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useApi, invalidate } from "@/lib/query"
import { cn } from "@/lib/utils"
import { gbp } from "@/lib/invoicing"
import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import ScheduleDialog from "@/components/ego/ScheduleDialog"
import { DashboardSkeleton } from "@/components/ego/Skeletons"

/**
 * TODAY — the operational cockpit.
 *
 * The screen this replaces was a wall of KPI tiles: eight numbers, each a link to a list you then
 * had to search. It told you THAT there were three jobs awaiting an engineer; it could not tell you
 * WHICH, and it certainly couldn't let you assign one. Every number was a signpost to work that
 * happened somewhere else.
 *
 * This screen is the work. Four queues, in the order a maintenance business actually loses money:
 *   1. Jobs with nobody going to them          → schedule/assign it, right here
 *   2. Jobs about to breach their SLA          → open it before the customer rings
 *   3. Work finished but never invoiced        → money earned and not asked for
 *   4. Invoices past their due date            → chase, right here
 * Each row carries its action. The numbers still exist — they moved to Analytics, where numbers
 * belong. If every queue is empty, the day is genuinely under control and the screen says so.
 */

interface Dash {
  today_jobs: number; in_progress: number; completed_today: number
  unpaid_total: number; overdue_total: number; collected_30d: number
  open_jobs: number; review_avg: number | null; review_count: number
  today: { id: number; reference: string; title: string; status: EgoStatus; scheduled_start: string | null; customer_name: string }[]
  waitlist: { id: number; reference: string; title: string; priority: string; customer_name: string; reason: "schedule" | "assign" }[]
  at_risk: { id: number; reference: string; title: string; priority: string; status: EgoStatus; customer_name: string; engineer_name: string | null; sla_state: "at_risk" | "breached"; sla_due: string | null }[]
  to_invoice: { id: number; reference: string; title: string; quoted_amount: string | null; completed_at: string | null; customer_name: string }[]
  overdue_invoices: { id: number; number: string | null; total: string; due_date: string | null; payment_reference: string; customer_name: string; days_overdue: number }[]
}

const dayPart = () => {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }))
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening"
}
const TODAY_LABEL = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
const timeOf = (s: string | null) => (s ? s.slice(11, 16) : "—")

/** One queue of work. Renders nothing at all when empty — an empty queue is not news. */
function Queue({
  title, icon: Icon, tone, items, empty, children,
}: {
  title: string
  icon: typeof Wrench
  tone: string
  items: unknown[]
  empty?: string
  children: React.ReactNode
}) {
  if (items.length === 0 && !empty) return null
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2.5 border-b px-4 py-3">
          <span className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>
            <Icon className="size-4" />
          </span>
          <h2 className="text-sm font-semibold">{title}</h2>
          {items.length > 0 && (
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
              {items.length}
            </span>
          )}
        </div>
        {items.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" /> {empty}
          </p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function TodayPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: d } = useApi<Dash>("/dashboard")

  const [schedJob, setSchedJob] = useState<number | undefined>()
  const [chasing, setChasing] = useState<number | null>(null)
  const [ai, setAi] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)

  /** The AI briefing, carried over from the old dashboard — it now summarises the QUEUES (what
   *  needs doing) rather than a wall of counts, which is what someone actually wants read to them. */
  async function digest() {
    if (!d) return
    setAiBusy(true)
    try {
      const lines = [
        `Jobs today: ${d.today_jobs}. In progress: ${d.in_progress}. Completed today: ${d.completed_today}.`,
        `Needing a slot or an engineer: ${d.waitlist.length}.`,
        `Late or about to breach SLA: ${d.at_risk.length}${d.at_risk.length ? ` (${d.at_risk.slice(0, 3).map((j) => `${j.reference} ${j.customer_name}`).join("; ")})` : ""}.`,
        `Finished but not invoiced: ${d.to_invoice.length}.`,
        `Overdue invoices: ${d.overdue_invoices.length}, ${gbp(d.overdue_total)} outstanding${d.overdue_invoices.length ? ` (oldest ${d.overdue_invoices[0].days_overdue} days)` : ""}.`,
      ].join("\n")
      const prompt =
        `You are the office assistant for EGO LIMITED, a maintenance company. Give a short ${dayPart().toLowerCase()} briefing ` +
        `(3-4 bullets) telling the office what to deal with first and why. Be concise and specific.\n\n${lines}`
      const r = await api<{ text: string }>("/ai/draft", { method: "POST", body: { prompt } })
      setAi(r.text)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI briefing failed")
    } finally {
      setAiBusy(false)
    }
  }

  /** Chase an overdue invoice without leaving the screen. */
  async function chase(id: number, customer: string) {
    setChasing(id)
    try {
      await api("/invoices/remind", { method: "POST", body: { id } })
      toast.success(`Reminder emailed to ${customer}`)
      invalidate("/dashboard", "/invoices")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the reminder")
    } finally {
      setChasing(null)
    }
  }

  if (!d) return <DashboardSkeleton />

  const needsAttention =
    d.waitlist.length + d.at_risk.length + d.to_invoice.length + d.overdue_invoices.length

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user ? `Good ${dayPart().toLowerCase()}, ${user.name.split(" ")[0]}` : "Today"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {TODAY_LABEL} · {d.today_jobs} job{d.today_jobs === 1 ? "" : "s"} on ·{" "}
            {d.in_progress} in progress · {d.completed_today} done
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={digest} disabled={aiBusy}>
            {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Brief me
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/ego/analytics">Analytics <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </div>

      {ai && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex gap-3 p-4">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{ai}</p>
          </CardContent>
        </Card>
      )}

      {/* The day is under control — say so plainly rather than showing four empty boxes. */}
      {needsAttention === 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Nothing needs you right now</p>
              <p className="text-xs text-muted-foreground">
                Every job is scheduled and assigned, nothing is late, and every invoice is out and in date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1. NOBODY IS GOING TO THIS JOB — the most expensive kind of silence. */}
        <Queue
          title="Needs scheduling or an engineer"
          icon={CalendarPlus}
          tone="bg-amber-500/15 text-amber-600"
          items={d.waitlist}
          empty="Everything is scheduled and assigned"
        >
          {d.waitlist.slice(0, 8).map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md",
                j.reason === "schedule" ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600")}>
                {j.reason === "schedule" ? <Clock className="size-3.5" /> : <UserPlus className="size-3.5" />}
              </span>
              <Link to={`/ego/jobs/detail?id=${j.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-medium">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {j.reference} · {j.customer_name}
                  {j.priority === "urgent" && <span className="ml-1 font-medium text-red-600">· urgent</span>}
                </p>
              </Link>
              <Button size="sm" variant="secondary" onClick={() => setSchedJob(j.id)}>
                {j.reason === "schedule" ? "Schedule" : "Assign"}
              </Button>
            </li>
          ))}
        </Queue>

        {/* 2. LATE, OR ABOUT TO BE. Better we ring the customer than they ring us. */}
        <Queue
          title="Late or about to be"
          icon={AlertTriangle}
          tone="bg-red-500/15 text-red-600"
          items={d.at_risk}
          empty="Every open job is inside its SLA"
        >
          {d.at_risk.slice(0, 8).map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link to={`/ego/jobs/detail?id=${j.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-medium">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {j.reference} · {j.customer_name}
                  {j.engineer_name ? ` · ${j.engineer_name}` : " · unassigned"}
                </p>
              </Link>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                j.sla_state === "breached"
                  ? "bg-red-500/15 text-red-600"
                  : "bg-amber-500/15 text-amber-600")}>
                {j.sla_state === "breached" ? "Late" : "Due soon"}
              </span>
              <StatusPill status={j.status} />
            </li>
          ))}
        </Queue>

        {/* 3. DONE BUT NOT BILLED — work EGO has already paid for and not charged for. */}
        <Queue
          title="Done — not invoiced yet"
          icon={FileText}
          tone="bg-orange-500/15 text-orange-600"
          items={d.to_invoice}
          empty="Everything finished has been invoiced"
        >
          {d.to_invoice.slice(0, 8).map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link to={`/ego/jobs/detail?id=${j.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-medium">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {j.reference} · {j.customer_name}
                  {j.quoted_amount ? ` · quoted ${gbp(Number(j.quoted_amount))}` : ""}
                </p>
              </Link>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/ego/jobs/detail?id=${j.id}`)}>
                Invoice
              </Button>
            </li>
          ))}
        </Queue>

        {/* 4. OVERDUE MONEY. Days-to-paid is the number this business lives or dies on. */}
        <Queue
          title="Overdue invoices"
          icon={BadgePoundSterling}
          tone="bg-red-500/15 text-red-600"
          items={d.overdue_invoices}
          empty="Nothing is overdue"
        >
          {d.overdue_invoices.slice(0, 8).map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link to={`/ego/invoices/detail?id=${inv.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate text-sm font-medium">
                  {inv.number ?? inv.payment_reference} · {gbp(Number(inv.total))}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {inv.customer_name} ·{" "}
                  <span className="font-medium text-red-600">
                    {inv.days_overdue} day{inv.days_overdue === 1 ? "" : "s"} late
                  </span>
                </p>
              </Link>
              <Button
                size="sm"
                variant="secondary"
                disabled={chasing === inv.id}
                onClick={() => chase(inv.id, inv.customer_name)}
              >
                {chasing === inv.id ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Chase
              </Button>
            </li>
          ))}
        </Queue>
      </div>

      {/* Today's run — who is where, and when. */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2.5 border-b px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600">
              <Truck className="size-4" />
            </span>
            <h2 className="text-sm font-semibold">Today&apos;s jobs</h2>
            <Button asChild variant="ghost" size="sm" className="ml-auto text-muted-foreground">
              <Link to="/ego/schedule">Schedule <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
          {d.today.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Nothing booked in for today.</p>
          ) : (
            <ul className="divide-y">
              {d.today.map((j) => (
                <li key={j.id}>
                  <Link to={`/ego/jobs/detail?id=${j.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
                    <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {timeOf(j.scheduled_start)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{j.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{j.reference} · {j.customer_name}</p>
                    </div>
                    <StatusPill status={j.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Money, as a footnote rather than a headline — the queues above are what you DO about it. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Link to="/ego/payments" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <BadgePoundSterling className="size-4" />
          <span className="font-semibold text-foreground">{gbp(d.unpaid_total)}</span> outstanding
        </Link>
        <Link to="/ego/payments" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <AlertTriangle className="size-4" />
          <span className="font-semibold text-red-600">{gbp(d.overdue_total)}</span> overdue
        </Link>
        <Link to="/ego/payments" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Sparkles className="size-4" />
          <span className="font-semibold text-foreground">{gbp(d.collected_30d)}</span> collected (30d)
        </Link>
        <Link to="/ego/jobs" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Wrench className="size-4" />
          <span className="font-semibold text-foreground">{d.open_jobs}</span> open jobs
        </Link>
      </div>

      {/* Schedule/assign without leaving the cockpit. */}
      <ScheduleDialog
        open={schedJob !== undefined}
        onOpenChange={(v) => !v && setSchedJob(undefined)}
        jobId={schedJob}
        onDone={() => {
          setSchedJob(undefined)
          invalidate("/dashboard", "/jobs", "/schedule")
          toast.success("Job scheduled")
        }}
      />
    </div>
  )
}
