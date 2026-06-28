import { describe, it, expect } from "vitest"
import { computeTotals, formatDocNumber } from "@/lib/invoicing"

describe("invoice totals + VAT", () => {
  it("computes line totals, subtotal, 20% VAT and grand total", () => {
    const r = computeTotals(
      [
        { description: "Labour", quantity: 2, unit_price: 50 },
        { description: "Parts", quantity: 1, unit_price: 80 },
      ],
      20
    )
    expect(r.lines[0].line_total).toBe(100)
    expect(r.lines[1].line_total).toBe(80)
    expect(r.subtotal).toBe(180)
    expect(r.vat_amount).toBe(36)
    expect(r.total).toBe(216)
  })

  it("rounds money to 2dp correctly", () => {
    const r = computeTotals([{ description: "x", quantity: 3, unit_price: 9.99 }], 20)
    expect(r.subtotal).toBe(29.97)
    expect(r.vat_amount).toBe(5.99) // 5.994 -> 5.99
    expect(r.total).toBe(35.96)
  })

  it("zero VAT", () => {
    const r = computeTotals([{ description: "x", quantity: 1, unit_price: 100 }], 0)
    expect(r.vat_amount).toBe(0)
    expect(r.total).toBe(100)
  })

  it("handles string inputs from form fields", () => {
    const r = computeTotals([{ description: "x", quantity: "2", unit_price: "12.50" }], 20)
    expect(r.subtotal).toBe(25)
    expect(r.total).toBe(30)
  })

  it("empty lines = zero", () => {
    const r = computeTotals([], 20)
    expect(r.subtotal).toBe(0)
    expect(r.total).toBe(0)
  })
})

describe("document numbering format", () => {
  it("zero-pads to 4 digits with prefix", () => {
    expect(formatDocNumber("INV-", 1)).toBe("INV-0001")
    expect(formatDocNumber("INV-", 42)).toBe("INV-0042")
    expect(formatDocNumber("QUO-", 7)).toBe("QUO-0007")
    expect(formatDocNumber("INV-", 12345)).toBe("INV-12345")
  })
})
