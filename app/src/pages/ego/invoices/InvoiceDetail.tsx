import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Plus, Trash2, Send, Download, Eye, BadgePoundSterling, Ban, Loader2, Wrench, Mail,
  CheckCircle2, Undo2, MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"

import QRCode from "qrcode"
import { api, apiForm } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { atLeast } from "@/lib/roles"
import { computeTotals, gbp } from "@/lib/invoicing"
import { buildInvoicePdf, addressLines } from "@/lib/invoicePdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import PaymentDialog from "@/components/ego/PaymentDialog"
import { DetailSkeleton } from "@/components/ego/Skeletons"
import { confirmDialog } from "@/components/ego/confirm"

interface Line { description: string; quantity: number | string; unit_price: number | string; line_total?: number }
interface Invoice {
  id: number; kind: "quote" | "invoice"; number: string | null; payment_reference: string
  status: EgoStatus; issue_date: string | null; due_date: string | null
  vat_rate: string; subtotal: string; vat_amount: string; total: string; notes: string | null
  customer_name: string; customer_email: string | null; customer_phone: string | null
  customer_address: { line1?: string; city?: string; postcode?: string } | null
  job_reference: string; job_title: string
  track_url?: string
  lines: Line[]
  payments?: { amount: number | string; paid_on?: string; reference?: string | null }[]
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
  const navigate = useNavigate()
  const [inv, setInv] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [vatRate, setVatRate] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [emailBusy, setEmailBusy] = useState(false)

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
  useEffect(() => { load()   }, [id])

