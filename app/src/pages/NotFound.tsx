import { Navigate, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/store/auth.store"

export default function NotFound() {
  const navigate = useNavigate()
  const { status, user } = useAuth()

  // Don't flash a bare 404 while the /auth/me probe is still resolving (AppLayout
  // kicks it off). Once known: signed-out → login; signed-in → a real 404 with the
  // full app shell/nav around it so the user can navigate away.
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (status === "anon" || !user) {
    return <Navigate to="/ego/login" replace />
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">
        Oops! The page you’re looking for doesn’t exist.
      </p>
      <Button className="mt-6" onClick={() => navigate("/ego/dashboard")}>
        Go to Dashboard
      </Button>
    </div>
  )
}
