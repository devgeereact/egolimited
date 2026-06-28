import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ShieldCheck, KeyRound, Smartphone, Loader2, Copy, Check, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccountSecurity() {
  const [params] = useSearchParams()
  const forced = params.get("force") === "1"
  const { loadMe } = useAuth()

  // change password
  const [cur, setCur] = useState("")
  const [nw, setNw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [savingPw, setSavingPw] = useState(false)

  // 2fa
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [otpauth, setOtpauth] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [disablePw, setDisablePw] = useState("")

  useEffect(() => {
    api<{ user: { totp_enabled?: number } }>("/auth/me")
      .then((r) => setEnabled(Number(r.user.totp_enabled) === 1))
      .finally(() => setLoaded(true))
  }, [])

  async function changePassword() {
    if (nw.length < 8) { toast.error("New password must be at least 8 characters"); return }
    if (nw !== confirm) { toast.error("Passwords don't match"); return }
    setSavingPw(true)
    try {
      await api("/me/change-password", { method: "POST", body: { current_password: cur, new_password: nw } })
      toast.success("Password changed")
      setCur(""); setNw(""); setConfirm("")
      await loadMe()
      if (forced) window.location.href = `${import.meta.env.BASE_URL}ego/dashboard`
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password")
    } finally { setSavingPw(false) }
  }

  async function startSetup() {
    setBusy(true)
    try {
      const r = await api<{ secret: string; otpauth: string }>("/me/totp/setup", { method: "POST" })
      setSecret(r.secret); setOtpauth(r.otpauth)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Setup failed") } finally { setBusy(false) }
  }
  async function enable() {
    setBusy(true)
    try {
      await api("/me/totp/enable", { method: "POST", body: { code } })
      toast.success("Two-factor authentication enabled")
      setEnabled(true); setSecret(null); setOtpauth(null); setCode("")
      await loadMe()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Invalid code") } finally { setBusy(false) }
  }
  async function disable() {
    setBusy(true)
    try {
      await api("/me/totp/disable", { method: "POST", body: { password: disablePw } })
      toast.success("Two-factor authentication disabled")
      setEnabled(false); setDisablePw("")
      await loadMe()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Password incorrect") } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Account security</h1>
          <p className="mt-1 text-sm text-muted-foreground">Password &amp; two-factor authentication</p>
        </div>
      </div>

      {forced && (
        <Card className="max-w-xl border-warning/40 bg-warning-soft/40">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <span>An administrator requires you to set a new password before continuing.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="size-4" /> Change password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={nw} onChange={(e) => setNw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Confirm new password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <Button onClick={changePassword} disabled={savingPw || !cur || !nw}>{savingPw && <Loader2 className="animate-spin" />} Update password</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="size-4" /> Two-factor authentication
            {loaded && <Badge variant={enabled ? "default" : "secondary"} className="ml-1">{enabled ? "On" : "Off"}</Badge>}
          </CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {!loaded ? <Loader2 className="size-5 animate-spin" />
              : enabled ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">2FA is active. You'll enter a 6-digit code from your authenticator app at login.</p>
                  <div className="space-y-1.5"><Label>Password to disable</Label><Input type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} /></div>
                  <Button variant="outline" className="text-destructive" onClick={disable} disabled={busy || !disablePw}>{busy && <Loader2 className="animate-spin" />} Disable 2FA</Button>
                </div>
              ) : secret ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Add this key to Google Authenticator / 1Password, then enter the 6-digit code to confirm.</p>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                    <code className="flex-1 break-all text-sm tabular-nums">{secret}</code>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { navigator.clipboard?.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  {otpauth && <a href={otpauth} className="text-xs text-primary hover:underline">Open in authenticator app</a>}
                  <div className="space-y-1.5"><Label>6-digit code</Label><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" /></div>
                  <Button onClick={enable} disabled={busy || code.length !== 6}>{busy && <Loader2 className="animate-spin" />} Verify &amp; enable</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Protect your account with a time-based one-time code in addition to your password.</p>
                  <Button onClick={startSetup} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Set up 2FA</Button>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
