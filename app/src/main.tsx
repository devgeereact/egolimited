import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"

import { QueryClientProvider } from "@tanstack/react-query"

import ErrorBoundary from "@/components/ego/ErrorBoundary"
import UIThemeProvider from "@/providers/ui-theme-provider"

import { queryClient } from "@/lib/query"
import { startOutbox } from "@/lib/outbox"
import { router } from "@/routes"
import "@/index.css"

// Drain any work an engineer queued while offline, from app start, on ANY screen. This lives here
// rather than in EngineerLayout because the queue must sync even if they never navigate back to a
// job — e.g. they reopen the app on the Today tab, or land on the login screen.
startOutbox()

/**
 * Service worker registration — and the escape hatch from a stale one.
 *
 * THE TRAP THIS FIXES. The first version of sw.js was CACHE-FIRST for navigations. That makes a bad
 * service worker IMMORTAL: it serves the cached index.html, which loads the cached old JS, which
 * re-registers the old worker — the network is never touched, so a new deploy can never reach the
 * user. The owner sat on a days-old build through repeated hard reloads (2026-07-13), and every
 * engineer with the old worker on their phone was stuck the same way. A reload cannot fix it,
 * because the worker answers before the network is asked.
 *
 * So: when a NEW worker takes over, we reload the page once, automatically. `controllerchange`
 * fires exactly then. The one-shot guard stops a reload loop if anything else claims the page.
 */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  let reloading = false
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener("load", () => {
    // The ?v= is part of the registration URL — bump it whenever sw.js changes, so the browser
    // fetches a URL neither it nor Cloudflare's edge has ever cached (root cause of the 2026-07-08
    // white-screen: sw.js sat at the edge for ~9 days unrevalidated).
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=4`)
      .then((reg) => {
        // Don't wait for every tab to close before a fix reaches the user.
        reg.addEventListener("updatefound", () => {
          reg.installing?.addEventListener("statechange", function () {
            if (this.state === "installed" && navigator.serviceWorker.controller) this.postMessage?.("skip-waiting")
          })
        })
        void reg.update()
      })
      .catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="classic-light"
      enableSystem
      disableTransitionOnChange
    >
      
      <UIThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary label="app root">
            <RouterProvider router={router} />
          </ErrorBoundary>
        </QueryClientProvider>
      </UIThemeProvider>
    </ThemeProvider>
    <Toaster position="top-right" richColors closeButton />
  </React.StrictMode>
)
