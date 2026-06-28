/**
 * EGO LIMITED — invoicing core (client mirror of api/lib/invoicing.php).
 * Live totals/VAT for the editor; the SERVER recomputes + allocates the
 * gap-free number on save/send. Keep in sync with the PHP module.
 */
export interface LineInput {
  description: string
  quantity: number | string
  unit_price: number | string
}

export interface LineComputed {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function computeTotals(lines: LineInput[], vatRate: number) {
  let subtotal = 0
  const out: LineComputed[] = lines.map((l) => {
    const quantity = r2(Number(l.quantity) || 0)
    const unit_price = r2(Number(l.unit_price) || 0)
    const line_total = r2(quantity * unit_price)
    subtotal += line_total
    return { description: l.description, quantity, unit_price, line_total }
  })
  subtotal = r2(subtotal)
  const vat_amount = r2((subtotal * (Number(vatRate) || 0)) / 100)
  return { subtotal, vat_amount, total: r2(subtotal + vat_amount), lines: out }
}

/** Format the next number for display previews (server is authoritative). */
export function formatDocNumber(prefix: string, next: number): string {
  return `${prefix}${String(next).padStart(4, "0")}`
}

export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)
