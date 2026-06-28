import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import SiteNav from "./components/SiteNav"
import SiteFooter from "./components/SiteFooter"
import { CompanyProvider } from "./CompanyProvider"

export default function SiteLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <CompanyProvider>
      <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <SiteNav />
        <main className="flex-1"><Outlet /></main>
        <SiteFooter />
      </div>
    </CompanyProvider>
  )
}
