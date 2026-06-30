import React, { lazy } from "react"
import ReactDOM from "react-dom/client"
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  isRouteErrorResponse,
  useRouteError,
} from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

import { AuthProvider } from "@/lib/auth"
import ErrorPage from "@/components/ErrorPage"
import "@/index.css"

// Shell + the landing index ship in the initial bundle (most-hit, above the
// fold). Every other route is code-split so a first-time visitor to "/" no
// longer downloads the tracker and other sub-page code up front.
import SiteLayout from "@/site/SiteLayout"
import Home from "@/site/pages/Home"
const About = lazy(() => import("@/site/pages/About"))
const Services = lazy(() => import("@/site/pages/Services"))
const ServiceDetail = lazy(() => import("@/site/pages/ServiceDetail"))
const Sectors = lazy(() => import("@/site/pages/Sectors"))
const Areas = lazy(() => import("@/site/pages/Areas"))
const AreaDetail = lazy(() => import("@/site/pages/AreaDetail"))
const Accreditations = lazy(() => import("@/site/pages/Accreditations"))
const Contact = lazy(() => import("@/site/pages/Contact"))
const Track = lazy(() => import("@/site/pages/Track"))
const Verify = lazy(() => import("@/site/pages/Verify"))
const Legal = lazy(() => import("@/site/pages/Legal"))
const SiteNotFound = lazy(() => import("@/site/pages/NotFound"))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false } },
})

function RouteError() {
  const err = useRouteError()
  const status = isRouteErrorResponse(err) ? err.status : null
  const code = status === 404 ? 404 : status === 403 ? 403 : 500
  const detail = err instanceof Error ? err.message : undefined
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <ErrorPage
        code={code}
        detail={code === 500 ? detail : undefined}
        onReload={() => window.location.reload()}
      />
    </div>
  )
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <SiteLayout />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <Home /> },
        { path: "about", element: <About /> },
        { path: "services", element: <Services /> },
        { path: "services/:slug", element: <ServiceDetail /> },
        { path: "sectors", element: <Sectors /> },
        { path: "areas", element: <Areas /> },
        { path: "areas/:slug", element: <AreaDetail /> },
        { path: "accreditations", element: <Accreditations /> },
        { path: "contact", element: <Contact /> },
        { path: "track", element: <Track /> },
        // The real customer portal is the token link (/app/track/:token), surfaced
        // by the tracker. Keep /portal working as a redirect for any old links.
        { path: "portal", element: <Navigate to="/track" replace /> },
        { path: "resources", element: <Navigate to="/accreditations" replace /> },
        // Reviews are collected in the customer portal's review form (one path,
        // one name). The old standalone NPS survey is retired -> send to tracker.
        { path: "survey", element: <Navigate to="/track" replace /> },
        { path: "verify/:id", element: <Verify /> },
        { path: "privacy", element: <Legal kind="privacy" /> },
        { path: "terms", element: <Legal kind="terms" /> },
        { path: "cookies", element: <Legal kind="cookies" /> },
        { path: "*", element: <SiteNotFound /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
