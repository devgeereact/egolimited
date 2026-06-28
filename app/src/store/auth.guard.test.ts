import { describe, it, expect } from "vitest"
import { canAccess, atLeast, isOffice } from "@/lib/roles"

// The SERVER is the real boundary (PHP require_role → 403); this asserts the
// client guard mirror used by RequireRole. Hierarchy: founder > manager > office > engineer.
describe("canAccess (role guard)", () => {
  it("higher rank meets a lower minimum", () => {
    expect(canAccess("founder", "office")).toBe(true)
    expect(canAccess("manager", "office")).toBe(true)
    expect(canAccess("office", "office")).toBe(true)
  })

  it("lower rank cannot reach a higher minimum", () => {
    expect(canAccess("office", "manager")).toBe(false)
    expect(canAccess("manager", "founder")).toBe(false)
    expect(canAccess("engineer", "office")).toBe(false)
  })

  it("engineer routes are engineer-exact", () => {
    expect(canAccess("engineer", "engineer")).toBe(true)
    expect(canAccess("founder", "engineer")).toBe(false)
  })

  it("anonymous (no role) is denied everywhere", () => {
    expect(canAccess(null, "office")).toBe(false)
    expect(canAccess(undefined, "engineer")).toBe(false)
  })

  it("isOffice = any non-engineer staff", () => {
    expect(isOffice("founder")).toBe(true)
    expect(isOffice("office")).toBe(true)
    expect(isOffice("engineer")).toBe(false)
    expect(isOffice(null)).toBe(false)
  })

  it("atLeast respects rank order", () => {
    expect(atLeast("founder", "manager")).toBe(true)
    expect(atLeast("office", "manager")).toBe(false)
  })
})
