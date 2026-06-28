import { useEffect } from "react"
import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/store/auth.store"

/**
 * App root (`/`). Routes by auth: signed-out → public landing (`/welcome`);
 * signed-in → the right home for the role. Waits out the initial /auth/me probe
 * so a hard refresh with a valid token doesn't flash the landing.
 */
export default function HomeRedirect() {
  const { user, status, loadMe } = useAuth()

  useEffect(() => {
    if (status === "loading") void loadMe()
  }, [status, loadMe])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (status === "anon" || !user) {
    return <Navigate to="/welcome" replace />
  }

  return (
    <Navigate
      to={user.role === "engineer" ? "/ego/engineer/today" : "/ego/dashboard"}
      replace
    />
  )
}
