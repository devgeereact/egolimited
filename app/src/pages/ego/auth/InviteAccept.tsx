import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function InviteAccept() {
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const [pass, setPass] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pass.length < 8) { setError("Password must be at least 8 characters"); return }
    if (pass !== confirm) { setError("Passwords don't match"); return }
    setBusy(true)
    try {
      await api("/invite/accept", { method: "POST", body: { token, password: pass }, auth: false })
      setDone(true)
      setTimeout(() => navigate("/ego/login", { replace: true }), 1600)
    } catch (e) { setError(e instanceof Error ? e.message : "This invite is invalid or already used") }
    finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
          <CardTitle>Set your password</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="text-sm text-muted-foreground">All set — taking you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="p">New password</Label><Input id="p" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus /></div>
              <div className="space-y-1.5"><Label htmlFor="c">Confirm password</Label><Input id="c" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Activate account</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
