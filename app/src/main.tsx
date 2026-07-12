import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"

import { QueryClientProvider } from "@tanstack/react-query"

import ErrorBoundary from "@/components/ego/ErrorBoundary"
import UIThemeProvider from "@/providers/ui-theme-provider"

import { queryClient } from "@/lib/query"
import { router } from "@/routes"
import "@/index.css"

// Register the engineer-PWA service worker (prod only; dev path 404s harmlessly).
// The ?v= query is part of the registration URL — bump it whenever sw.js's logic
// changes so this deploy is fetched as a URL neither the browser nor Cloudflare's
// edge has ever cached, guaranteeing every client picks up the fix immediately
// instead of waiting out whatever cache TTL was in effect (root cause of the
// 2026-07-08 white-screen: sw.js sat at Cloudflare's edge for ~9 days unrevalidated).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=2`).catch(() => {})
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