  const totals = useMemo(() => computeTotals(lines, vatRate), [lines, vatRate])
  const isDraft = inv?.status === "draft"
  // Quotes AND invoices stay editable until they're settled — a paid or void document is locked.
  const isEditable = !!inv && !["paid", "void"].includes(inv.status)
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
  // Open the preview popup so the office sees exactly what goes out (and to whom) first.
  function openEmail() {
    if (!inv) return
    setEmailTo(inv.customer_email ?? "")
    setEmailOpen(true)
  }
  async function sendEmail() {
    if (!inv) return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTo.trim())) { toast.error("Enter a valid email, or use 'Issue without emailing'"); return }
    setEmailBusy(true)
    try {
      // Invoice draft → finalise first so the ATTACHED PDF carries its real number.
      let current = inv
      let pdfObj: any = { ...inv, lines, vat_rate: vatRate }
      if (inv.kind === "invoice" && isDraft) {
        await api("/invoices/update", { method: "POST", body: { id: inv.id, vat_rate: vatRate, lines } })
        await api("/invoices/send", { method: "POST", body: { id: inv.id } })
        current = (await api<{ invoice: Invoice }>(`/invoices/get?id=${inv.id}`)).invoice
        pdfObj = { ...current, vat_rate: Number(current.vat_rate) }
      }
      const fd = new FormData()
      fd.append("id", String(current.id))
      fd.append("to", emailTo.trim())
      // Attach the document PDF (same builder as the download → byte-identical)
      const doc = buildInvoicePdf(pdfObj)
      if (doc) fd.append("files[]", doc.output("blob"), `${current.number ?? current.payment_reference}-${label}.pdf`)
      // Attach the tracking QR image (the branded email also carries the tracking link)
      if (current.track_url) {
        const qrDataUrl = await QRCode.toDataURL(current.track_url, { width: 600, margin: 2, errorCorrectionLevel: "M" })
        const qrBlob = await (await fetch(qrDataUrl)).blob()
        fd.append("files[]", qrBlob, `${current.job_reference || "job"}-tracking-qr.png`)
      }
      await apiForm("/invoices/email", fd)
      toast.success(`Emailed to ${emailTo.trim()} with the ${label.toLowerCase()} + tracking attached`); setEmailOpen(false); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Email failed") } finally { setEmailBusy(false) }
  }
  // No email / hand-over: finalise + mark sent WITHOUT emailing, so there's no bounce.
  async function issueNoEmail() {
    if (!inv) return
    if (!(await confirmDialog({
      title: `Issue this ${label.toLowerCase()} without emailing?`,
      body: "It'll be numbered and marked as sent so you can print or hand it over.",
      confirmText: "Issue",
    }))) return
    setEmailBusy(true)
    try {
      if (isDraft) await api("/invoices/update", { method: "POST", body: { id: inv.id, vat_rate: vatRate, lines } })
      const r = await api<{ number: string }>("/invoices/send", { method: "POST", body: { id: inv.id } })
      toast.success(`${label} ${r.number} issued (not emailed)`); setEmailOpen(false); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't issue") } finally { setEmailBusy(false) }
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
    if (!inv || !(await confirmDialog({ title: `Void this ${label.toLowerCase()}?`, confirmText: "Void", danger: true }))) return
    await api("/invoices/void", { method: "POST", body: { id: inv.id } })
    toast.success("Voided"); load()
  }

  // Quote accepted → server numbers + marks it accepted (no send/email needed) and creates a
  // DRAFT invoice; jump to it. For phone/in-person deals or customers with no email.
  async function accept() {
    if (!inv) return
    if (!(await confirmDialog({
      title: "Mark this quote as accepted?",
      body: "Use this when the customer has agreed — in person, by phone, or when they have no email. The quote is numbered and recorded (no need to email it first), and a draft invoice is started for any extra work or price changes.",
      confirmText: "Mark accepted",
    }))) return
    setBusy(true)
    try {
      const r = await api<{ invoice_id: number; quote_number: string }>("/invoices/accept", { method: "POST", body: { id: inv.id } })
      toast.success(`Quote ${r.quote_number ?? ""} accepted — draft invoice created`.replace("  ", " "))
      if (r.invoice_id) navigate(`/ego/invoices/detail?id=${r.invoice_id}`); else load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") } finally { setBusy(false) }
  }
  async function decline() {
    if (!inv || !(await confirmDialog({ title: "Mark this quote as declined?", body: "No invoice will be created.", confirmText: "Decline", danger: true }))) return
    setBusy(true)
    try { await api("/invoices/decline", { method: "POST", body: { id: inv.id } }); toast.success("Quote declined"); await load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") } finally { setBusy(false) }
  }
  async function unpay() {
    if (!inv || !(await confirmDialog({
      title: "Undo the payment?",
      body: "This removes the recorded payment(s), returns the invoice to unpaid, and reopens the job if this had closed it.",
      confirmText: "Undo payment",
      danger: true,
    }))) return
    setBusy(true)
    try { await api("/invoices/unpay", { method: "POST", body: { id: inv.id } }); toast.success("Payment reversed"); await load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") } finally { setBusy(false) }
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
    if (!inv || !(await confirmDialog({ title: `Delete this ${label.toLowerCase()}?`, body: "This can be recovered.", confirmText: "Delete", danger: true }))) return
    try { await api("/invoices/delete", { method: "POST", body: { id: inv.id } }); toast.success(`${label} deleted`); window.history.back() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed") }
  }

  if (loading) return <DetailSkeleton />
  if (!inv) return <div className="p-6 text-muted-foreground">Not found.</div>
  const co = inv.company
  const paidSoFar = (inv.payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const outstanding = Math.max(0, Number(inv.total) - paidSoFar)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to={inv.kind === "quote" ? "/ego/quotes" : "/ego/invoices"}><ArrowLeft /> {label}s</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {isEditable && <Button variant="outline" onClick={save} disabled={busy}>{isDraft ? "Save draft" : "Save changes"}</Button>}

          {/* Primary contextual action — one filled button, driven by state */}
          {isDraft && <Button onClick={send} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>}
          {inv.kind === "quote" && !["void", "declined", "accepted", "paid"].includes(inv.status) && (
            <Button onClick={accept} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Accept → invoice</Button>
          )}
          {inv.kind === "invoice" && (inv.status === "sent" || inv.status === "overdue") && (
            <Button onClick={() => setPayOpen(true)}><BadgePoundSterling /> Mark paid</Button>
          )}

          {/* Email stays visible — the most common day-to-day action */}
          <Button variant="outline" onClick={openEmail} disabled={busy}><Mail /> Email</Button>

          {/* Everything secondary + destructive lives behind one overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={previewPdf}><Eye /> Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={downloadPdf}><Download /> Download PDF</DropdownMenuItem>
              {inv.kind === "quote" && !["void", "declined", "accepted", "paid"].includes(inv.status) && (
                <DropdownMenuItem onClick={decline}><Ban /> Decline quote</DropdownMenuItem>
              )}
              {inv.kind === "invoice" && (inv.status === "sent" || inv.status === "overdue") && (
                <DropdownMenuItem onClick={remind}><Mail /> Send reminder</DropdownMenuItem>
              )}
              {inv.kind === "invoice" && inv.status === "paid" && atLeast(user?.role, "manager") && (
                <DropdownMenuItem onClick={unpay}><Undo2 /> Undo payment</DropdownMenuItem>
              )}
              {((inv.status !== "paid" && inv.status !== "void") || atLeast(user?.role, "manager")) && <DropdownMenuSeparator />}
              {inv.status !== "paid" && inv.status !== "void" && (
                <DropdownMenuItem onClick={voidDoc} className="text-destructive focus:text-destructive"><Ban /> Void</DropdownMenuItem>
              )}
              {atLeast(user?.role, "manager") && (
                <DropdownMenuItem onClick={deleteDoc} className="text-destructive focus:text-destructive"><Trash2 /> Delete</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                  {isEditable && <th className="w-10 p-2" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">
                      {isEditable ? <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Item" className="h-8" /> : l.description}
                    </td>
                    <td className="p-2 text-right">
                      {isEditable ? <Input type="number" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className="h-8 text-right" /> : Number(l.quantity)}
                    </td>
                    <td className="p-2 text-right">
                      {isEditable ? <Input type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} className="h-8 text-right" /> : gbp(Number(l.unit_price))}
                    </td>
                    <td className="p-2 text-right font-mono">{gbp(totals.lines[i]?.line_total ?? 0)}</td>
                    {isEditable && (
                      <td className="p-2 text-right">
                        {lines.length > 1 && <button onClick={() => delLine(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditable && (
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
                <span className="text-muted-foreground">VAT{isEditable ? "" : ` (${vatRate}%)`}</span>
                {isEditable ? (
                  <div className="flex items-center gap-1">
                    <Input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="h-7 w-16 text-right" />%
                  </div>
                ) : <span className="font-mono">{gbp(totals.vat_amount)}</span>}
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-semibold"><span>Total</span><span className="font-mono">{gbp(totals.total)}</span></div>
              {inv.kind === "invoice" && paidSoFar > 0 && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Paid</span><span className="font-mono">−{gbp(paidSoFar)}</span></div>
                  <div className="flex justify-between border-t pt-1.5 text-base font-semibold"><span>Balance</span><span className="font-mono">{gbp(outstanding)}</span></div>
                </>
              )}
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

      <PaymentDialog invoiceId={inv.id} total={Number(inv.total)} outstanding={outstanding} open={payOpen} onOpenChange={setPayOpen} onDone={load} />

      {/* Email preview — see exactly what goes out (and to whom) before sending */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Email {label.toLowerCase()}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="name@example.com" />
              {!inv.customer_email && <p className="text-xs text-muted-foreground">This customer has no saved email — type one, or issue without emailing.</p>}
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Preview — what gets sent</p>
              <p className="font-medium">Subject: {label} {inv.number ?? "(number assigned on send)"} from {co.company_name}</p>
              <div className="mt-3 space-y-2 text-muted-foreground">
                <p>Hi {inv.customer_name},</p>
                <p>Please find your <span className="font-medium text-foreground">{label} {inv.number ?? ""}</span> for <span className="font-medium text-foreground">{gbp(Number(inv.total))}</span>.</p>
                {inv.kind === "invoice" && (co.bank_account_name || co.bank_sort_code || co.bank_account_number) && (
                  <p className="rounded bg-background p-2 text-xs">
                    Pay by bank transfer — {[co.bank_account_name, co.bank_sort_code && `Sort ${co.bank_sort_code}`, co.bank_account_number && `Acc ${co.bank_account_number}`].filter(Boolean).join(" · ")}<br />
                    Payment reference: <span className="font-mono">{inv.payment_reference}</span>
                  </p>
                )}
                <p>A live job-tracking link is included.</p>
                <p className="text-foreground">📎 Attached: the {label.toLowerCase()} PDF + a tracking QR code.</p>
                <p>Thank you, {co.company_name}</p>
              </div>
            </div>
            {inv.kind === "invoice" && isDraft && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Sending will finalise this invoice and assign its number.</p>
            )}
            <p className="text-xs text-muted-foreground">Need to change amounts or lines? Close this and edit the {label.toLowerCase()} first — it's editable, then email.</p>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={issueNoEmail} disabled={emailBusy}>Issue without emailing</Button>
            <Button onClick={sendEmail} disabled={emailBusy}>{emailBusy ? <Loader2 className="animate-spin" /> : <Mail />} Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
