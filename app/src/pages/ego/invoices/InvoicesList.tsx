import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FileText, Loader2 } from "lucide-react"

import { api } from "@/lib/api"
import { gbp } from "@/lib/invoicing"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"

interface Row {
  id: number; kind: "quote" | "invoice"; number: string | null; payment_reference: string
  status: EgoStatus; issue_date: string | null; due_date: string | null; total: string
  customer_name: string; job_reference: string
}

const STATUS_FILTERS = ["all", "draft", "sent", "overdue", "paid"]

export default function InvoicesList() {
  const [kind, setKind] = useState<"invoice" | "quote">("invoice")
  const [status, setStatus] = useState("all")
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ kind })
    if (status !== "all") qs.set("status", status)
    api<{ invoices: Row[] }>(`/invoices?${qs}`).then((r) => setRows(r.invoices)).finally(() => setLoading(false))
  }, [kind, status])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{kind === "quote" ? "Quotes" : "Invoices"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} {kind === "quote" ? "quotes" : "invoices"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as "invoice" | "quote")}>
          <TabsList>
            <TabsTrigger value="invoice">Invoices</TabsTrigger>
            <TabsTrigger value="quote">Quotes</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            {STATUS_FILTERS.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No {kind === "quote" ? "quotes" : "invoices"} here. Raise one from a job.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell className="font-mono">
                    <Link to={`/ego/invoices/detail?id=${r.id}`} className="hover:underline">{r.number ?? "Draft"}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{r.payment_reference}</TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell><StatusPill status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{r.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(Number(r.total))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
