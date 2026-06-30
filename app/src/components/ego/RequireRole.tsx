import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Loader2, ShieldAlert } from "lucide-react"

import { useAuth, type Role } from "@/store/auth.store"
import { canAccess, ROLE_LABEL } from "@/lib/roles"
import { Button } from "@/components/ui/button"

/**
 * Client-side route guard (the SERVER still enforces every request — this is UX,
 * not the security boundary). Wrap a route group: <Route element={<RequireRole role="admin" />}>.
 */
export default function RequireRole({ role }: { role: Role }) {
  const { user, status, loadMe, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (status === "loading") void loadMe()
  }, [status, loadMe])

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (status === "anon" || !user) {
    return <Navigate to="/ego/login" replace state={{ from: location.pathname }} />
  }

  if (!canAccess(user.role, role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <ShieldAlert className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Not allowed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This area needs <span className="font-medium">{ROLE_LABEL[role]}</span> access. You're signed in as{" "}
            <span className="font-medium">{ROLE_LABEL[user.role]}</span>.
          </p>
        </div>
        <Button variant="outline" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    )
  }

  // Forced password change: block the app until a new password is set.
  if (user.must_change_password && location.pathname !== "/ego/account/security") {
    return <Navigate to="/ego/account/security?force=1" replace />
  }

  return <Outlet />
}
