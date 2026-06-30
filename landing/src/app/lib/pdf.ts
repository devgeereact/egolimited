import { jsPDF } from "jspdf"
import autoTable, { type RowInput } from "jspdf-autotable"
import { gbp, shortDate } from "./format"
import { company } from "@/site/content"

// Stone & Ember palette — the document should feel like EGO, not a template.
const EMBER: [number, number, number] = [239, 159, 39] // accent #EF9F27
const EMBER_DK: [number, number, number] = [180, 83, 9] // deep ember for text
const STONE: [number, number, number] = [27, 28, 24] // ink #1b1c18
const MUTE: [number, number, number] = [120, 116, 108] // secondary text
const LINE: [number, number, number] = [223, 219, 210] // hairlines
const WASH: [number, number, number] = [244, 242, 235] // panel fill
const DARK: [number, number, number] = [27, 28, 24] // header band
const ON_DARK: [number, number, number] = [243, 241, 234] // text on the band
const ON_DARK_MUTE: [number, number, number] = [168, 164, 154]

// Bank + statutory details printed on the invoice. Configured in Settings
// (Bank & invoice details) and threaded in via `payee`. Blank fields don't print.
export interface Payee {
  accountName?: string
  bankName?: string
  sortCode?: string
  accountNumber?: string
  paymentTerms?: string
  vatNumber?: string
  companyNumber?: string
  registeredOffice?: string
}

const DEFAULT_TERMS = "Payment is due by bank transfer within 14 days of the invoice date."

// Map a flat settings record (settings.php / portal.php) to a Payee — one place
// so the staff invoice and the customer's portal download stay identical.
export function payeeFromSettings(s: Record<string, string> | null | undefined): Payee {
  const g = (k: string) => (s?.[k] ?? "").trim() || undefined
  return {
    accountName: g("bank_account_name"),
    bankName: g("bank_name"),
    sortCode: g("bank_sort_code"),
    accountNumber: g("bank_account_number"),
    paymentTerms: g("payment_terms"),
    vatNumber: g("vat_number"),
    companyNumber: g("company_number"),
    registeredOffice: g("registered_office"),
  }
}

export interface PdfDoc {
  kind: "Quote" | "Invoice"
  number: string
  clientName: string
  date?: string | null
  dueDate?: string | null
  items: { description: string; qty: number; unit_pence: number }[]
  subtotalPence: number
  vatPence?: number
  vatRate?: number
  totalPence: number
  payee?: Payee
}

const M = 40 // page margin

