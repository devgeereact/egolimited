import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import { computeTotals, gbp } from "@/lib/invoicing"

// EGO brand palette for documents — matches the landing Stone & Ember system.
const EMBER: [number, number, number] = [239, 159, 39] // #EF9F27 accent
const INK: [number, number, number] = [23, 24, 22] // #171816 near-black
const MUTE: [number, number, number] = [110, 110, 104]
const STONE: [number, number, number] = [247, 245, 239] // warm row stripe

export interface InvoiceDocLine {
  description: string
  quantity: number | string
  unit_price: number | string
  line_total?: number
}

export interface InvoiceDoc {
  kind: "quote" | "invoice"
  number: string | null
  payment_reference: string
  issue_date: string | null
  due_date: string | null
  vat_rate: string | number
  customer_name: string
  customer_email: string | null
  customer_address: { line1?: string; city?: string; postcode?: string } | null
  job_reference: string
  job_title?: string
  lines: InvoiceDocLine[]
  company: {
    company_name: string
    address: string | null
    phone: string | null
    email: string | null
    vat_number: string | null
    bank_account_name: string | null
    bank_sort_code: string | null
    bank_account_number: string | null
  }
}

// Render an address string as clean lines (no "Address/City/Postcode" labels):
// split on commas/newlines and lift a trailing UK postcode onto its own line.
export function addressLines(addr?: string | null): string[] {
  if (!addr) return []
  const parts = addr.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    const m = p.match(/^(.*?)[\s,]*([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i)
    if (m && m[1].trim()) {
      out.push(m[1].trim())
      out.push(m[2].toUpperCase())
    } else out.push(p)
  }
  return out
}

/**
 * Build the EGO-branded PDF for a quote/invoice. One source of truth shared by
 * the admin detail screen and the customer portal download, so what staff see
 * is exactly what the customer gets.
 */
export function buildInvoicePdf(inv: InvoiceDoc): jsPDF {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const co = inv.company
  const vatRate = Number(inv.vat_rate)
  const totals = computeTotals(inv.lines, vatRate)
  const label = inv.kind === "quote" ? "Quote" : "Invoice"

  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const L = 14
  const R = pageW - 14

  // Watermark — faint EGO LIMITED across the page, makes the document
  // unmistakably ours (and harder to pass off as a forgery).
  doc.saveGraphicsState()
  doc.setGState(new (doc as any).GState({ opacity: 0.05 }))
  doc.setFont("helvetica", "bold"); doc.setFontSize(60); doc.setTextColor(...INK)
  doc.text("EGO LIMITED", pageW / 2, pageH / 2 + 30, { align: "center", angle: 32 })
  doc.restoreGraphicsState()

  // Header — ember wordmark + clean company block (no field labels).
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...EMBER)
  doc.text(co.company_name || "EGO LTD", L, 22)
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTE)
  doc.text(
    [...addressLines(co.address), co.phone ? `Tel: ${co.phone}` : "", co.email ? `Email: ${co.email}` : "", co.vat_number ? `VAT ${co.vat_number}` : ""].filter(Boolean),
    L, 30,
  )

  // Document title + meta (right). Job ref lives in "Bill to" only — no dupe.
  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(...INK)
  doc.text(label.toUpperCase(), R, 22, { align: "right" })
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTE)
  doc.text(
    [inv.number ?? "(draft)", inv.issue_date ? `Issued: ${inv.issue_date}` : "", inv.due_date ? `Due: ${inv.due_date}` : ""].filter(Boolean),
    R, 30, { align: "right" },
  )

  // Ember hairline under the header (clears the multi-line company block).
  doc.setDrawColor(...EMBER); doc.setLineWidth(0.8); doc.line(L, 56, R, 56)

  // Bill to — clean lines, plus the job reference once, here only.
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK)
  doc.text("Bill to", L, 67)
  doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTE); doc.setFontSize(10)
  doc.text(
    [inv.customer_name, inv.customer_address?.line1, inv.customer_address?.city, inv.customer_address?.postcode, inv.customer_email].filter(Boolean) as string[],
    L, 73,
  )
  if (inv.job_reference) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...INK)
    doc.text(`Job ${inv.job_reference}`, R, 67, { align: "right" })
  }

  // Items.
  autoTable(doc, {
    startY: 100,
    head: [["Description", "Qty", "Unit", "Total"]],
    body: totals.lines.map((l) => [l.description, String(l.quantity), gbp(l.unit_price), gbp(l.line_total)]),
    theme: "striped",
    headStyles: { fillColor: EMBER, textColor: INK, fontStyle: "bold" },
    bodyStyles: { textColor: INK },
    alternateRowStyles: { fillColor: STONE },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: L, right: 14 },
  })

  let y = (doc as any).lastAutoTable.finalY + 10
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTE)
  doc.text(`Subtotal: ${gbp(totals.subtotal)}`, R, y, { align: "right" }); y += 6
  doc.text(`VAT (${vatRate}%): ${gbp(totals.vat_amount)}`, R, y, { align: "right" }); y += 8
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...INK)
  doc.text(`Total: ${gbp(totals.total)}`, R, y, { align: "right" }); y += 14

  // Pay-by-bank — ember panel at 0.6 so it stands out (invoices only).
  const hasBank = co.bank_account_name || co.bank_sort_code || co.bank_account_number
  if (inv.kind === "invoice" && hasBank) {
    const ph = 38
    doc.saveGraphicsState()
    doc.setGState(new (doc as any).GState({ opacity: 0.6 }))
    doc.setFillColor(...EMBER); doc.roundedRect(L, y, R - L, ph, 3, 3, "F")
    doc.restoreGraphicsState()
    doc.setDrawColor(...EMBER); doc.setLineWidth(0.5); doc.roundedRect(L, y, R - L, ph, 3, 3, "S")
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK)
    doc.text("Pay by bank transfer", L + 6, y + 9)
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK)
    doc.text(
      [
        co.bank_account_name ? `Account: ${co.bank_account_name}` : "",
        co.bank_sort_code ? `Sort code: ${co.bank_sort_code}` : "",
        co.bank_account_number ? `Account no: ${co.bank_account_number}` : "",
        `Payment reference: ${inv.payment_reference}`,
      ].filter(Boolean),
      L + 6, y + 17,
    )
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return doc
}
