import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { LogOut, Mail, CheckCircle2, CalendarCheck, TrendingUp, Loader2, Download } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/store/auth.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

interface HistItem { id: number; reference: string; title: string; status: EgoStatus; completed_at: string | null; scheduled_start: string | null; customer_name: string }
interface Stats { total: number; today: number; week: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InstallEvent = Event & { prompt: () => void }

export default function EngineerProfile() {
  const navigate = useNavigate()
  const { user, logout, setAvailable } = useAuth()
  const available = (user?.available ?? 1) === 1
  const [savingAvail, setSavingAvail] = useState(false)
  const [history, setHistory] = useState<HistItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, week: 0 })
  const [loading, setLoading] = useState(true)
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null)

  useEffect(() => {
    api<{ history: HistItem[]; stats: Stats }>("/me/history")
      .then((r) => { setHistory(r.history); setStats(r.stats) })
      .finally(() => setLoading(false))
  }, [])

  // PWA install affordance — capture the browser's deferred prompt.
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallEvent) }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  async function toggleAvailable(v: boolean) {
    const next = v ? 1 : 0
    setSavingAvail(true)
    setAvailable(next) // optimistic
    try {
      await api("/me/availability", { method: "POST", body: { available: v } })
      toast.success(v ? "You're available for jobs" : "Marked unavailable")
    } catch (e) {
      setAvailable(v ? 0 : 1) // revert
      toast.error(e instanceof Error ? e.message : "Couldn't update")
    } finally { setSavingAvail(false) }
  }

  function install() { installEvt?.prompt(); setInstallEvt(null) }

  async function onLogout() { await logout(); navigate("/welcome", { replace: true }) }

  const cards = [
    { label: "Completed", value: stats.total, icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    { label: "Today", value: stats.today, icon: CalendarCheck, tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    { label: "This week", value: stats.week, icon: TrendingUp, tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  ]

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-primary to-primary/50" />
        <CardContent className="-mt-8 flex flex-col items-center gap-2 pb-5 text-center">
          <Avatar className="size-16 border-4 border-card">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">{user ? initials(user.name) : "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{user?.name}</p>
            <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground"><Mail className="size-3.5" /> {user?.email}</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize text-muted-foreground">{user?.role}</span>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
              <div className={`flex size-9 items-center justify-center rounded-lg ${c.tone}`}><c.icon className="size-4" /></div>
              <p className="text-lg font-semibold">{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Availability */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <Label htmlFor="avail" className="flex items-center gap-2 text-base">
              Available for jobs
              <span className={cn("inline-block size-2 rounded-full", available ? "bg-emerald-500" : "bg-muted-foreground/50")} />
            </Label>
            <p className="text-sm text-muted-foreground">{available ? "On the rota — the office can assign you work." : "Marked unavailable — the office will see this."}</p>
          </div>
          <Switch id="avail" checked={available} disabled={savingAvail} onCheckedChange={toggleAvailable} />
        </CardContent>
      </Card>

      {/* Install the app */}
      {installEvt && (
        <Card className="border-primary/30">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">Install the engineer app</p>
              <p className="text-sm text-muted-foreground">Add to your home screen for one-tap access.</p>
            </div>
            <Button size="sm" onClick={install}><Download className="size-4" /> Install</Button>
          </CardContent>
        </Card>
      )}

      {/* Job history */}
      <div>
        <p className="mb-2 px-1 text-sm font-medium">Job history</p>
        {loading ? (
          <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : history.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No completed jobs yet.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <Card key={h.id}>
                <Link to={`/ego/engineer/job?id=${h.id}`} className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{h.reference}</span>
                      <StatusPill status={h.status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium">{h.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{h.customer_name} · {(h.completed_at || h.scheduled_start || "").slice(0, 10)}</p>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" className="h-11 text-destructive" onClick={onLogout}>
        <LogOut /> Log out
      </Button>
    </div>
  )
}
