import { lazy, Suspense, type ReactNode } from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

import AppLayout from "@/layouts/AppLayout"
import EngineerLayout from "@/layouts/EngineerLayout"

// Eager — guards + entry/auth screens: small, and needed on first paint.
import RequireRole from "@/components/ego/RequireRole"
import NotFound from "@/pages/NotFound"
import ErrorPage from "@/pages/ErrorPage"
import EgoLogin from "@/pages/ego/auth/EgoLogin"
import EgoLanding from "@/pages/ego/auth/EgoLanding"
import HomeRedirect from "@/pages/ego/auth/HomeRedirect"
import InviteAccept from "@/pages/ego/auth/InviteAccept"

// Lazy — EGO feature pages. Each becomes its own chunk, pulling heavy deps
// (FullCalendar, jsPDF, dnd-kit, qrcode, recharts) out of the initial bundle.
const TeamPage = lazy(() => import("@/pages/ego/team/TeamPage"))
const EgoIntegrations = lazy(() => import("@/pages/ego/integrations/IntegrationsPage"))
const EgoInvoicesList = lazy(() => import("@/pages/ego/invoices/InvoicesList"))
const EgoInvoiceDetail = lazy(() => import("@/pages/ego/invoices/InvoiceDetail"))
const EgoPayments = lazy(() => import("@/pages/ego/finance/PaymentsPage"))
const EgoInbox = lazy(() => import("@/pages/ego/comms/InboxPage"))
const AccountSecurity = lazy(() => import("@/pages/ego/account/AccountSecurity"))
const LockScreen = lazy(() => import("@/pages/ego/account/LockScreen"))
const EgoActivity = lazy(() => import("@/pages/ego/workspace/ActivityPage"))
const EgoReviews = lazy(() => import("@/pages/ego/workspace/ReviewsPage"))
const EgoToday = lazy(() => import("@/pages/ego/dashboard/TodayPage"))
const EgoAnalytics = lazy(() => import("@/pages/ego/analytics/AnalyticsPage"))
const EgoScheduleBoard = lazy(() => import("@/pages/ego/schedule/ScheduleBoard"))
const EgoCustomersList = lazy(() => import("@/pages/ego/customers/CustomersList"))
const EgoCustomerDetail = lazy(() => import("@/pages/ego/customers/CustomerDetail"))
const EgoCustomerForm = lazy(() => import("@/pages/ego/customers/CustomerForm"))
const SubcontractorsList = lazy(() => import("@/pages/ego/subcontractors/SubcontractorsList"))
const SubcontractorForm = lazy(() => import("@/pages/ego/subcontractors/SubcontractorForm"))
const AssetsList = lazy(() => import("@/pages/ego/assets/AssetsList"))
const AssetForm = lazy(() => import("@/pages/ego/assets/AssetForm"))
const AnnouncementsList = lazy(() => import("@/pages/ego/announcements/AnnouncementsList"))
const AnnouncementForm = lazy(() => import("@/pages/ego/announcements/AnnouncementForm"))
const CampaignsPage = lazy(() => import("@/pages/ego/campaigns/CampaignsPage"))
const PipelinePage = lazy(() => import("@/pages/ego/pipeline/PipelinePage"))
const ContractsList = lazy(() => import("@/pages/ego/contracts/ContractsList"))
const ContractForm = lazy(() => import("@/pages/ego/contracts/ContractForm"))
const IncidentsList = lazy(() => import("@/pages/ego/compliance/IncidentsList"))
const IncidentForm = lazy(() => import("@/pages/ego/compliance/IncidentForm"))
const RamsList = lazy(() => import("@/pages/ego/compliance/RamsList"))
const RamsForm = lazy(() => import("@/pages/ego/compliance/RamsForm"))
const CertificatesList = lazy(() => import("@/pages/ego/compliance/CertificatesList"))
const CertificateForm = lazy(() => import("@/pages/ego/compliance/CertificateForm"))
const JobsList = lazy(() => import("@/pages/ego/jobs/JobsList"))
const JobDetail = lazy(() => import("@/pages/ego/jobs/JobDetail"))
const JobForm = lazy(() => import("@/pages/ego/jobs/JobForm"))
const EngineerToday = lazy(() => import("@/pages/ego/engineer/EngineerToday"))
const EngineerMyJobs = lazy(() => import("@/pages/ego/engineer/EngineerMyJobs"))
const EngineerJobField = lazy(() => import("@/pages/ego/engineer/EngineerJobField"))
const EngineerProfile = lazy(() => import("@/pages/ego/engineer/EngineerProfile"))
const TrackJob = lazy(() => import("@/pages/ego/portal/TrackJob"))
const PortalContact = lazy(() => import("@/pages/ego/portal/PortalContact"))
const SettingsPage = lazy(() => import("@/pages/ego/settings/SettingsPage"))
const TaskBoard = lazy(() => import("@/pages/kanban/TaskBoard"))

