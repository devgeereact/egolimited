import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  ArrowLeft, Plus, Trash2, Send, Download, BadgePoundSterling, Ban, Loader2, Wrench, Mail,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { computeTotals, gbp } from "@/lib/invoicing"
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

export default function InvoiceDetail() {
  const [params] = useSearchParams()
  const id = params.get("id")
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

  function downloadPdf() {
    if (!inv) return
    const doc = new jsPDF()
    const co = inv.company
    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text(co.company_name || "EGO LIMITED", 14, 20)
    doc.setFontSize(9); doc.setTextColor(110)
    doc.text([co.address || "", co.phone || "", co.email || "", co.vat_number ? `VAT ${co.vat_number}` : ""].filter(Boolean), 14, 27)
    doc.setFontSize(22); doc.setTextColor(20)
    doc.text(label.toUpperCase(), 196, 20, { align: "right" })
    doc.setFontSize(10); doc.setTextColor(80)
    doc.text([
      `${inv.number ?? "(draft)"}`,
      `Ref: ${inv.payment_reference}`,
      inv.issue_date ? `Issued: ${inv.issue_date}` : "",
      inv.due_date ? `Due: ${inv.due_date}` : "",
    ].filter(Boolean), 196, 28, { align: "right" })
    doc.setFontSize(10); doc.setTextColor(20)
    doc.text("Bill to:", 14, 52)
    doc.setTextColor(80)
    doc.text([inv.customer_name, inv.customer_address?.line1, [inv.customer_address?.city, inv.customer_address?.postcode].filter(Boolean).join(" "), inv.customer_email].filter(Boolean) as string[], 14, 58)

    autoTable(doc, {
      startY: 80,
      head: [["Description", "Qty", "Unit", "Total"]],
      body: totals.lines.map((l) => [l.description, String(l.quantity), gbp(l.unit_price), gbp(l.line_total)]),
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (doc as any).lastAutoTable.finalY + 8
    doc.setFontSize(10); doc.setTextColor(80)
    doc.text(`Subtotal: ${gbp(totals.subtotal)}`, 196, y, { align: "right" }); y += 6
    doc.text(`VAT (${vatRate}%): ${gbp(totals.vat_amount)}`, 196, y, { align: "right" }); y += 6
    doc.setFontSize(12); doc.setTextColor(20)
    doc.text(`Total: ${gbp(totals.total)}`, 196, y, { align: "right" }); y += 12
    doc.setFontSize(9); doc.setTextColor(110)
    doc.text("Pay by bank transfer:", 14, y); y += 5
    doc.text([
      co.bank_account_name ? `Account: ${co.bank_account_name}` : "",
      co.bank_sort_code ? `Sort code: ${co.bank_sort_code}` : "",
      co.bank_account_number ? `Account no: ${co.bank_account_number}` : "",
      `Payment reference: ${inv.payment_reference}`,
    ].filter(Boolean), 14, y)
    doc.save(`${inv.number ?? inv.payment_reference}-${label}.pdf`)
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
  if (!inv) return <div className="p-6 text-muted-foreground">Not found.</div>
  const co = inv.company

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/ego/invoices"><ArrowLeft /> {label}s</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {isDraft && <Button variant="outline" onClick={save} disabled={busy}>Save draft</Button>}
          {(isDraft || inv.status === "draft") && <Button onClick={send} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>}
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
        </div>
      </div>

      {/* The document */}
      <Card className="mx-auto w-full max-w-3xl">
        <CardContent className="p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Wrench className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold text-primary">{co.company_name}</p>
                <p className="whitespace-pre-line text-xs text-muted-foreground">
                  {[co.address, co.phone, co.email, co.vat_number ? `VAT ${co.vat_number}` : ""].filter(Boolean).join("\n")}
                </p>
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
              <p className="text-muted-foreground">
                {[inv.customer_address?.line1, inv.customer_address?.city, inv.customer_address?.postcode].filter(Boolean).join(", ")}
              </p>
              <p className="text-muted-foreground">{inv.customer_email}</p>
            </div>
            <div className="text-right text-sm">
              <p><span className="text-muted-foreground">Reference: </span><span className="font-mono font-semibold">{inv.payment_reference}</span></p>
              <p className="text-muted-foreground">Job: {inv.job_reference} · {inv.job_title}</p>
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

          {/* Bank details */}
          <div className="mt-6 rounded-lg bg-muted/40 p-4 text-sm">
            <p className="font-medium">Pay by bank transfer</p>
            <p className="mt-1 text-muted-foreground">
              {co.bank_account_name} · Sort {co.bank_sort_code} · Acc {co.bank_account_number}
            </p>
            <p className="mt-1">Payment reference: <span className="font-mono font-semibold">{inv.payment_reference}</span></p>
          </div>
        </CardContent>
      </Card>

      <PaymentDialog invoiceId={inv.id} total={Number(inv.total)} open={payOpen} onOpenChange={setPayOpen} onDone={load} />
    </div>
  )
}
