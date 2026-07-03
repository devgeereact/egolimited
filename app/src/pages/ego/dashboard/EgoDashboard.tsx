import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Briefcase, CalendarPlus, PoundSterling, AlertTriangle, Loader2, Sparkles, Droplets, Wind, FileText,
  Thermometer, Clock, ArrowRight, CloudSun, MapPin, Truck, BadgePoundSterling,
  Star, CheckCircle2, type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { gbp } from "@/lib/invoicing"
import { useAuth } from "@/store/auth.store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import WeatherPanel from "@/components/ego/WeatherPanel"

interface Dash {
  today_jobs: number; to_schedule: number; awaiting_invoice: number; in_progress: number; completed_today: number; open_jobs: number
  unpaid_total: number; overdue_total: number; collected_30d: number
  review_avg: number | null; review_count: number
  today: { id: number; reference: string; title: string; status: EgoStatus; scheduled_start: string | null; customer_name: string }[]
  recent: { action: string; detail: string | null; created_at: string; job_id: number | null; job_reference: string | null; actor_name: string | null }[]
  waitlist: { id: number; reference: string; title: string; priority: string; status: EgoStatus; customer_name: string; reason: "schedule" | "assign" }[]
  messages: { id: number; from_name: string | null; body: string; channel: string; rating: number | null; acknowledged: number; created_at: string; job_id: number | null; job_reference: string | null; customer_name: string | null }[]
  unread_messages: number
}


function recentText(action: string, detail: string | null): string {
  let d: Record<string, unknown> = {}
  try { d = detail ? JSON.parse(detail) : {} } catch { /* */ }
  const map: Record<string, string> = {
    created: "Job created", status_changed: `Status ${d.from} → ${d.to}`, scheduled: "Scheduled",
    note: "Note added", photo: "Photo added", invoice_created: "Invoice drafted", invoice_sent: `Invoice ${d.number} sent`,
    quote_created: "Quote drafted", quote_sent: `Quote ${d.number} sent`, payment_recorded: `Payment ${gbp(Number(d.amount) || 0)}`,
  }
  return map[action] ?? action
}

const TODAY_LABEL = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
// Morning / Afternoon / Evening by UK time — drives the greeting + briefing label.
const dayPart = () => {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }))
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening"
}