// Tidy a line-item description for printing. Collapses runs of whitespace, and
// repairs "letter-spaced" text (e.g. "A l l   p u r p o s e") that some records
// were saved with — when most space-separated tokens are single characters, runs
// of 2+ spaces are treated as the real word gaps and the single spaces removed.
// Leaves normal descriptions ("Labour, cleaning (2 hours)") untouched.
function cleanDescription(raw: string): string {
  const collapsed = (raw ?? "").replace(/[ \t]+/g, " ").trim()
  const tokens = collapsed.split(" ")
  const singles = tokens.filter((t) => t.length === 1).length
  if (tokens.length >= 6 && singles / tokens.length > 0.7) {
    // Letter-spaced text: real word gaps were 2+ spaces; single spaces are the
    // letter-spacing. Split on the word gaps, strip single spaces inside each word.
    return (raw ?? "")
      .split(/ {2,}/)
      .map((word) => word.replace(/ /g, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  }
  return collapsed
}

// A small letter-spaced uppercase label, e.g. "BILLED TO".
function caption(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  align: "left" | "right" = "left",
  color = MUTE,
): void {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...color)
  doc.setCharSpace(0.8)
  doc.text(text.toUpperCase(), x, y, { align })
  doc.setCharSpace(0)
}

// A quiet, restrained brand mark set low on the page behind the content — a faint
// "E" monogram with the wordmark beneath it, upright and centred. Drawn first, at
// very low opacity, so all content sits cleanly on top. Decorative: wrapped so it
// can never break document generation if GState is unavailable.
function watermark(doc: jsPDF): void {
  try {
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const cx = W / 2
    const cy = H * 0.56
    doc.saveGraphicsState()
    // @ts-expect-error GState is provided by jsPDF at runtime (absent from types).
    doc.setGState(new doc.GState({ opacity: 0.05 }))
    doc.setTextColor(...STONE)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(150)
    doc.text("E", cx, cy, { align: "center", baseline: "middle" })
    doc.setFontSize(15)
    doc.setCharSpace(8)
    doc.text("EGO LTD", cx, cy + 80, { align: "center", baseline: "middle" })
    doc.setCharSpace(0)
    doc.restoreGraphicsState()
  } catch {
    /* watermark is decorative — never let it break the document */
  }
}

// The signature header band: dark stone strip with the ember monogram + wordmark
// on the left and the document title + reference on the right.
function band(doc: jsPDF, W: number, title: string, ref: string): void {
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 98, "F")

  // Monogram tile.
  doc.setFillColor(...EMBER)
  doc.roundedRect(M, 31, 36, 36, 5, 5, "F")
  doc.setTextColor(...STONE)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(19)
  doc.text("E", M + 18, 56, { align: "center" })

  // Wordmark + tagline.
  doc.setTextColor(...ON_DARK)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("EGO LTD", M + 48, 49)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...ON_DARK_MUTE)
  doc.setCharSpace(1.3)
  doc.text("MAINTENANCE DONE PROPERLY", M + 48, 61)
  doc.setCharSpace(0)

  // Document title + reference (right).
  doc.setTextColor(...EMBER)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setCharSpace(2.4)
  doc.text(title.toUpperCase(), W - M, 45, { align: "right" })
  doc.setCharSpace(0)
  doc.setTextColor(...ON_DARK)
  doc.setFontSize(14)
  doc.text(ref, W - M, 64, { align: "right" })
}

// Footer: registered office + statutory numbers + contact, under a hairline.
function footer(doc: jsPDF, W: number, payee?: Payee): void {
  const H = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.75)
  doc.line(M, H - 54, W - M, H - 54)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...MUTE)

  const legal = [
    payee?.registeredOffice && `Registered office: ${payee.registeredOffice}`,
    payee?.companyNumber && `Company No. ${payee.companyNumber}`,
    payee?.vatNumber && `VAT No. ${payee.vatNumber}`,
  ]
    .filter(Boolean)
    .join("   ·   ")
  if (legal) doc.text(legal, M, H - 40)
  doc.text(`${company.email}   ·   ${company.phone}   ·   egolimited.com`, M, H - 28)

  // EGO mark on the right of the footer — quiet brand sign-off.
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(...STONE)
  doc.text("EGO LTD", W - M, H - 28, { align: "right" })
}

// The line-items table: a dark header row over hairline-separated rows. Line
// amounts reconcile to the server subtotal (any rounding residual lands on the
// last line). Returns the table's final Y.
const GRID: [number, number, number] = [196, 192, 182] // table border hairlines
const PAGE: [number, number, number] = [247, 245, 238] // warm cream page

