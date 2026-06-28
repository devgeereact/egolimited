import { describe, it, expect } from "vitest"
import { canTransition, allowedTargets, JOB_TRANSITIONS } from "@/lib/jobStatus"

describe("job status state machine", () => {
  it("allows valid admin transitions", () => {
    expect(canTransition("new", "scheduled", "office")).toBe(true)
    expect(canTransition("scheduled", "en_route", "office")).toBe(true)
    expect(canTransition("completed", "invoiced", "office")).toBe(true)
    expect(canTransition("invoiced", "paid", "office")).toBe(true)
    expect(canTransition("paid", "closed", "office")).toBe(true)
  })

  it("rejects invalid transitions for everyone", () => {
    expect(canTransition("new", "completed", "office")).toBe(false)
    expect(canTransition("new", "paid", "office")).toBe(false)
    expect(canTransition("closed", "new", "office")).toBe(false)
    expect(canTransition("cancelled", "scheduled", "office")).toBe(false)
  })

  it("limits engineers to the field chain (+ on_hold)", () => {
    expect(canTransition("scheduled", "en_route", "engineer")).toBe(true)
    expect(canTransition("en_route", "on_site", "engineer")).toBe(true)
    expect(canTransition("on_site", "completed", "engineer")).toBe(true)
    expect(canTransition("on_site", "on_hold", "engineer")).toBe(true)
    expect(canTransition("on_hold", "on_site", "engineer")).toBe(true)
  })

  it("blocks engineers from admin-only transitions", () => {
    expect(canTransition("new", "scheduled", "engineer")).toBe(false) // scheduling
    expect(canTransition("new", "cancelled", "engineer")).toBe(false) // cancelling
    expect(canTransition("scheduled", "cancelled", "engineer")).toBe(false)
    expect(canTransition("completed", "invoiced", "engineer")).toBe(false) // money
    expect(canTransition("invoiced", "paid", "engineer")).toBe(false)
  })

  it("allowedTargets reflects role", () => {
    expect(allowedTargets("on_site", "engineer").sort()).toEqual(["completed", "on_hold"])
    expect(allowedTargets("new", "engineer")).toEqual([])
    expect(allowedTargets("new", "office").sort()).toEqual(["cancelled", "scheduled"])
  })

  it("terminal states have no transitions", () => {
    expect(JOB_TRANSITIONS.closed).toEqual([])
    expect(JOB_TRANSITIONS.cancelled).toEqual([])
  })
})
