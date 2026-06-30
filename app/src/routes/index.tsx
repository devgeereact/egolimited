import { createBrowserRouter } from "react-router-dom"

import AppLayout from "@/layouts/AppLayout"
import AuthLayout from "@/layouts/AuthLayout"
import EngineerLayout from "@/layouts/EngineerLayout"

import LoginPage from "@/auth/basic/LoginPage"
import RegisterPage from "@/auth/basic/RegisterPage"
import ForgotPasswordPage from "@/auth/basic/ForgotPasswordPage"

import NotFound from "@/pages/NotFound"
import ErrorPage from "@/pages/ErrorPage"
import { ResetPasswordForm } from "@/auth/basic/ResetPasswordForm"
import { VerifyEmailForm } from "@/auth/basic/VerifyEmailForm"
import { PasswordResetSuccess } from "@/auth/basic/PasswordResetSuccess"
import CoverLoginPage from "@/auth/cover/CoverLoginPage"
import CoverForgotPasswordPage from "@/auth/cover/CoverForgotPasswordPage"
import CoverRegisterPage from "@/auth/cover/CoverRegisterPage"
import CoverResetPasswordPage from "@/auth/cover/CoverResetPasswordPage"
import CoverVerifyEmailPage from "@/auth/cover/CoverVerifyEmailPage"
import CoverPasswordResetSuccessPage from "@/auth/cover/CoverPasswordResetSuccessPage"
import UserProfile from "@/pages/account/UserProfile"

// 🏗️ EGO LIMITED — auth + guards
import RequireRole from "@/components/ego/RequireRole"
import TeamPage from "@/pages/ego/team/TeamPage"
import EgoLogin from "@/pages/ego/auth/EgoLogin"
import EgoLanding from "@/pages/ego/auth/EgoLanding"
import HomeRedirect from "@/pages/ego/auth/HomeRedirect"
import InviteAccept from "@/pages/ego/auth/InviteAccept"
// 🏗️ EGO LIMITED — Phase 2 (integrations)
import EgoIntegrations from "@/pages/ego/integrations/IntegrationsPage"
// 🏗️ EGO LIMITED — invoicing (M6/M7) + dashboard
import EgoInvoicesList from "@/pages/ego/invoices/InvoicesList"
import EgoInvoiceDetail from "@/pages/ego/invoices/InvoiceDetail"
import EgoPayments from "@/pages/ego/finance/PaymentsPage"
import EgoContacts from "@/pages/ego/comms/ContactsPage"
import EgoInbox from "@/pages/ego/comms/InboxPage"
// 🏗️ EGO LIMITED — account security + lock (M-A)
import AccountSecurity from "@/pages/ego/account/AccountSecurity"
import LockScreen from "@/pages/ego/account/LockScreen"
import EgoActivity from "@/pages/ego/workspace/ActivityPage"
import EgoReviews from "@/pages/ego/workspace/ReviewsPage"
import EgoDashboard from "@/pages/ego/dashboard/EgoDashboard"
// 🏗️ EGO LIMITED — schedule (M4)
import EgoScheduleBoard from "@/pages/ego/schedule/ScheduleBoard"
// 🏗️ EGO LIMITED — customers (M2)
import EgoCustomersList from "@/pages/ego/customers/CustomersList"
import EgoCustomerDetail from "@/pages/ego/customers/CustomerDetail"
import EgoCustomerForm from "@/pages/ego/customers/CustomerForm"
// 🏗️ EGO LIMITED — procurement (M-B): suppliers + subcontractors
import SuppliersList from "@/pages/ego/procurement/SuppliersList"
import SupplierForm from "@/pages/ego/procurement/SupplierForm"
import SubcontractorsList from "@/pages/ego/procurement/SubcontractorsList"
import SubcontractorForm from "@/pages/ego/procurement/SubcontractorForm"
import PartsList from "@/pages/ego/procurement/PartsList"
import PartForm from "@/pages/ego/procurement/PartForm"
import PurchaseOrdersList from "@/pages/ego/procurement/PurchaseOrdersList"
import PurchaseOrderForm from "@/pages/ego/procurement/PurchaseOrderForm"
// 🏗️ EGO LIMITED — asset management (M-C)
import AssetsList from "@/pages/ego/assets/AssetsList"
import AssetForm from "@/pages/ego/assets/AssetForm"
// 🏗️ EGO LIMITED — announcements (M-A)
import AnnouncementsList from "@/pages/ego/announcements/AnnouncementsList"
import AnnouncementForm from "@/pages/ego/announcements/AnnouncementForm"
import CampaignsPage from "@/pages/ego/campaigns/CampaignsPage"
// 🏗️ EGO LIMITED — contracts / PPM (M-D)
import ContractsList from "@/pages/ego/contracts/ContractsList"
import ContractForm from "@/pages/ego/contracts/ContractForm"
// 🏗️ EGO LIMITED — compliance suite (M-E)
import IncidentsList from "@/pages/ego/compliance/IncidentsList"
import IncidentForm from "@/pages/ego/compliance/IncidentForm"
import RamsList from "@/pages/ego/compliance/RamsList"
import RamsForm from "@/pages/ego/compliance/RamsForm"
import CertificatesList from "@/pages/ego/compliance/CertificatesList"
import CertificateForm from "@/pages/ego/compliance/CertificateForm"
// 🏗️ EGO LIMITED — jobs + engineer field app
import JobsList from "@/pages/ego/jobs/JobsList"
import JobDetail from "@/pages/ego/jobs/JobDetail"
import JobForm from "@/pages/ego/jobs/JobForm"
import EngineerToday from "@/pages/ego/engineer/EngineerToday"
import EngineerMyJobs from "@/pages/ego/engineer/EngineerMyJobs"
import EngineerJobField from "@/pages/ego/engineer/EngineerJobField"
import EngineerProfile from "@/pages/ego/engineer/EngineerProfile"
import TrackJob from "@/pages/ego/portal/TrackJob"
import PortalContact from "@/pages/ego/portal/PortalContact"
import SettingsPage from "@/pages/ego/settings/SettingsPage"
// 🏗️ EGO LIMITED — task board (kanban)
import TaskBoard from "@/pages/kanban/TaskBoard"

