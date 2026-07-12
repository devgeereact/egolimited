import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BadgePoundSterling, CreditCard, Loader2, TriangleAlert, Wallet } from "lucide-react"

import { useApi, invalidate } from "@/lib/query"
import { cn } from "@/lib/utils"
import { gbp } from "@/lib/invoicing"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import PaymentDialog from "@/components/ego/PaymentDialog"

interface Row {
  id: number; number: string | null; payment_reference: string
  status: EgoStatus; issue_date: string | null; due_date: string | null; total: string
  customer_name: string; job_reference: string
}

type TabKey = "due" | "overdue" | "paid"

const sum = (rows: Row[]) => rows.reduce((n, r) => n + Number(r.total), 0)

/** Whole-day delta from today (negative = in the past). */
function daysFromToday(date: string | null): number | null {
  if (!date) return null
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime()
  const d = new Date(date).getTime()
  return Math.round((d - today) / 86_400_000)
}

function ageLabel(tab: TabKey, due: string | null): string {
  const d = daysFromToday(due)
  if (d === null) return "—"
  if (tab === "overdue") return `${Math.abs(d)}d overdue`
  if (tab === "due") return d === 0 ? "due today" : d > 0 ? `in ${d}d` : `${Math.abs(d)}d late`
  return due ?? "—"
}

const DUE_PATH = "/invoices?kind=invoice&status=sent"
const OVERDUE_PATH = "/invoices?kind=invoice&status=overdue"
const PAID_PATH = "/invoices?kind=invoice&status=paid"

export default function PaymentsPage() {
  const [tab, setTab] = useState<TabKey>("due")
  const [pay, setPay] = useState<Row | null>(null)

  const { data: dueData, isPending: duePending } = useApi<{ invoices: Row[] }>(DUE_PATH)
  const { data: overdueData, isPending: overduePending } = useApi<{ invoices: Row[] }>(OVERDUE_PATH)
  const { data: paidData, isPending: paidPending } = useApi<{ invoices: Row[] }>(PAID_PATH)

  const due = useMemo(() => dueData?.invoices ?? [], [dueData])
  const overdue = useMemo(() => overdueData?.invoices ?? [], [overdueData])
  const paid = useMemo(() => paidData?.invoices ?? [], [paidData])
  const loading = duePending || overduePending || paidPending

  const kpis = useMemo(() => ({
    outstanding: sum(due) + sum(overdue),
    overdue: sum(overdue),
    collected: sum(paid),
  }), [due, overdue, paid])

  const rows = tab === "due" ? due : tab === "overdue" ? overdue : paid
  const canPay = tab !== "paid"

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CreditCard className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Receivables — what's owed, what's overdue, what's in.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={Wallet} label="Outstanding" value={gbp(kpis.outstanding)} tone="default" />
        <Kpi icon={TriangleAlert} label="Overdue" value={gbp(kpis.overdue)} tone={kpis.overdue > 0 ? "danger" : "default"} />
        <Kpi icon={BadgePoundSterling} label="Collected" value={gbp(kpis.collected)} tone="success" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="due">Due <Count n={due.length} /></TabsTrigger>
          <TabsTrigger value="overdue">Overdue <Count n={overdue.length} /></TabsTrigger>
          <TabsTrigger value="paid">Paid <Count n={paid.length} /></TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{tab === "paid" ? "Due" : "Timing"}</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canPay && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={canPay ? 7 : 6} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={canPay ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  {tab === "overdue" ? "Nothing overdue 🎉" : tab === "paid" ? "No payments recorded yet." : "Nothing due right now."}
                </TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">
                    <Link to={`/ego/invoices/detail?id=${r.id}`} className="hover:underline">{r.number ?? "Draft"}</Link>
                  </TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{r.payment_reference}</TableCell>
                  <TableCell><StatusPill status={r.status} /></TableCell>
                  <TableCell className={cn("text-sm", tab === "overdue" && "font-medium text-destructive")}>{ageLabel(tab, r.due_date)}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(Number(r.total))}</TableCell>
                  {canPay && (
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setPay(r)}><BadgePoundSterling className="size-4" /> Record</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pay && (
        <PaymentDialog
          invoiceId={pay.id}
          total={Number(pay.total)}
          open={!!pay}
          onOpenChange={(o) => !o && setPay(null)}
          onDone={() => { setPay(null); invalidate(DUE_PATH, OVERDUE_PATH, PAID_PATH) }}
        />
      )}
    </div>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{n}</span>
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: string; tone: "default" | "danger" | "success" }) {
  const ring = tone === "danger" ? "text-destructive bg-destructive/10" : tone === "success" ? "text-emerald-600 bg-emerald-500/10" : "text-primary bg-primary/10"
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex size-10 items-center justify-center rounded-lg", ring)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-mono text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
