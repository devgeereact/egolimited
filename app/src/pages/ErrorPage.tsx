import { isRouteErrorResponse, useRouteError } from "react-router-dom"

import { ErrorFallback } from "@/components/ego/ErrorBoundary"

/**
 * react-router's `errorElement`. It catches BOTH loader/action failures and render crashes in
 * any route subtree that has no nearer React boundary — without it, react-router falls back to
 * its own unbranded "Unexpected Application Error!" screen with a raw stack trace on it.
 * Shares its UI with ErrorBoundary so every failure path looks the same to the user.
 */
export default function ErrorPage() {
  const error = useRouteError()

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : undefined

  console.error("[ego] route error", error)

  return <ErrorFallback message={message} />
}
