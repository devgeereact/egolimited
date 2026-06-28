import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { UserRound, Mail, Phone, ShieldCheck, BadgeCheck, Loader2, Power } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { ROLE_LABEL } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Me {
  id: number; name: string; email: string; role: keyof typeof ROLE_LABEL
  phone?: string | null; available?: number; totp_enabled?: number
}

export default function ProfilePage() {
  const { setAvailable } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingAvail, setSavingAvail] = useState(false)

  useEffect(() => {
    api<{ user: Me }>("/auth/me").then((r) => setMe(r.user)).finally(() => setLoading(false))
  }, [])

  async function toggleAvail(v: boolean) {
    if (!me) return
    setSavingAvail(true)
    try {
      await api("/me/availability", { method: "POST", body: { available: v ? 1 : 0 } })
      setMe({ ...me, available: v ? 1 : 0 })
      setAvailable(v ? 1 : 0)
      toast.success(v ? "You're marked available" : "You're marked unavailable")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update")
    } finally { setSavingAvail(false) }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>
  if (!me) return <div className="p-6 text-muted-foreground">Could not load your profile.</div>

  const initials = me.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserRound className="size-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account details and status.</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{initials}</div>
              <div>
                <p className="text-lg font-semibold leading-tight">{me.name}</p>
                <Badge variant="secondary" className="mt-1">{ROLE_LABEL[me.role]}</Badge>
              </div>
            </div>
            <Separator />
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm"><Mail className="size-4 text-muted-foreground" /><span>{me.email}</span></div>
              <div className="flex items-center gap-2 text-sm"><Phone className="size-4 text-muted-foreground" /><span>{me.phone || "—"}</span></div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <span>2FA {Number(me.totp_enabled) === 1 ? "enabled" : "off"}</span>
                {Number(me.totp_enabled) === 1 && <BadgeCheck className="size-4 text-primary" />}
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Power className="size-4 text-muted-foreground" /> Availability</CardTitle>
              <CardDescription>Office sees this on the team board and schedule.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{Number(me.available) === 1 ? "Available" : "Unavailable"}</span>
                <Switch checked={Number(me.available) === 1} disabled={savingAvail} onCheckedChange={toggleAvail} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Security</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/ego/account/security"><ShieldCheck /> Password &amp; 2FA</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
                <Link to="/ego/lock">Lock screen</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