/** Brief centred spinner while a lazy route chunk loads. */
function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}
/** Wrap a standalone lazy route (no layout Outlet above it) in its own Suspense. */
const s = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>

export const router = createBrowserRouter (
  [
    // 🔐 AUTH — the PULSE template shipped two unbranded "Acme Inc." auth skins (basic/cover,
    // 12 pages) that were never wired to auth.store or lib/api.ts: the login form collected an
    // email and password and did nothing with them. They were LIVE in production. Deleted
    // 2026-07-12; anything under /auth/* now redirects to the one real login so old bookmarks
    // don't dead-end. EGO's real auth is pages/ego/auth/* (login, invite, lock).
    { path: "auth/*", element: <Navigate to="/ego/login" replace /> },

    // 📊 APP ROUTES
    {
      element: <AppLayout />,
      errorElement: <ErrorPage />,
      children: [
        {index: true, element: <HomeRedirect /> },

        // 🏗️ EGO LIMITED — Office (Employee Admin) and up (role-guarded; server enforces too)
        {
          element: <RequireRole role="office" />,
          children: [
            {path: "ego/jobs", element: <JobsList /> },
            {path: "ego/jobs/detail", element: <JobDetail /> },
            {path: "ego/jobs/new", element: <JobForm /> },
            {path: "ego/jobs/edit", element: <JobForm /> },
            {path: "ego/schedule", element: <EgoScheduleBoard /> },
            {path: "ego/customers", element: <EgoCustomersList /> },
            {path: "ego/customers/detail", element: <EgoCustomerDetail /> },
            {path: "ego/customers/new", element: <EgoCustomerForm /> },
            {path: "ego/customers/edit", element: <EgoCustomerForm /> },
            {path: "ego/subcontractors", element: <SubcontractorsList /> },
            {path: "ego/subcontractors/new", element: <SubcontractorForm /> },
            {path: "ego/subcontractors/edit", element: <SubcontractorForm /> },
            {path: "ego/assets", element: <AssetsList /> },
            {path: "ego/assets/new", element: <AssetForm /> },
            {path: "ego/assets/edit", element: <AssetForm /> },
            {path: "ego/contracts", element: <ContractsList /> },
            {path: "ego/contracts/new", element: <ContractForm /> },
            {path: "ego/contracts/edit", element: <ContractForm /> },
            {path: "ego/incidents", element: <IncidentsList /> },
            {path: "ego/incidents/new", element: <IncidentForm /> },
            {path: "ego/incidents/edit", element: <IncidentForm /> },
            {path: "ego/rams", element: <RamsList /> },
            {path: "ego/rams/new", element: <RamsForm /> },
            {path: "ego/rams/edit", element: <RamsForm /> },
            {path: "ego/certificates", element: <CertificatesList /> },
            {path: "ego/certificates/new", element: <CertificateForm /> },
            {path: "ego/certificates/edit", element: <CertificateForm /> },
            {path: "ego/dashboard", element: <EgoToday /> },
            {path: "ego/analytics", element: <EgoAnalytics /> },
            {path: "ego/invoices", element: <EgoInvoicesList key="invoices" /> },
            {path: "ego/quotes", element: <Navigate to="/ego/invoices?kind=quote" replace /> },
            {path: "ego/invoices/detail", element: <EgoInvoiceDetail /> },
            {path: "ego/quotes/detail", element: <EgoInvoiceDetail /> },
            {path: "ego/payments", element: <EgoPayments /> },
            {path: "ego/contacts", element: <Navigate to="/ego/customers" replace /> },
            {path: "ego/inbox", element: <EgoInbox /> },
            {path: "ego/tasks", element: <TaskBoard /> },
            {path: "ego/account/profile", element: <Navigate to="/ego/settings" replace /> },
            {path: "ego/settings", element: <SettingsPage /> },
            {path: "ego/activity", element: <EgoActivity /> },
            {path: "ego/reviews", element: <EgoReviews /> },
          ],
        },
        // Manager and up: company settings + team management
        {
          element: <RequireRole role="manager" />,
          children: [
            {path: "ego/team", element: <TeamPage /> },
            {path: "ego/announcements", element: <AnnouncementsList /> },
            {path: "ego/announcements/new", element: <AnnouncementForm /> },
            {path: "ego/announcements/edit", element: <AnnouncementForm /> },
            {path: "ego/pipeline", element: <PipelinePage /> },
            {path: "ego/campaigns", element: <CampaignsPage /> },
          ],
        },
        // Founder only: integration secrets / API keys
        {
          element: <RequireRole role="founder" />,
          children: [
            {path: "ego/integrations", element: <EgoIntegrations /> },
          ],
        },
        // Customer portal (in-app shell)
        {path: "ego/portal/track", element: <TrackJob /> },
        {path: "ego/portal/contact", element: <PortalContact /> },

        // Legacy PULSE-template alias — old notification/bookmark links pointed at
        // /apps/email. Redirect to the real inbox so they never dead-end at 404.
        {path: "apps/email", element: <Navigate to="/ego/inbox" replace /> },

        // ✅ 404 HANDLER
        { path: "*", element: <NotFound /> },
      ],
    },

    // 🏗️ EGO LIMITED — public landing + login + customer portal (no app chrome)
    // Every one of these carries errorElement: without it react-router shows its own raw
    // "Unexpected Application Error!" stack-trace page. These are the routes a CUSTOMER and a
    // locked-out user hit, so they are the last place that should leak a stack trace.
    { path: "welcome", element: <EgoLanding />, errorElement: <ErrorPage /> },
    { path: "ego/login", element: <EgoLogin />, errorElement: <ErrorPage /> },
    { path: "ego/invite/:token", element: <InviteAccept />, errorElement: <ErrorPage /> },
    { path: "track/:token", element: s(<TrackJob />), errorElement: <ErrorPage /> },
    { path: "ego/account/security", element: s(<div className="mx-auto w-full max-w-3xl p-4 md:p-6"><AccountSecurity /></div>), errorElement: <ErrorPage /> },
    { path: "ego/lock", element: s(<LockScreen />), errorElement: <ErrorPage /> },

    // 🏗️ EGO LIMITED — engineer PWA (mobile shell, role-guarded)
    {
      element: <RequireRole role="engineer" />,
      errorElement: <ErrorPage />,
      children: [
        {
          element: <EngineerLayout />,
          children: [
            { path: "ego/engineer/today", element: <EngineerToday /> },
            { path: "ego/engineer/jobs", element: <EngineerMyJobs /> },
            { path: "ego/engineer/job", element: <EngineerJobField /> },
            { path: "ego/engineer/profile", element: <EngineerProfile /> },
          ],
        },
      ],
    },
  ],
  {
    // Auto-matches the Vite base: "/" in local dev, "/app" when built
    // with --base=/app/ for egolimited.com deploy.
    basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  }
)
