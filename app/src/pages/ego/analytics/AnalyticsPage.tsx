import { useEffect, useState } from "react"
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  BarChart3, PoundSterling, AlertTriangle, TrendingUp, Users, FileDown, Loader2,
  CheckCircle2, Wallet, Receipt, Download,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiDownload } from "@/lib/api"
import { gbp } from "@/lib/invoicing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardSkeleton } from "@/components/ego/Skeletons"

interface MonthPoint { month: string; label: string; collected: number; invoiced: number; jobs: number }
interface Analytics {
  kpi: {
    collected_12m: number; invoiced_12m: number; outstanding: number; overdue: number
    collected_30d: number; jobs_completed_30d: number; jobs_open: number
    new_customers_30d: number; avg_invoice: number; paid_count: number
  }
  revenue_series: MonthPoint[]
  jobs_by_status: { status: string; count: number }[]
  top_engineers: { name: string; completed: number; revenue: number }[]
  top_customers: { name: string; revenue: number; jobs: number }[]
}

const STATUS_TONE: Record<string, string> = {
  new: "bg-slate-400", scheduled: "bg-blue-500", en_route: "bg-indigo-500", on_site: "bg-violet-500",
  on_hold: "bg-amber-500", completed: "bg-sky-500", invoiced: "bg-orange-500", paid: "bg-emerald-500",
  closed: "bg-teal-500", cancelled: "bg-red-500",
}
const prettyStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())

const EXPORTS = [
  { report: "invoices", label: "Invoices" },
  { report: "payments", label: "Payments" },
  { report: "jobs", label: "Jobs" },
  { report: "customers", label: "Customers" },
] as const

export default function AnalyticsPage() {
  const [d, setD] = useState<Analytics | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api<Analytics>("/analytics").then(setD).catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load analytics"))
  }, [])

  async function exportCsv(report: string) {
    setBusy(report)
    try {
      await apiDownload(`/analytics/export?report=${report}`, `ego-${report}-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`${report[0].toUpperCase()}${report.slice(1)} exported`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed") } finally { setBusy(null) }
  }

  if (!d) return <DashboardSkeleton />

  const k = d.kpi
  const kpis = [
    { label: "Collected · 12m", value: gbp(k.collected_12m), icon: TrendingUp, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    { label: "Invoiced · 12m", value: gbp(k.invoiced_12m), icon: Receipt, tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
    { label: "Outstanding", value: gbp(k.outstanding), icon: Wallet, tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
    { label: "Overdue", value: gbp(k.overdue), icon: AlertTriangle, tone: "text-red-600 dark:text-red-400 bg-red-500/10" },
    { label: "Collected · 30d", value: gbp(k.collected_30d), icon: PoundSterling, tone: "text-teal-600 dark:text-teal-400 bg-teal-500/10" },
    { label: "Completed · 30d", value: String(k.jobs_completed_30d), icon: CheckCircle2, tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    { label: "Avg invoice", value: gbp(k.avg_invoice), icon: Receipt, tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
    { label: "New customers · 30d", value: String(k.new_customers_30d), icon: Users, tone: "text-orange-600 dark:text-orange-400 bg-orange-500/10" },
  ]

  const statusMax = Math.max(1, ...d.jobs_by_status.map((s) => s.count))
  const engMax = Math.max(1, ...d.top_engineers.map((e) => e.completed))
  const custMax = Math.max(1, ...d.top_customers.map((c) => c.revenue))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><BarChart3 className="size-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Revenue, jobs and receivables — last 12 months.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><FileDown className="size-3.5" /> Export CSV:</span>
          {EXPORTS.map((e) => (
            <Button key={e.report} variant="outline" size="sm" disabled={busy !== null} onClick={() => exportCsv(e.report)}>
              {busy === e.report ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} {e.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${s.tone}`}><s.icon className="size-5" /></div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                <p className="truncate text-xl font-semibold tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Revenue — collected vs invoiced</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "hsl(var(--chart-1))" }} /> Collected</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "hsl(var(--chart-3))" }} /> Invoiced</span>
          </div>
        </CardHeader>
        <CardContent className="h-72 pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.revenue_series} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                width={56} tickFormatter={(v: number) => (v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`)} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--popover-foreground))" }}
                formatter={(v: number, name) => [gbp(Number(v)), name === "collected" ? "Collected" : "Invoiced"]}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Area type="monotone" dataKey="invoiced" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#gInvoiced)" />
              <Area type="monotone" dataKey="collected" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#gCollected)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Jobs by status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Jobs by status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {d.jobs_by_status.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No jobs yet.</p>
            ) : d.jobs_by_status.map((s) => (
              <div key={s.status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{prettyStatus(s.status)}</span>
                  <span className="font-medium tabular-nums">{s.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${STATUS_TONE[s.status] ?? "bg-primary"}`} style={{ width: `${(s.count / statusMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top engineers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top engineers · 90d</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {d.top_engineers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No completed jobs yet.</p>
            ) : d.top_engineers.map((e) => (
              <div key={e.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{e.name}</span>
                  <span className="shrink-0 font-medium tabular-nums">{e.completed} jobs</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(e.completed / engMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top customers by revenue */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top customers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {d.top_customers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No paid revenue yet.</p>
            ) : d.top_customers.map((c) => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 font-medium tabular-nums">{gbp(c.revenue)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(c.revenue / custMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
