import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateSelectArg } from "@fullcalendar/core"
import { CalendarDays, Loader2, Plus, Clock, UserPlus } from "lucide-react"

import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import ScheduleDialog from "@/components/ego/ScheduleDialog"
import "./schedule.css"

interface SchedJob {
  id: number; reference: string; title: string; status: string
  scheduled_start: string; scheduled_end: string | null
  engineer_id: number | null; engineer_name: string | null; customer_name: string
}

interface WaitItem {
  id: number; reference: string; title: string; priority: string
  customer_name: string; reason: "schedule" | "assign"
}

// Per-engineer colour from the design-system chart palette (re-themes automatically;
// no raw hex — FullCalendar accepts a CSS-var colour string in the inline style).
const ENG_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"]
const colorFor = (id: number | null) =>
  id == null ? "hsl(var(--muted-foreground))" : `hsl(var(${ENG_VARS[id % ENG_VARS.length]}))`

export default function ScheduleBoard() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<SchedJob[]>([])
  const [waitlist, setWaitlist] = useState<WaitItem[]>([])
  const [pickJobs, setPickJobs] = useState<{ id: number; reference: string; title: string }[]>([])
  const [engineers, setEngineers] = useState<{ id: number; name: string }[]>([])
  const [filter, setFilter] = useState<number | "all">("all")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fixedJob, setFixedJob] = useState<number>()
  const [slot, setSlot] = useState<{ date: string; start: string; end: string }>()
  const [picked, setPicked] = useState<{ id: number; title: string } | null>(null)
  const [removing, setRemoving] = useState(false)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])

  async function unschedule() {
    if (!picked) return
    setRemoving(true)
    try {
      await api("/jobs/unschedule", { method: "POST", body: { id: picked.id } })
      toast.success("Removed from schedule — back on the waitlist")
      setPicked(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unschedule")
    } finally { setRemoving(false) }
  }

  function load() {
    return Promise.all([
      api<{ jobs: SchedJob[]; waitlist: WaitItem[] }>("/schedule"),
      api<{ engineers: { id: number; name: string }[] }>("/engineers"),
      api<{ jobs: { id: number; reference: string; title: string; status: string }[] }>("/jobs"),
    ]).then(([s, e, j]) => {
      setJobs(s.jobs)
      setWaitlist(s.waitlist ?? [])
      setEngineers(e.engineers)
      setPickJobs(j.jobs.filter((x) => !["closed", "cancelled", "paid"].includes(x.status)).map(({ id, reference, title }) => ({ id, reference, title })))
    })
  }
  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const events = useMemo(
    () =>
      jobs
        .filter((j) => filter === "all" || j.engineer_id === filter)
        .map((j) => {
          const start = j.scheduled_start.replace(" ", "T")
          // Guard bad data: an end that is missing or not after the start would render a
          // broken/giant block — fall back to FullCalendar's default 1h duration instead.
          let end = j.scheduled_end ? j.scheduled_end.replace(" ", "T") : undefined
          if (end && end <= start) end = undefined
          const color = colorFor(j.engineer_id)
          return {
            id: String(j.id), start, end,
            backgroundColor: color, borderColor: color, textColor: "#fff",
            extendedProps: { reference: j.reference, customer: j.customer_name, engineer: j.engineer_name, status: j.status },
          }
        }),
    [jobs, filter]
  )

  function onSelect(sel: DateSelectArg) {
    const date = sel.startStr.slice(0, 10)
    const start = sel.startStr.length > 10 ? sel.startStr.slice(11, 16) : "09:00"
    const end = sel.endStr.length > 10 ? sel.endStr.slice(11, 16) : "11:00"
    setSlot({ date, start, end })
    setDialogOpen(true)
  }

  const todayKey = now.toISOString().slice(0, 10)
  const todayCount = jobs.filter((j) => (j.scheduled_start ?? "").slice(0, 10) === todayKey).length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Live date + time hero — at-a-glance for scheduling */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center justify-between gap-5 p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-16 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wide">{now.toLocaleDateString("en-GB", { month: "short" })}</span>
              <span className="text-2xl font-bold leading-none">{now.getDate()}</span>
            </div>
            <div>
              <p className="text-3xl font-semibold leading-none tabular-nums">{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-2xl font-semibold leading-none">{todayCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Today</p>
            </div>
            <div className="text-center">
              <p className={cn("text-2xl font-semibold leading-none", waitlist.length > 0 && "text-amber-600")}>{waitlist.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Waitlist</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <Button onClick={() => { setFixedJob(undefined); setSlot(undefined); setDialogOpen(true) }}><Plus /> Schedule a job</Button>
          </div>
        </CardContent>
      </Card>

      {/* Engineer filter / legend */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFilter("all")}
          className={cn("rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
            filter === "all" ? "bg-primary text-primary-foreground ring-primary" : "text-muted-foreground ring-border hover:bg-muted")}>All</button>
        {engineers.map((e) => (
          <button key={e.id} onClick={() => setFilter(e.id)}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
              filter === e.id ? "text-white ring-transparent" : "text-muted-foreground ring-border hover:bg-muted")}
            style={filter === e.id ? { background: colorFor(e.id) } : undefined}>
            <span className="size-2 rounded-full" style={{ background: colorFor(e.id) }} />
            {e.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex h-[60vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
                buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
                events={events}
                eventClick={(info) => {
                  const p = info.event.extendedProps as { reference?: string; customer?: string }
                  setPicked({ id: Number(info.event.id), title: `${p.reference ?? ""} · ${p.customer ?? ""}` })
                }}
                eventClassNames="ego-event"
                eventContent={(arg) => {
                  const p = arg.event.extendedProps as { reference?: string; customer?: string }
                  return (
                    <div className="overflow-hidden px-1 py-0.5 leading-tight">
                      {arg.timeText && <div className="text-[10px] font-semibold opacity-90">{arg.timeText}</div>}
                      <div className="truncate text-[11px] font-semibold">{p.reference}</div>
                      <div className="truncate text-[10px] opacity-85">{p.customer}</div>
                    </div>
                  )
                }}
                selectable
                selectMirror
                select={onSelect}
                height="72vh"
                expandRows
                stickyHeaderDates
                nowIndicator
                slotMinTime="07:00:00"
                slotMaxTime="19:00:00"
                slotDuration="01:00:00"
                allDaySlot={false}
                dayMaxEvents
                firstDay={1}
              />
            )}
          </CardContent>
        </Card>

        {/* Waitlist — awaiting schedule / assign */}
        <Card className="h-fit">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              <h3 className="text-sm font-semibold">Waitlist</h3>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">{waitlist.length}</span>
            </div>
            {!loading && waitlist.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Everything scheduled & assigned 🎉</p>
            ) : waitlist.map((j) => (
              <button key={j.id} onClick={() => { setFixedJob(j.id); setSlot(undefined); setDialogOpen(true) }}
                className="flex w-full items-start gap-2 rounded-lg border p-2.5 text-left hover:bg-muted/40">
                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                  j.reason === "schedule" ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600")}>
                  {j.reason === "schedule" ? <Clock className="size-3.5" /> : <UserPlus className="size-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{j.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{j.reference} · {j.customer_name}</p>
                  <span className={cn("text-[11px] font-medium", j.reason === "schedule" ? "text-amber-600" : "text-blue-600")}>
                    {j.reason === "schedule" ? "Needs scheduling" : "Needs engineer"}{j.priority === "urgent" ? " · ⚠ urgent" : ""}
                  </span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={load}
        jobId={fixedJob}
        pickJobs={pickJobs}
        defaults={{ date: slot?.date ?? "", start: slot?.start ?? "09:00", end: slot?.end ?? "11:00" }}
      />

      {/* Click a calendar event → open the job or take it off the schedule */}
      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="truncate">{picked?.title ?? "Scheduled job"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Open the job, or remove it from the schedule — it goes back on the waitlist to be re-slotted.</p>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" className="text-destructive" disabled={removing} onClick={unschedule}>
              {removing && <Loader2 className="size-4 animate-spin" />} Remove from schedule
            </Button>
            <Button onClick={() => picked && navigate(`/ego/jobs/detail?id=${picked.id}`)}>Open job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
