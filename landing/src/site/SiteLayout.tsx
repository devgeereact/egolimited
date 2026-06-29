import { Suspense, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useTheme } from "next-themes"
import SiteNav from "./components/SiteNav"
import SiteFooter from "./components/SiteFooter"
import { CompanyProvider } from "./CompanyProvider"

export default function SiteLayout() {
  const { pathname } = useLocation()
  const { setTheme } = useTheme()

  // The public brand site is always light — dark mode is a CMS-only affordance.
  // Forcing it here (rather than via a cleanup when the CMS unmounts) keeps the
  // CMS theme toggle working: next-themes' setTheme identity changes on every
  // switch, so an unmount-cleanup that depends on it re-fires on each toggle.
  useEffect(() => {
    setTheme("light")
  }, [setTheme])

  // Scroll to top on route change so each page starts at the hero.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <CompanyProvider>
      <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <SiteNav />
        <main className="flex-1">
          {/* Lazy routes are code-split; this boundary covers the brief load of
              a sub-page chunk. min-h keeps the footer from jumping up. */}
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <Outlet />
          </Suspense>
        </main>
        <SiteFooter />
      </div>
    </CompanyProvider>
  )
}
