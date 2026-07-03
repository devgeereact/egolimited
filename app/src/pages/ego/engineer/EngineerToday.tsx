import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Clock, MapPin, ChevronRight, Loader2, Sun } from "lucide-react"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/store/auth.store"
import { Card, CardContent } from "@/components/ui/card"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import { PRIORITY_CLASS, PRIORITY_LABEL, type JobPriority } from "@/lib/mock/jobs"

interface FieldJob {
  id: number
  reference: string
  title: string
  status: EgoStatus
  priority: JobPriority
  scheduled_start: string | null
  scheduled_end: string | null
  customer_name: string
  line1: string | null
  city: string | null
  postcode: string | null
}

interface Weather { city: string; temp: number | null; desc: string; icon: string; wind: number | null }

const win = (j: FieldJob) =>
  j.scheduled_start ? `${j.scheduled_start.slice(11, 16)}${j.scheduled_end ? `–${j.scheduled_end.slice(11, 16)}` : ""}` : "Anytime"

export default function EngineerToday() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<FieldJob[]>([])
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t) }, [])
  // Always UK time regardless of the device's timezone.
  const today = now.toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" })
  const clock = now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" })

  const cacheKey = user ? `ego_today_${user.id}` : "ego_today"
  useEffect(() => {
    // Instant offline-friendly hydrate from the last saved list.
    try { const c = localStorage.getItem(cacheKey); if (c) { setJobs(JSON.parse(c)); setLoading(false) } } catch { /* ignore */ }
    const fetchJobs = () =>
      api<{ jobs: FieldJob[] }>("/me/jobs/today")
        .then((r) => { setJobs(r.jobs); try { localStorage.setItem(cacheKey, JSON.stringify(r.jobs)) } catch { /* ignore */ } })
        .catch(() => { /* keep cached/offline data */ })
        .finally(() => setLoading(false))
    fetchJobs()
    api<Weather>("/weather").then(setWeather).catch(() => {}) // hidden if no key
    const t = setInterval(fetchJobs, 60000) // live-ish: new assignments appear within a minute
    return () => clearInterval(t)
  }, [cacheKey])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {user?.name.split(" ")[0] ?? "there"} 👋</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
          <Clock className="size-4 text-muted-foreground" />
          <span className="text-lg font-semibold leading-none tabular-nums">{clock}</span>
        </div>
      </div>

      {weather && (
        <Card className="gradient-blue overflow-hidden border-0 text-white shadow">
          <CardContent className="flex items-center justify-between gap-3 bg-gradient-to-b from-white/10 to-black/20 p-4">
            <div className="flex items-center gap-3">
              {weather.icon && <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt={weather.desc} className="size-14 drop-shadow" />}
              <div>
                <p className="text-3xl font-semibold leading-none">{weather.temp != null ? `${Math.round(weather.temp)}°` : "—"}</p>
                <p className="mt-1 text-xs capitalize text-white/85">{weather.desc}</p>
              </div>
            </div>
            <div className="text-right text-xs text-white/85">
              <p className="font-medium">{weather.city}</p>
              {weather.wind != null && <p>wind {weather.wind} m/s</p>}
              <p className="mt-1 text-white/70">Plan your route</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <Sun className="size-8 text-muted-foreground" />
          <p className="font-medium">No jobs today</p>
          <p className="text-sm text-muted-foreground">Enjoy the quiet — check My Jobs for what's coming up.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
        {jobs.map((j) => {
          const addr = [j.line1, j.city, j.postcode].filter(Boolean).join(", ")
          return (
            <Card key={j.id} className="p-0">
              <Link to={`/ego/engineer/job?id=${j.id}`} className="flex items-stretch gap-3 p-4">
                <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-3 text-center">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="mt-1 text-xs font-medium">{win(j).split("–")[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{j.reference}</span>
                    <StatusPill status={j.status} />
                    {j.priority === "urgent" && (
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", PRIORITY_CLASS[j.priority])}>
                        {PRIORITY_LABEL[j.priority]}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-medium">{j.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{j.customer_name}</p>
                  {addr && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {addr}
                    </span>
                  )}
                </div>
                <ChevronRight className="size-5 self-center text-muted-foreground" />
              </Link>
            </Card>
          )
        })}
        </div>
      )}
    </div>
  )
}
