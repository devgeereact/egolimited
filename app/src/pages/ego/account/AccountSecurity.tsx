import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ShieldCheck, KeyRound, Smartphone, Loader2, Copy, Check, AlertTriangle, ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccountSecurity() {
  const [params] = useSearchParams()
  const forced = params.get("force") === "1"
  const { loadMe } = useAuth()

  const [cur, setCur] = useState("")
  const [nw, setNw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [savingPw, setSavingPw] = useState(false)

  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [otpauth, setOtpauth] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [disablePw, setDisablePw] = useState("")
  const [setupPw, setSetupPw] = useState("")

  useEffect(() => {
    api<{ user: { totp_enabled?: number } }>("/auth/me")
      .then((r) => setEnabled(Number(r.user.totp_enabled) === 1))
      .finally(() => setLoaded(true))
  }, [])

  async function changePassword() {
    if (nw.length < 8) return toast.error("New password must be at least 8 characters")
    if (nw !== confirm) return toast.error("Passwords don't match")
    setSavingPw(true)
    try {
      await api("/me/change-password", { method: "POST", body: { current_password: cur, new_password: nw } })
      toast.success("Password updated")
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
      const r = await api<{ secret: string; otpauth: string }>("/me/totp/setup", { method: "POST", body: { password: setupPw } })
      setSecret(r.secret); setOtpauth(r.otpauth); setSetupPw("")
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
    <div className="space-y-6">
      {forced && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <span>An administrator requires you to set a new password before continuing.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-muted-foreground" /> Password</CardTitle>
            <CardDescription>Use at least 8 characters. You'll stay signed in on this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="cur">Current password</Label>
              <Input id="cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="nw">New password</Label>
              <Input id="nw" type="password" autoComplete="new-password" value={nw} onChange={(e) => setNw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="cf">Confirm new password</Label>
              <Input id="cf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <Button onClick={changePassword} disabled={savingPw || !cur || !nw || !confirm}>
              {savingPw && <Loader2 className="animate-spin" />} Update password
            </Button>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" /> Two-factor authentication
              {loaded && <Badge variant={enabled ? "default" : "secondary"} className="ml-1">{enabled ? "On" : "Off"}</Badge>}
            </CardTitle>
            <CardDescription>Add a 6-digit code from an authenticator app on top of your password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loaded ? (
              <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : enabled ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">2FA is active. You'll be asked for a code from your authenticator app each time you sign in.</span>
                </div>
                <Separator />
                <div className="space-y-1.5"><Label htmlFor="dpw">Confirm password to disable</Label>
                  <Input id="dpw" type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} /></div>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={disable} disabled={busy || !disablePw}>
                  {busy && <Loader2 className="animate-spin" />} <ShieldAlert /> Disable 2FA
                </Button>
              </div>
            ) : secret ? (
              <div className="space-y-4">
                <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                  <li>Open your authenticator app (Google Authenticator, 1Password, Authy).</li>
                  <li>Add a new account and enter this setup key:</li>
                </ol>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                  <code className="flex-1 break-all font-mono text-sm tracking-wider">{secret}</code>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Copy setup key"
                    onClick={() => { navigator.clipboard?.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                {otpauth && <a href={otpauth} className="inline-block text-xs font-medium text-primary hover:underline">Open in authenticator app →</a>}
                <Separator />
                <div className="space-y-1.5"><Label htmlFor="code">Enter the 6-digit code to confirm</Label>
                  <Input id="code" inputMode="numeric" maxLength={6} value={code} placeholder="123 456"
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="max-w-40 font-mono tracking-[0.3em]" /></div>
                <div className="flex gap-2">
                  <Button onClick={enable} disabled={busy || code.length !== 6}>{busy && <Loader2 className="animate-spin" />} Verify &amp; enable</Button>
                  <Button variant="ghost" onClick={() => { setSecret(null); setOtpauth(null); setCode("") }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your account is protected by your password only. Turn on 2FA for an extra layer of security.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="spw">Confirm your password to begin</Label>
                  <Input id="spw" type="password" autoComplete="current-password" value={setupPw}
                    onChange={(e) => setSetupPw(e.target.value)} className="max-w-xs" />
                </div>
                <Button onClick={startSetup} disabled={busy || !setupPw}>{busy && <Loader2 className="animate-spin" />} Set up 2FA</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