// The fully-bordered line-items table: a dark header row (Description / Qty /
// Price / Subtotal) over a clean grid, padded to a minimum number of rows, with
// Subtotal, Tax (VAT) and a bold Grand Total as footer rows. Line amounts
// reconcile to the server subtotal. Returns the table's final Y.
function ledger(doc: jsPDF, startY: number, d: PdfDoc): number {
  const amounts = d.items.map((it) => Math.round(it.qty * it.unit_pence))
  const sum = amounts.reduce((s, a) => s + a, 0)
  if (amounts.length) amounts[amounts.length - 1] += d.subtotalPence - sum
  const body: RowInput[] = d.items.map((it, i) => [
    cleanDescription(it.description),
    String(it.qty),
    gbp(it.unit_pence),
    gbp(amounts[i]),
  ])
  while (body.length < 6) body.push(["", "", "", ""])

  const isInvoice = d.kind === "Invoice"
  const vatPct = d.vatRate !== undefined ? +(d.vatRate * 100).toFixed(2) : 20
  const foot: RowInput[] = [
    [{ content: "Subtotal", colSpan: 3, styles: { halign: "right" } }, gbp(d.subtotalPence)],
  ]
  if (d.vatPence !== undefined) {
    foot.push([{ content: `Tax (VAT ${vatPct}%)`, colSpan: 3, styles: { halign: "right" } }, gbp(d.vatPence)])
  }
  foot.push([
    { content: isInvoice ? "Grand total" : "Total", colSpan: 3, styles: { halign: "right", fontStyle: "bold", textColor: STONE } },
    { content: gbp(d.totalPence), styles: { fontStyle: "bold", textColor: EMBER_DK } },
  ])

  autoTable(doc, {
    startY,
    head: [["Description", "Qty", "Price", "Subtotal"]],
    body,
    foot,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      textColor: STONE,
      lineColor: GRID,
      lineWidth: 0.6,
      fillColor: PAGE,
      cellPadding: { top: 9, bottom: 9, left: 12, right: 12 },
    },
    headStyles: {
      fillColor: STONE,
      textColor: ON_DARK,
      fontStyle: "bold",
      fontSize: 8.5,
      lineColor: STONE,
    },
    bodyStyles: { minCellHeight: 28 },
    footStyles: { fontSize: 10, textColor: STONE, fillColor: PAGE },
    columnStyles: {
      0: { halign: "left", cellWidth: "auto" },
      1: { halign: "center", cellWidth: 56 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 100 },
    },
    margin: { left: M, right: M },
    // Belt-and-braces: ensure no stray character-spacing from earlier captions
    // ever leaks into a cell's text rendering.
    willDrawCell: (data) => {
      data.doc.setCharSpace(0)
    },
  })
  // @ts-expect-error lastAutoTable is added by the plugin at runtime
  return doc.lastAutoTable?.finalY ?? startY + 200
}

