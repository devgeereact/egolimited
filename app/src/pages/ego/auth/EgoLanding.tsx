import { Link } from "react-router-dom"
import { ArrowRight, LogIn, Wrench } from "lucide-react"

import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"

/**
 * Public EGO landing (no app chrome). Where you land signed-out — including after
 * sign-out — with a sign-in entry point. Signed-in users get a shortcut into the app.
 */
export default function EgoLanding() {
  const { user } = useAuth()
  const dest = user
    ? user.role === "engineer"
      ? "/ego/engineer/today"
      : "/ego/dashboard"
    : "/ego/login"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Wrench className="size-8" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">EGO LIMITED</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Field service management — jobs, scheduling, invoicing and your engineer team,
            all in one place.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {user ? (
          <Button asChild size="lg">
            <Link to={dest}>
              Open dashboard <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/ego/login">
              <LogIn className="size-4" /> Sign in
            </Link>
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Staff portal · authorised access only</p>
      </div>
    </div>
  )
}
