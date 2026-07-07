import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FileText, Loader2, Download, Eye } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { gbp } from "@/lib/invoicing"
import { buildInvoicePdf, type InvoiceDoc } from "@/lib/invoicePdf"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
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

export default function InvoicesList({ defaultKind = "invoice" }: { defaultKind?: "invoice" | "quote" } = {}) {
  // Kind is fixed by the route (Invoices vs Quotes are separate pages). Driving it
  // straight from the prop (no local toggle) means switching routes always reloads
  // the right list instead of sticking on whichever loaded first.
  const kind = defaultKind
  const [status, setStatus] = useState("all")
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [capped, setCapped] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [previewingId, setPreviewingId] = useState<number | null>(null)

  // Download the branded PDF straight from the list — handy for emailing a
  // quote/invoice during correspondence without opening the record first.
  async function downloadRow(id: number) {
    setDownloadingId(id)
    try {
      const { invoice } = await api<{ invoice: InvoiceDoc }>(`/invoices/get?id=${id}`)
      const label = invoice.kind === "quote" ? "Quote" : "Invoice"
      buildInvoicePdf(invoice).save(`${invoice.number ?? invoice.payment_reference}-${label}.pdf`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't build the PDF") }
    finally { setDownloadingId(null) }
  }

  // Open the branded PDF in a new tab to preview before sending/downloading.
  async function previewRow(id: number) {
    setPreviewingId(id)
    try {
      const { invoice } = await api<{ invoice: InvoiceDoc }>(`/invoices/get?id=${id}`)
      window.open(buildInvoicePdf(invoice).output("bloburl"), "_blank")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't build the preview") }
    finally { setPreviewingId(null) }
  }

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ kind })
    if (status !== "all") qs.set("status", status)
    api<{ invoices: Row[]; capped?: boolean }>(`/invoices?${qs}`).then((r) => { setRows(r.invoices); setCapped(!!r.capped) }).finally(() => setLoading(false))
  }, [kind, status])

  const pager = usePager(rows)
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

      <div className="flex flex-wrap items-center justify-end gap-3">
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
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No {kind === "quote" ? "quotes" : "invoices"} here. Raise one from a job.</TableCell></TableRow>
              ) : pager.slice.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell className="font-mono">
                    <Link to={`/ego/${kind === "quote" ? "quotes" : "invoices"}/detail?id=${r.id}`} className="hover:underline">{r.number ?? "Draft"}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{r.payment_reference}</TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell><StatusPill status={r.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{r.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(Number(r.total))}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" disabled={previewingId === r.id}
                        onClick={() => previewRow(r.id)} aria-label={`Preview ${r.kind} ${r.number ?? ""}`} title="Preview">
                        {previewingId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" disabled={downloadingId === r.id}
                        onClick={() => downloadRow(r.id)} aria-label={`Download ${r.kind} ${r.number ?? ""}`} title="Download">
                        {downloadingId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {capped && <p className="mb-2 text-xs text-muted-foreground">Showing the first 500 — narrow with the filters above.</p>}
          <Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="records" />
        </CardContent>
      </Card>
    </div>
  )
}