// Invoice / quote: a warm cream page with the EGO logo + big title, a billed-to
// and payment-method pair, a fully-bordered line-items table with Subtotal / Tax
// / Grand Total, a terms + contact footer, and a faint "EGO LTD" wordmark.
function buildDocument(d: PdfDoc): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const isInvoice = d.kind === "Invoice"
  const p = d.payee ?? {}
  const cw = W - 2 * M

  // Warm cream background.
  doc.setFillColor(...PAGE)
  doc.rect(0, 0, W, H, "F")

  // ---- Header: logo (left) + big title (right) --------------------------
  doc.setFillColor(...EMBER)
  doc.roundedRect(M, 42, 40, 40, 7, 7, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(...STONE)
  doc.text("E", M + 20, 69, { align: "center" })
  doc.setFontSize(17)
  doc.text("EGO LTD", M + 52, 58)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTE)
  doc.setCharSpace(1.4)
  doc.text("MAINTENANCE DONE PROPERLY", M + 52, 72)
  doc.setCharSpace(0)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(34)
  doc.setTextColor(...EMBER_DK)
  doc.setCharSpace(1.5)
  doc.text(d.kind.toUpperCase(), W - M, 62, { align: "right" })
  doc.setCharSpace(0)
  doc.setFontSize(12)
  doc.setTextColor(...STONE)
  doc.text(d.number, W - M, 82, { align: "right" })

  // ---- Dates (left) + company address (right) ---------------------------
  const issued = shortDate(d.date) === "—" ? shortDate(new Date().toISOString()) : shortDate(d.date)
  let y = 128
  caption(doc, isInvoice ? "Invoice date" : "Quote date", M, y)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...STONE)
  doc.text(issued, M, y + 16)
  if (isInvoice && d.dueDate) {
    caption(doc, "Due date", M + 150, y)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...EMBER_DK)
    doc.text(shortDate(d.dueDate), M + 150, y + 16)
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  const addr = [...company.address.split(",").map((s) => s.trim()), company.phone]
  addr.forEach((l, i) => doc.text(l, W - M, y + i * 13, { align: "right" }))

  // ---- Bill to (left) + Payment method (right) --------------------------
  y = 196
  caption(doc, "Bill to", M, y)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...STONE)
  doc.text(d.clientName || "—", M, y + 19)

  const hasBank = !!(p.accountName || p.accountNumber || p.sortCode || p.bankName)
  if (isInvoice && hasBank) {
    caption(doc, "Payment method", W - M, y, "right")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...STONE)
    const bank = [
      p.bankName,
      p.accountName,
      p.sortCode && `Sort code ${p.sortCode}`,
      p.accountNumber && `Account ${p.accountNumber}`,
    ].filter(Boolean) as string[]
    bank.forEach((l, i) => doc.text(String(l), W - M, y + 17 + i * 13, { align: "right" }))
  }

  // ---- Line items + totals (fully bordered table) -----------------------
  const fy = ledger(doc, y + (isInvoice && hasBank ? 86 : 52), d)

  // ===== Footer: terms (left) + contact (right) ==========================
  let iy = Math.max(fy + 40, H - 150)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.75)
  doc.line(M, iy, W - M, iy)
  iy += 20

  caption(doc, "Terms & conditions", M, iy)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...MUTE)
  doc.text(doc.splitTextToSize(p.paymentTerms || DEFAULT_TERMS, cw * 0.5) as string[], M, iy + 14)

  caption(doc, "Contact", W - M, iy, "right")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...STONE)
  ;[company.email, company.phone, "egolimited.com"].forEach((l, i) =>
    doc.text(l, W - M, iy + 14 + i * 12, { align: "right" }),
  )

  // ---- Warm sign-off + quiet wordmark + statutory strip -----------------
  // A short, human sign-off centred above the brand mark.
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  doc.text(
    isInvoice ? "Thank you for your business." : "We look forward to working with you.",
    W / 2,
    H - 70,
    { align: "center" },
  )

  // Quiet brand sign-off — a faint, tracked wordmark, restrained so it reads as
  // a watermark rather than a banner.
  try {
    doc.saveGraphicsState()
    // @ts-expect-error GState is provided by jsPDF at runtime (absent from types).
    doc.setGState(new doc.GState({ opacity: 0.16 }))
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(...STONE)
    doc.setCharSpace(7)
    doc.text("EGO LTD", W / 2, H - 47, { align: "center" })
    doc.setCharSpace(0)
    doc.restoreGraphicsState()
  } catch {
    /* wordmark is decorative — never let it break the document */
  }

  // Statutory strip at the very bottom.
  const legal = [
    p.registeredOffice && `Registered office: ${p.registeredOffice}`,
    p.companyNumber && `Company No. ${p.companyNumber}`,
    p.vatNumber && `VAT No. ${p.vatNumber}`,
  ]
    .filter(Boolean)
    .join("   ·   ")
  if (legal) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...MUTE)
    doc.text(legal, W / 2, H - 26, { align: "center" })
  }

  return doc
}

export function pdfFilename(d: PdfDoc): string {
  return `EGO-${d.kind}-${d.number}.pdf`
}
export function documentPdf(d: PdfDoc): void {
  buildDocument(d).save(pdfFilename(d))
}
export function documentPdfBase64(d: PdfDoc): string {
  return buildDocument(d).output("datauristring").split(",")[1] ?? ""
}

// ---- Completion certificate ------------------------------------------------
// A one-page branded record that work was carried out and signed off. Built
// from a completed + signed job; the customer can keep it as proof of works.
export interface CertDoc {
  payee: Payee
  jobNumber?: string | null
  title: string
  clientName: string
  engineer?: string | null
  description?: string | null
  summary?: string | null
  signedBy: string
  signedAt: string
  completedOn?: string | null
}

