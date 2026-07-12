import { describe, expect, it } from "vitest"

import { queryKeyFor } from "./query"

/**
 * These assertions look trivial. They are not: the whole invalidation model rests on them.
 *
 * TanStack matches query keys element by element, so a key of ["/customers?q=bob"] is NOT
 * matched by the prefix ["/customers"] — the strings simply differ. If the querystring stops
 * being its own key segment, then saving a customer silently fails to refresh a *filtered*
 * customer list, and the user sees stale data with no error anywhere. That is the exact class
 * of bug this layer was introduced to remove, so the contract gets pinned here.
 */
describe("queryKeyFor", () => {
  it("keys a plain path as a single segment", () => {
    expect(queryKeyFor("/jobs")).toEqual(["/jobs"])
  })

  it("splits the querystring into its own segment so prefixes match", () => {
    expect(queryKeyFor("/jobs?status=open")).toEqual(["/jobs", "status=open"])
    expect(queryKeyFor("/customers?q=bob&page=2")).toEqual(["/customers", "q=bob&page=2"])
  })

  it("gives every filtered variant the SAME first segment as the collection", () => {
    // This is the property invalidate("/customers") depends on.
    const collection = queryKeyFor("/customers")[0]
    expect(queryKeyFor("/customers?q=bob")[0]).toBe(collection)
    expect(queryKeyFor("/customers?page=3")[0]).toBe(collection)
  })

  it("does not confuse two different collections that share a prefix string", () => {
    // "/invoices" must not be treated as a prefix of "/invoices-archive".
    expect(queryKeyFor("/invoices")[0]).not.toBe(queryKeyFor("/invoices-archive")[0])
  })
})
