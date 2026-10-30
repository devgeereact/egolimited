import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { Loader2, LogIn, ShieldAlert, Wrench } from "lucide-react"
import { SignIn, useAuth as useClerkAuth } from "@clerk/clerk-react"

import { clerkEnabled } from "@/lib/clerk"
import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const homeFor = (role: string) => (role === "engineer" ? "/ego/engineer/today" : "/ego/dashboard")

export default function EgoLogin() {
  return clerkEnabled ? <ClerkLogin /> : <LegacyLogin />
}

/** Email-code sign-in by Clerk. Being signed in to Clerk is not enough: the email must also be an
 *  approved staff record (the API answers 401 otherwise), and then we show why instead of looping. */
function ClerkLogin() {
  const { user, status } = useAuth()
  const { isLoaded, isSignedIn } = useClerkAuth()
  const { logout } = useAuth()

  if (status === "authed" && user) return <Navigate to={homeFor(user.role)} replace />

  const spinner = (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
  if (!isLoaded || (isSignedIn && status === "loading")) return spinner

  if (isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-xl">No access yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              You're signed in, but this email isn't on the EGO LIMITED team. Ask the office to add it, then sign in again.
            </p>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => void logout()}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignIn routing="hash" withSignUp={false} />
    </div>
  )
}

function LegacyLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await login(email.trim(), password)
      navigate(homeFor(user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wrench className="size-6" />
          </div>
          <CardTitle className="text-xl">EGO LIMITED</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to the field service portal</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@egolimited.co.uk"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <LogIn />}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