function buildCertificate(d: CertDoc): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()

  watermark(doc)
  band(doc, W, "Completion Certificate", d.jobNumber || "")

  let y = 150
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(...STONE)
  doc.text("Certificate of completion", M, y)

  y += 20
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...MUTE)
  doc.text(
    "This confirms that the work detailed below has been carried out and signed off.",
    M,
    y,
    { maxWidth: W - 2 * M },
  )

  y += 22
  const panelH = 122
  doc.setFillColor(...WASH)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.75)
  doc.roundedRect(M, y, W - 2 * M, panelH, 6, 6, "FD")

  const rows: [string, string][] = [
    ["Client", d.clientName],
    ["Job", d.jobNumber ? `${d.title}  (${d.jobNumber})` : d.title],
    ["Engineer", d.engineer || "—"],
    ["Completed", d.completedOn ? shortDate(d.completedOn) : shortDate(d.signedAt)],
  ]
  let ry = y + 28
  for (const [label, val] of rows) {
    caption(doc, label, M + 18, ry)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...STONE)
    doc.text(String(val), M + 130, ry, { maxWidth: W - 2 * M - 150 })
    ry += 24
  }
  y += panelH + 26

  if (d.description) {
    caption(doc, "Work carried out", M, y)
    y += 15
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...STONE)
    const lines = doc.splitTextToSize(d.description, W - 2 * M) as string[]
    doc.text(lines, M, y)
    y += lines.length * 13 + 18
  }

  // Plain-English summary of what was done — the bit the customer reads.
  if (d.summary && d.summary.trim()) {
    caption(doc, "Summary", M, y)
    y += 15
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...STONE)
    const sumLines = doc.splitTextToSize(d.summary.trim(), W - 2 * M) as string[]
    doc.text(sumLines, M, y)
    y += sumLines.length * 13 + 18
  }

  doc.setDrawColor(...LINE)
  doc.line(M, y, W - M, y)
  y += 24
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...EMBER_DK)
  doc.text(`Signed off by ${d.signedBy}`, M, y)
  y += 16
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...MUTE)
  doc.text(`on ${shortDate(d.signedAt)}`, M, y)

  footer(doc, W, d.payee)
  return doc
}

export function certificateFilename(d: CertDoc): string {
  return `EGO-Certificate-${d.jobNumber || d.title}.pdf`
}
export function completionCertificatePdf(d: CertDoc): void {
  buildCertificate(d).save(certificateFilename(d))
}

export interface StatementDoc {
  clientName: string
  rows: { number: string; date?: string | null; status: string; totalPence: number }[]
  outstandingPence: number
  payee?: Payee
}

function buildStatement(d: StatementDoc): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()

  watermark(doc)
  band(doc, W, "Statement", shortDate(new Date().toISOString()))

  let y = 134
  caption(doc, "Account", M, y)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...STONE)
  doc.text(d.clientName || "—", M, y + 17)

  // Outstanding hero strip.
  y += 42
  const stripH = 48
  doc.setFillColor(...WASH)
  doc.roundedRect(M, y, W - 2 * M, stripH, 5, 5, "F")
  doc.setFillColor(...EMBER)
  doc.rect(M, y, 3, stripH, "F")
  caption(doc, "Outstanding balance", M + 18, y + 19)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(21)
  doc.setTextColor(...EMBER_DK)
  doc.text(gbp(d.outstandingPence), W - M - 16, y + 31, { align: "right" })

  autoTable(doc, {
    startY: y + stripH + 22,
    head: [["Invoice", "Date", "Status", "Amount"]],
    body: d.rows.map((r) => [r.number, shortDate(r.date ?? null), r.status, gbp(r.totalPence)]),
    theme: "plain",
    headStyles: {
      fillColor: STONE,
      textColor: ON_DARK,
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 7, bottom: 7, left: 10, right: 10 },
    },
    bodyStyles: {
      textColor: STONE,
      fontSize: 9.5,
      cellPadding: { top: 9, bottom: 9, left: 10, right: 10 },
      lineColor: LINE,
      lineWidth: { bottom: 0.5, top: 0, left: 0, right: 0 },
    },
    columnStyles: { 1: { halign: "right" }, 2: { textColor: MUTE }, 3: { halign: "right" } },
    margin: { left: M, right: M },
  })

  footer(doc, W, d.payee)
  return doc
}

export function statementFilename(clientName: string): string {
  return `EGO-Statement-${clientName.replace(/[^a-z0-9]+/gi, "-")}.pdf`
}
export function statementPdf(d: StatementDoc): void {
  buildStatement(d).save(statementFilename(d.clientName))
}
export function statementPdfBase64(d: StatementDoc): string {
  return buildStatement(d).output("datauristring").split(",")[1] ?? ""
}
