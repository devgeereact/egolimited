import React from "react"
import ReactDOM from "react-dom/client"
import {
  createBrowserRouter,
  RouterProvider,
  isRouteErrorResponse,
  useRouteError,
} from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

import { AuthProvider } from "@/lib/auth"
import ErrorPage from "@/components/ErrorPage"
import "@/index.css"

import SiteLayout from "@/site/SiteLayout"
import Home from "@/site/pages/Home"
import About from "@/site/pages/About"
import Services from "@/site/pages/Services"
import ServiceDetail from "@/site/pages/ServiceDetail"
import Sectors from "@/site/pages/Sectors"
import Areas from "@/site/pages/Areas"
import AreaDetail from "@/site/pages/AreaDetail"
import Accreditations from "@/site/pages/Accreditations"
import Resources from "@/site/pages/Resources"
import ResourceArticle from "@/site/pages/ResourceArticle"
import Contact from "@/site/pages/Contact"
import Track from "@/site/pages/Track"
import Portal from "@/site/pages/Portal"
import Survey from "@/site/pages/Survey"
import Verify from "@/site/pages/Verify"
import Legal from "@/site/pages/Legal"
import SiteNotFound from "@/site/pages/NotFound"

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
        { path: "resources", element: <Resources /> },
        { path: "resources/:slug", element: <ResourceArticle /> },
        { path: "contact", element: <Contact /> },
        { path: "track", element: <Track /> },
        { path: "portal", element: <Portal /> },
        { path: "survey", element: <Survey /> },
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
