// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import ErrorBoundary from "./ErrorBoundary"

function Boom(): never {
  throw new Error("kaboom")
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error to console.error by design; silence it so a PASSING
    // test doesn't print a stack trace that looks like a failure.
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  // Explicit: testing-library only auto-cleans when vitest runs with `globals: true`,
  // which this project doesn't. Without it, renders stack up in document.body.
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    )
    expect(screen.getByText("all good")).toBeTruthy()
  })

  it("catches a render crash and shows the recovery UI instead of a white screen", () => {
    render(
      <ErrorBoundary label="test page">
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByRole("alert")).toBeTruthy()
    expect(screen.getByText("Something went wrong")).toBeTruthy()
    // The user must always have a way out — this is the whole point of the boundary.
    expect(screen.getByRole("button", { name: /reload/i })).toBeTruthy()
  })

  it("surfaces the error message so a user can quote it to support", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText("kaboom")).toBeTruthy()
  })

  it("contains the crash — siblings outside the boundary keep rendering", () => {
    render(
      <div>
        <nav>sidebar</nav>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </div>
    )
    // This is what keeps the app shell (sidebar / engineer tab bar) alive when one page dies.
    expect(screen.getByText("sidebar")).toBeTruthy()
    expect(screen.getByText("Something went wrong")).toBeTruthy()
  })
})
