import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft, Plus, Trash2, Send, Download, Eye, BadgePoundSterling, Ban, Loader2, Wrench, Mail,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { atLeast } from "@/lib/roles"
import { computeTotals, gbp } from "@/lib/invoicing"
import { buildInvoicePdf, addressLines } from "@/lib/invoicePdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import PaymentDialog from "@/components/ego/PaymentDialog"

interface Line { description: string; quantity: number | string; unit_price: number | string; line_total?: number }
interface Invoice {
  id: number; kind: "quote" | "invoice"; number: string | null; payment_reference: string
  status: EgoStatus; issue_date: string | null; due_date: string | null
  vat_rate: string; subtotal: string; vat_amount: string; total: string; notes: string | null
  customer_name: string; customer_email: string | null; customer_phone: string | null
  customer_address: { line1?: string; city?: string; postcode?: string } | null
  job_reference: string; job_title: string
  lines: Line[]
  company: {
    company_name: string; address: string | null; phone: string | null; email: string | null; vat_number: string | null
    bank_account_name: string | null; bank_sort_code: string | null; bank_account_number: string | null
  }
}

const EMBER_HEX = "#EF9F27" // on-screen brand accent — keep the document on-brand across every app theme

export default function InvoiceDetail() {
  const [params] = useSearchParams()
  const id = params.get("id")
  const { user } = useAuth()
  const [inv, setInv] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [vatRate, setVatRate] = useState(20)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  function load() {
    if (!id) return
    return api<{ invoice: Invoice }>(`/invoices/get?id=${id}`)
      .then(({ invoice }) => {
        setInv(invoice)
        setLines(invoice.lines.length ? invoice.lines : [{ description: "", quantity: 1, unit_price: 0 }])
        setVatRate(Number(invoice.vat_rate))
      })
      .catch(() => toast.error("Not found"))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [id])

  const totals = useMemo(() => computeTotals(lines, vatRate), [lines, vatRate])
  const isDraft = inv?.status === "draft"
  const label = inv?.kind === "quote" ? "Quote" : "Invoice"

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines((ls) => [...ls, { description: "", quantity: 1, unit_price: 0 }])
  const delLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i))

  async function save() {
    if (!inv) return
    setBusy(true)
    try {
      await api("/invoices/update", { method: "POST", body: { id: inv.id, vat_rate: vatRate, lines } })
      toast.success("Saved"); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") } finally { setBusy(false) }
  }
  async function send() {
    if (!inv) return
    setBusy(true)
    try {
      if (isDraft) await api("/invoices/update", { method: "POST", body: { id: inv.id, vat_rate: vatRate, lines } })
      const r = await api<{ number: string }>("/invoices/send", { method: "POST", body: { id: inv.id } })
      toast.success(`${label} ${r.number} sent`); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed") } finally { setBusy(false) }
  }
  async function emailDoc() {
    if (!inv) return
    const to = prompt("Send to email:", inv.customer_email ?? "")
    if (!to) return
    setBusy(true)
    try {
      await api("/invoices/email", { method: "POST", body: { id: inv.id, to } })
      toast.success(`Emailed to ${to}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Email failed") } finally { setBusy(false) }
  }

  async function remind() {
    if (!inv) return
    setBusy(true)
    try {
      const r = await api<{ to: string }>("/invoices/remind", { method: "POST", body: { id: inv.id } })
      toast.success(`Reminder emailed to ${r.to}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send reminder") } finally { setBusy(false) }
  }

  async function voidDoc() {
    if (!inv || !confirm(`Void this ${label.toLowerCase()}?`)) return
    await api("/invoices/void", { method: "POST", body: { id: inv.id } })
    toast.success("Voided"); load()
  }

  function buildPdf() {
    if (!inv) return null
    // Reuse the shared builder so the admin PDF and the customer-portal download
    // are byte-for-byte the same document. Drafts preview live edits (lines/vat).
    return buildInvoicePdf({ ...inv, lines, vat_rate: vatRate })
  }
  function downloadPdf() {
    const doc = buildPdf(); if (!doc || !inv) return
    doc.save(`${inv.number ?? inv.payment_reference}-${label}.pdf`)
  }
  function previewPdf() {
    const doc = buildPdf(); if (!doc) return
    window.open(doc.output("bloburl"), "_blank") // open in a new tab — preview, no download
  }
  async function deleteDoc() {
    if (!inv || !confirm(`Delete this ${label.toLowerCase()}? This can be recovered.`)) return
    try { await api("/invoices/delete", { method: "POST", body: { id: inv.id } }); toast.success(`${label} deleted`); window.history.back() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed") }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
  if (!inv) return <div className="p-6 text-muted-foreground">Not found.</div>
  const co = inv.company

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to={inv.kind === "quote" ? "/ego/quotes" : "/ego/invoices"}><ArrowLeft /> {label}s</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {isDraft && <Button variant="outline" onClick={save} disabled={busy}>Save draft</Button>}
          {(isDraft || inv.status === "draft") && <Button onClick={send} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>}
          <Button variant="outline" onClick={previewPdf}><Eye /> Preview</Button>
          <Button variant="outline" onClick={downloadPdf}><Download /> PDF</Button>
          <Button variant="outline" onClick={emailDoc} disabled={busy}><Mail /> Email</Button>
          {inv.kind === "invoice" && (inv.status === "sent" || inv.status === "overdue") && (
            <>
              <Button onClick={() => setPayOpen(true)}><BadgePoundSterling /> Mark paid</Button>
              <Button variant="outline" onClick={remind} disabled={busy}><Mail /> Reminder</Button>
            </>
          )}
          {inv.status !== "paid" && inv.status !== "void" && (
            <Button variant="outline" className="text-destructive" onClick={voidDoc}><Ban /> Void</Button>
          )}
          {atLeast(user?.role, "manager") && (
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={deleteDoc}><Trash2 /> Delete</Button>
          )}
        </div>
      </div>

      {/* The document */}
      <Card className="mx-auto w-full max-w-3xl">
        <CardContent className="p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: EMBER_HEX }}>
                <Wrench className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: EMBER_HEX }}>{co.company_name}</p>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  {[...addressLines(co.address), co.phone ? `Tel: ${co.phone}` : "", co.email ? `Email: ${co.email}` : "", co.vat_number ? `VAT ${co.vat_number}` : ""]
                    .filter(Boolean)
                    .map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold uppercase tracking-tight">{label}</h1>
              <p className="font-mono text-sm">{inv.number ?? "Draft"}</p>
              <div className="mt-1"><StatusPill status={inv.status} /></div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Bill to</p>
              <p className="font-medium">{inv.customer_name}</p>
              <div className="leading-relaxed text-muted-foreground">
                {[inv.customer_address?.line1, inv.customer_address?.city, inv.customer_address?.postcode, inv.customer_email]
                  .filter(Boolean)
                  .map((line, i) => <p key={i}>{line}</p>)}
              </div>
            </div>
            <div className="text-right text-sm">
              <p><span className="text-muted-foreground">Reference: </span><span className="font-mono font-semibold">{inv.payment_reference}</span></p>
              {inv.job_reference && (
                <p className="text-muted-foreground">Job {inv.job_reference}{inv.job_title ? ` · ${inv.job_title}` : ""}</p>
              )}
              {inv.issue_date && <p className="text-muted-foreground">Issued {inv.issue_date}</p>}
              {inv.due_date && <p className="text-muted-foreground">Due {inv.due_date}</p>}
            </div>
          </div>

          {/* Line items */}
          <div className="mt-6 overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Description</th>
                  <th className="w-20 p-2 text-right">Qty</th>
                  <th className="w-28 p-2 text-right">Unit</th>
                  <th className="w-28 p-2 text-right">Total</th>
                  {isDraft && <th className="w-10 p-2" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">
                      {isDraft ? <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Item" className="h-8" /> : l.description}
                    </td>
                    <td className="p-2 text-right">
                      {isDraft ? <Input type="number" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className="h-8 text-right" /> : Number(l.quantity)}
                    </td>
                    <td className="p-2 text-right">
                      {isDraft ? <Input type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} className="h-8 text-right" /> : gbp(Number(l.unit_price))}
                    </td>
                    <td className="p-2 text-right font-mono">{gbp(totals.lines[i]?.line_total ?? 0)}</td>
                    {isDraft && (
                      <td className="p-2 text-right">
                        {lines.length > 1 && <button onClick={() => delLine(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isDraft && (
              <button onClick={addLine} className="flex w-full items-center justify-center gap-1 border-t p-2 text-sm text-muted-foreground hover:bg-muted/50">
                <Plus className="size-4" /> Add line
              </button>
            )}
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{gbp(totals.subtotal)}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">VAT{isDraft ? "" : ` (${vatRate}%)`}</span>
                {isDraft ? (
                  <div className="flex items-center gap-1">
                    <Input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="h-7 w-16 text-right" />%
                  </div>
                ) : <span className="font-mono">{gbp(totals.vat_amount)}</span>}
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-semibold"><span>Total</span><span className="font-mono">{gbp(totals.total)}</span></div>
            </div>
          </div>

          {/* Pay by bank — ember panel @ 0.6 with an EGO LIMITED watermark so it
              stands out and reads as genuinely ours. Invoices only (quotes don't collect payment). */}
          {inv.kind === "invoice" && (co.bank_account_name || co.bank_sort_code || co.bank_account_number) && (
            <div
              className="relative mt-6 overflow-hidden rounded-lg border p-4 text-sm text-[#171816]"
              style={{ backgroundColor: "rgba(239,159,39,0.6)", borderColor: EMBER_HEX }}
            >
              <span className="pointer-events-none absolute -right-2 bottom-0 select-none text-3xl font-bold uppercase tracking-tight text-[#171816]/10">
                EGO LIMITED
              </span>
              <p className="font-semibold">Pay by bank transfer</p>
              <p className="mt-1">
                {[co.bank_account_name, co.bank_sort_code ? `Sort ${co.bank_sort_code}` : "", co.bank_account_number ? `Acc ${co.bank_account_number}` : ""].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1">Payment reference: <span className="font-mono font-semibold">{inv.payment_reference}</span></p>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentDialog invoiceId={inv.id} total={Number(inv.total)} open={payOpen} onOpenChange={setPayOpen} onDone={load} />
    </div>
  )
}
