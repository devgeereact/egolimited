import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type Props = { children: React.ReactNode; label?: string }
type State = { error: Error | null }

/**
 * The recovery screen the user actually sees after a crash. Shared by BOTH error paths so a
 * failure always looks like our product and always offers a way out:
 *   - ErrorBoundary (below)  — a React class boundary, the nearest one wins
 *   - ErrorPage              — react-router's `errorElement`
 *
 * The reset path is a full reload, not a state reset: after an unknown crash the app's
 * in-memory state is not trustworthy.
 */
export function ErrorFallback({ message }: { message?: string }) {
  return (
    <div role="alert" className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This screen hit an error and couldn&apos;t finish loading. Your data is safe — nothing was saved.
        </p>
        {message ? (
          <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {message}
          </pre>
        ) : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Reload
          </Button>
          <Button variant="outline" onClick={() => { window.location.href = "/app/" }}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Catches render/lifecycle crashes below it, so a thrown error can't unmount the tree and
 * leave a white screen with no way back (which has shipped to production twice — 2026-07-08).
 *
 * IMPORTANT — why this exists ALONGSIDE the route `errorElement`: react-router installs its
 * own error boundary inside <RouterProvider>, and it DOES catch render errors, not just
 * loader/action ones. Because React picks the *nearest* boundary, react-router's would always
 * win over one placed above the router — and it replaces the entire route element, taking the
 * sidebar and nav with it. Mounting this inside the layouts (wrapping <Outlet/>) puts a
 * boundary NEARER than react-router's, so a page crash is contained to the page and the shell
 * survives. Verified by forcing a throw, 2026-07-12.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Console first — it is the one sink that always exists, incl. on a customer's phone
    // with devtools attached. Server-side reporting lands in Phase 1 (/client-error).
    console.error(`[ego] render crash${this.props.label ? ` in ${this.props.label}` : ""}`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <ErrorFallback message={this.state.error.message} />
  }
}