export const router = createBrowserRouter (
  [
    // 🔐 AUTH ROUTES
    {
      element: <AuthLayout />,
      errorElement: <ErrorPage />,
      children: [
        {path: "auth/basic/login", element: <LoginPage /> },
        {path: "auth/basic/register", element: <RegisterPage /> },
        {path: "auth/basic/forgot-password", element: <ForgotPasswordPage /> },
        {path: "auth/basic/reset-password", element: <ResetPasswordForm /> },
        {path: "auth/basic/verify-email", element: <VerifyEmailForm /> },
        {path: "auth/basic/password-reset-success", element: <PasswordResetSuccess /> },

        {path: "auth/cover/login", element: <CoverLoginPage /> },
        {path: "auth/cover/register", element: <CoverRegisterPage /> },
        {path: "auth/cover/forgot-password", element: <CoverForgotPasswordPage /> },
        {path: "auth/cover/new-password", element: <CoverResetPasswordPage /> },
        {path: "auth/cover/password-reset-success", element: <CoverPasswordResetSuccessPage /> },
        {path: "auth/cover/verify-email", element: <CoverVerifyEmailPage /> },
      ],
    },

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
            {path: "ego/schedule", element: <EgoScheduleBoard /> },
            {path: "ego/customers", element: <EgoCustomersList /> },
            {path: "ego/customers/detail", element: <EgoCustomerDetail /> },
            {path: "ego/customers/new", element: <EgoCustomerForm /> },
            {path: "ego/customers/edit", element: <EgoCustomerForm /> },
            {path: "ego/suppliers", element: <SuppliersList /> },
            {path: "ego/suppliers/new", element: <SupplierForm /> },
            {path: "ego/suppliers/edit", element: <SupplierForm /> },
            {path: "ego/subcontractors", element: <SubcontractorsList /> },
            {path: "ego/subcontractors/new", element: <SubcontractorForm /> },
            {path: "ego/subcontractors/edit", element: <SubcontractorForm /> },
            {path: "ego/parts", element: <PartsList /> },
            {path: "ego/parts/new", element: <PartForm /> },
            {path: "ego/parts/edit", element: <PartForm /> },
            {path: "ego/purchase-orders", element: <PurchaseOrdersList /> },
            {path: "ego/purchase-orders/new", element: <PurchaseOrderForm /> },
            {path: "ego/purchase-orders/edit", element: <PurchaseOrderForm /> },
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
            {path: "ego/dashboard", element: <EgoDashboard /> },
            {path: "ego/invoices", element: <EgoInvoicesList /> },
            {path: "ego/quotes", element: <EgoInvoicesList defaultKind="quote" /> },
            {path: "ego/invoices/detail", element: <EgoInvoiceDetail /> },
            {path: "ego/payments", element: <EgoPayments /> },
            {path: "ego/contacts", element: <EgoContacts /> },
            {path: "ego/inbox", element: <EgoInbox /> },
            {path: "ego/tasks", element: <TaskBoard /> },
            {path: "ego/account/profile", element: <UserProfile /> },
            {path: "ego/activity", element: <EgoActivity /> },
            {path: "ego/reviews", element: <EgoReviews /> },
          ],
        },
        // Manager and up: company settings + team management
        {
          element: <RequireRole role="manager" />,
          children: [
            {path: "ego/settings", element: <SettingsPage /> },
            {path: "ego/team", element: <TeamPage /> },
            {path: "ego/announcements", element: <AnnouncementsList /> },
            {path: "ego/announcements/new", element: <AnnouncementForm /> },
            {path: "ego/announcements/edit", element: <AnnouncementForm /> },
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

        // ✅ 404 HANDLER
        { path: "*", element: <NotFound /> },
      ],
    },

    // 🏗️ EGO LIMITED — public landing + login + customer portal (no app chrome)
    { path: "welcome", element: <EgoLanding /> },
    { path: "ego/login", element: <EgoLogin /> },
    { path: "ego/invite/:token", element: <InviteAccept /> },
    { path: "track/:token", element: <TrackJob /> },
    { path: "ego/account/security", element: <div className="mx-auto w-full max-w-3xl p-4 md:p-6"><AccountSecurity /></div> },
    { path: "ego/lock", element: <LockScreen /> },

    // 🏗️ EGO LIMITED — engineer PWA (mobile shell, role-guarded)
    {
      element: <RequireRole role="engineer" />,
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
