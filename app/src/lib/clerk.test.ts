import { describe, it, expect } from "vitest"
import { clerkToken, setClerkState } from "@/lib/clerk"

const base = { getToken: async () => "tok", signOut: async () => {} }

describe("clerkToken", () => {
  it("is unavailable (not signed-out) when Clerk never loads, e.g. offline", async () => {
    setClerkState({ ...base, loaded: false, signedIn: false })
    expect(await clerkToken(20)).toEqual({ kind: "unavailable" })
  })

  it("reports signed-out once Clerk has loaded with nobody signed in", async () => {
    setClerkState({ ...base, loaded: true, signedIn: false })
    expect(await clerkToken(20)).toEqual({ kind: "signed-out" })
  })

  it("returns a fresh token when signed in", async () => {
    setClerkState({ ...base, loaded: true, signedIn: true })
    expect(await clerkToken(20)).toEqual({ kind: "token", token: "tok" })
  })

  it("treats a failing or empty token fetch as unavailable", async () => {
    setClerkState({ ...base, loaded: true, signedIn: true, getToken: async () => { throw new Error("offline") } })
    expect(await clerkToken(20)).toEqual({ kind: "unavailable" })
    setClerkState({ ...base, loaded: true, signedIn: true, getToken: async () => null })
    expect(await clerkToken(20)).toEqual({ kind: "unavailable" })
  })

  it("waits for a late load and then answers", async () => {
    setClerkState({ ...base, loaded: false, signedIn: false })
    const p = clerkToken(500)
    setTimeout(() => setClerkState({ ...base, loaded: true, signedIn: true }), 10)
    expect(await p).toEqual({ kind: "token", token: "tok" })
  })
})
