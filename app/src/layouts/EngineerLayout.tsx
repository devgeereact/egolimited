import { Suspense, useEffect, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { CalendarClock, ListChecks, CircleUserRound, Wrench, WifiOff, Loader2, RefreshCw, TriangleAlert } from "lucide-react"

import ErrorBoundary from "@/components/ego/ErrorBoundary"
import { subscribe } from "@/lib/outbox"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/ego/engineer/today", label: "Today", icon: CalendarClock },
  { to: "/ego/engineer/jobs", label: "My Jobs", icon: ListChecks },
  { to: "/ego/engineer/profile", label: "Profile", icon: CircleUserRound },
]

/** Mobile-first shell for the engineer PWA — top brand bar + bottom tab bar. */
export default function EngineerLayout() {
  const { pathname } = useLocation()
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [outbox, setOutbox] = useState({ pending: 0, syncing: false, failed: 0 })

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off) }
  }, [])

  // The outbox itself is started once in main.tsx (it must drain on any screen). Here we only
  // subscribe, so the banner can tell the engineer what is still waiting to sync.
  useEffect(() => subscribe(setOutbox), [])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background md:max-w-2xl lg:max-w-3xl">
      {/* Brand bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="size-4" />
        </div>
        <span className="font-semibold tracking-tight">EGO LIMITED</span>
        <span className="ml-auto text-xs text-muted-foreground">Engineer</span>
      </header>

      {/* Status strip. The old version just said "Offline" — a statement of failure that told the
          engineer nothing about whether their work survived. It now answers the only question they
          actually have: is what I just did safe? */}
      {!online && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 bg-amber-500/15 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
        >
          <WifiOff className="size-3.5" aria-hidden="true" />
          {outbox.pending > 0
            ? `Offline — ${outbox.pending} change${outbox.pending === 1 ? "" : "s"} saved on your phone, will sync automatically`
            : "Offline — your work is saved on your phone and will sync when you're back"}
        </div>
      )}

      {online && outbox.pending > 0 && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 bg-primary/10 py-1.5 text-xs font-medium text-primary"
        >
          <RefreshCw className={cn("size-3.5", outbox.syncing && "animate-spin")} aria-hidden="true" />
          Syncing {outbox.pending} change{outbox.pending === 1 ? "" : "s"}…
        </div>
      )}

      {/* A change the SERVER refused (e.g. the office moved the job on while they were underground)
          can never succeed on retry. Say so, rather than let it vanish. */}
      {outbox.failed > 0 && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 bg-destructive/10 py-1.5 text-xs font-medium text-destructive"
        >
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          {outbox.failed} change{outbox.failed === 1 ? "" : "s"} couldn&apos;t be saved — check with the office
        </div>
      )}

      {/* Content — boundary inside <main> so the bottom tab bar survives a page crash and the
          engineer can still navigate. Keyed on pathname so it resets when they move on. */}
      <main className="flex-1 pb-20">
        <ErrorBoundary key={pathname} label={pathname}>
          <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md items-stretch border-t bg-background/95 backdrop-blur md:max-w-2xl lg:max-w-3xl">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <t.icon className="size-5" />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