export default function EgoDashboard() {
  const { user } = useAuth()
  const [d, setD] = useState<Dash | null>(null)
  const [ai, setAi] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  useEffect(() => {
    api<Dash>("/dashboard").then(setD)
  }, [])

  async function digest() {
    if (!d) return
    setAiBusy(true)
    try {
      const lines = d.recent.slice(0, 10).map((a) => `- ${recentText(a.action, a.detail)}${a.job_reference ? ` (${a.job_reference})` : ""}`).join("\n")
      const prompt =
        `You are the office assistant for EGO LIMITED, a maintenance company. Give a short ${dayPart().toLowerCase()} briefing (3-4 bullets) and flag what needs attention. Be concise.\n\n` +
        `Jobs today: ${d.today_jobs}. In progress now: ${d.in_progress}. Awaiting schedule: ${d.to_schedule}. Awaiting invoice: ${d.awaiting_invoice}. Open jobs: ${d.open_jobs}. Completed today: ${d.completed_today}.\n` +
        `Outstanding: £${d.unpaid_total}. Overdue: £${d.overdue_total}. Collected (30d): £${d.collected_30d}. Avg review: ${d.review_avg ?? "n/a"} (${d.review_count}).\n` +
        `Recent activity:\n${lines}`
      const r = await api<{ text: string }>("/ai/draft", { method: "POST", body: { prompt } })
      setAi(r.text)
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI digest failed") }
    finally { setAiBusy(false) }
  }

  if (!d) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>

  const stats = [
    { label: "Today's jobs", value: String(d.today_jobs), icon: Briefcase, to: "/ego/schedule", tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    { label: "In progress", value: String(d.in_progress), icon: Truck, to: "/ego/schedule", tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
    { label: "Completed today", value: String(d.completed_today), icon: CheckCircle2, to: "/ego/jobs", tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
    { label: "To schedule", value: String(d.to_schedule), icon: CalendarPlus, to: "/ego/jobs", tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
    { label: "Awaiting invoice", value: String(d.awaiting_invoice), icon: FileText, to: "/ego/jobs", tone: "text-orange-600 dark:text-orange-400 bg-orange-500/10" },
    { label: "Outstanding", value: gbp(d.unpaid_total), icon: PoundSterling, to: "/ego/payments", tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    { label: "Overdue", value: gbp(d.overdue_total), icon: AlertTriangle, to: "/ego/payments", tone: "text-red-600 dark:text-red-400 bg-red-500/10" },
    { label: "Collected (30d)", value: gbp(d.collected_30d), icon: BadgePoundSterling, to: "/ego/payments", tone: "text-teal-600 dark:text-teal-400 bg-teal-500/10" },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user ? `Good ${dayPart().toLowerCase()}, ${user.name.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{TODAY_LABEL}</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${s.tone}`}><s.icon className="size-5" /></div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                  <p className="truncate text-xl font-semibold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pulse strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Link to="/ego/jobs" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Briefcase className="size-4" /> <span className="font-semibold text-foreground">{d.open_jobs}</span> open jobs
        </Link>
        <Link to="/ego/reviews" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Star className="size-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-foreground">{d.review_avg?.toFixed(1) ?? "—"}</span> avg · {d.review_count} review{d.review_count === 1 ? "" : "s"}
        </Link>
      </div>

      {/* AI morning briefing */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-primary" /> {dayPart()} briefing</p>
            <Button size="sm" variant="outline" onClick={digest} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {ai ? "Refresh" : "Generate"}
            </Button>
          </div>
          {ai
            ? <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{ai}</p>
            : <p className="mt-3 text-sm text-muted-foreground">Generate an AI summary of today's jobs, money owed and what needs attention.</p>}
        </CardContent>
      </Card>

      {/* Weather — hero + hourly + metrics + weekly (live OpenWeather) */}
      <WeatherPanel />

      {/* Today's schedule + Waitlist — operational, side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarPlus className="size-4 text-primary" /> Today's schedule</CardTitle>
            <Link to="/ego/schedule" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Schedule <ArrowRight className="size-3.5" /></Link>
          </CardHeader>
          <CardContent className="h-[300px] space-y-2 overflow-y-auto">
            {d.today.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nothing scheduled today.</div>
            ) : d.today.map((j) => (
              <Link key={j.id} to={`/ego/jobs/detail?id=${j.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{j.title}</p>
                  <p className="text-xs text-muted-foreground">{j.reference} · {j.customer_name}{j.scheduled_start ? ` · ${j.scheduled_start.slice(11, 16)}` : ""}</p>
                </div>
                <StatusPill status={j.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-amber-600" /> Waitlist
              {d.waitlist.length > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">{d.waitlist.length}</span>}
            </CardTitle>
            <Link to="/ego/schedule" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Schedule <ArrowRight className="size-3.5" /></Link>
          </CardHeader>
          <CardContent className="h-[300px] space-y-2 overflow-y-auto">
            {d.waitlist.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Everything scheduled &amp; assigned 🎉</div>
            ) : d.waitlist.map((j) => (
              <Link key={j.id} to={`/ego/jobs/detail?id=${j.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{j.title}</p>
                  <p className="text-xs text-muted-foreground">{j.reference} · {j.customer_name}{j.priority === "urgent" ? " · ⚠ urgent" : ""}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  j.reason === "schedule" ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600")}>
                  {j.reason === "schedule" ? "Needs slot" : "Needs engineer"}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent reviews only — GDPR: private customer messages are NOT shown here,
          they stay on the individual job. Public-intent feedback is safe to surface. */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-4 fill-amber-400 text-amber-400" /> Recent reviews
            {d.unread_messages > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">{d.unread_messages} new</span>}
          </CardTitle>
          <Link to="/ego/reviews" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">All reviews <ArrowRight className="size-3.5" /></Link>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {d.messages.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground md:col-span-2">No reviews yet.</div>
          ) : d.messages.map((m) => (
            <Link key={m.id} to="/ego/reviews"
              className={cn("flex items-start justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30",
                !m.acknowledged && "border-amber-500/30 bg-amber-500/5")}>
              <div className="min-w-0">
                <p className="mb-0.5 text-sm text-amber-500">
                  {"★".repeat(m.rating ?? 0)}<span className="text-muted-foreground/40">{"★".repeat(5 - (m.rating ?? 0))}</span>
                </p>
                <p className="truncate text-sm">{m.body || <span className="italic text-muted-foreground">No comment</span>}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.from_name || m.customer_name || "Customer"}{m.job_reference ? ` · ${m.job_reference}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{m.created_at?.slice(5, 16)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
