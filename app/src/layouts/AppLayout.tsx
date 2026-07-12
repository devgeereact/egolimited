import { Outlet, useLocation } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationDropdown } from "@/components/notification-dropdown"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { GlobalSearch } from "@/components/global-search"

import Footer from "@/layouts/Footer"

import { Suspense, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserDropdown } from "@/components/UserDropdown"
import { ConfirmHost } from "@/components/ego/confirm"
import ErrorBoundary from "@/components/ego/ErrorBoundary"
import { useAuth } from "@/store/auth.store"

export default function AppLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState(false)
  const { pathname } = useLocation()

  // Load the signed-in user for the WHOLE shell (nav + header), not just guarded
  // routes. Without this, an unmatched URL (a stale link, an old bookmark, a refresh
  // on the 404 page) renders AppLayout with no user → empty sidebar + broken shell,
  // because only the route guards used to trigger the /auth/me probe.
  const { status, loadMe } = useAuth()
  useEffect(() => { if (status === "loading") void loadMe() }, [status, loadMe])

  const isExpanded = open || hovered

  // Handle header background on scroll
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setOpen(window.innerWidth >= 1024)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])


  return (
    <SidebarProvider open={isExpanded} onOpenChange={setOpen}>
      <AppSidebar onHoverChange={setHovered} />

      <SidebarInset>
        {/* HEADER */}
        <header
                className={cn(
                    "px-6 sticky top-0 z-40 flex h-16 w-full shrink-0 items-center gap-2 transition-all duration-200 border-b",
                    scrolled
                    ? "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md"
                    : "bg-transparent"
                )}
              >
              <div className="flex items-center gap-1">
                <SidebarTrigger
                  className="-ml-1 rounded-full h-10 w-10 [&_svg]:!size-5 transition-colors"
                />
              </div>

                <div className="ml-auto">
                    <div className="flex items-center gap-1">
                        <GlobalSearch />
                        <ThemeToggle />
                        <NotificationDropdown />
                        <UserDropdown />
                    </div>
                </div>
              </header>

        {/* PAGE CONTENT
            Keyed on the pathname so a crashed page's boundary resets when the user navigates
            away — otherwise the error state would persist across every subsequent route.
            The boundary sits INSIDE <main> so the sidebar and header survive a page crash. */}
        <main className="flex-1 p-6">
          <ErrorBoundary key={pathname} label={pathname}>
            <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <Footer />
      </SidebarInset>
      <ConfirmHost />
    </SidebarProvider>
  )
}
