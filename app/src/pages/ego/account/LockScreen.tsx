import { useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function LockScreen() {
  const { user, status, login, logout, loadMe } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [needCode, setNeedCode] = useState(false)
  const [busy, setBusy] = useState(false)

  // On a hard refresh the token is in storage but the user isn't loaded yet —
  // hydrate it so the lock screen stays locked instead of bouncing to login.
  useEffect(() => { if (status === "loading") void loadMe() }, [status, loadMe])

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
  }
  if (status === "anon" || !user) return <Navigate to="/ego/login" replace />

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    try {
      // Re-authenticate to confirm it's really them; honours 2FA if enabled.
      await login(user.email, password, needCode ? code : undefined)
      navigate("/ego/dashboard", { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wrong password"
      if (/2fa|code/i.test(msg)) { setNeedCode(true); toast.message("Enter your 2FA code") }
      else toast.error(msg)
    } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Lock className="size-6" /></div>
            <h1 className="text-lg font-semibold">Locked</h1>
            <p className="text-sm text-muted-foreground">Signed in as {user.name}. Enter your password to continue.</p>
          </div>
          <form onSubmit={unlock} className="space-y-3">
            <Input type="password" autoFocus placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {needCode && <Input inputMode="numeric" maxLength={6} placeholder="2FA code" value={code} onChange={(e) => setCode(e.target.value)} />}
            <Button type="submit" className="w-full" disabled={busy || !password}>{busy && <Loader2 className="animate-spin" />} Unlock</Button>
          </form>
          <button onClick={() => void logout().then(() => navigate("/ego/login", { replace: true }))} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
            Not you? Sign out
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
