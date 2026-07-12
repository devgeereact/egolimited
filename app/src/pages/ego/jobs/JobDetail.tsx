import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft, CalendarClock, CircleUserRound, Copy, Download, FileText, Mail, MapPin, Phone, Loader2, Package, PauseCircle,
  Sparkles, Plus, X, ListChecks, Trash2, RotateCcw, Pencil,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { useApi, invalidate } from "@/lib/query"
import { useAuth } from "@/store/auth.store"
import { isOffice, atLeast } from "@/lib/roles"
import { allowedTargets, STATUS_LABEL, type JobStatus } from "@/lib/jobStatus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { StatusPill } from "@/components/ego/StatusPill"
import { SlaBadge } from "@/components/ego/SlaBadge"
import ScheduleDialog from "@/components/ego/ScheduleDialog"
import { DetailSkeleton } from "@/components/ego/Skeletons"
import { confirmDialog } from "@/components/ego/confirm"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TrackQr from "@/components/ego/QrCode"
import QRCode from "qrcode"
import { PRIORITY_CLASS, PRIORITY_LABEL, gbp, type JobPriority } from "@/lib/mock/jobs"

interface JobDetailData {
  id: number
  reference: string
  title: string
  summary: string | null
  description: string | null
  engineer_brief: string | null
  checklist: { id: number; label: string; done: number }[]
  priority: JobPriority
  status: JobStatus
  quoted_amount: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  en_route_at: string | null
  on_site_at: string | null
  completed_at: string | null
  customer_id: number
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  engineer_id: number | null
  engineer_name: string | null
  address: { line1?: string; city?: string; postcode?: string } | null
  invoices: { id: number; kind: "quote" | "invoice"; number: string | null; status: string; total: string }[]
  track_token: string
  track_short: string
  hold_reason: string | null
  sla?: string | null
  sla_due?: string | null
  parts_required: number
  parts_note: string | null
  messages: { id: number; direction: string; channel: string; from_name: string | null; from_email: string | null; subject: string | null; body: string | null; acknowledged: number; visible_to_engineer: number; created_at: string }[]
}

const UNASSIGNED_ENG = "__none__"
const PROGRESS_STEPS: { key: JobStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "scheduled", label: "Scheduled" },
  { key: "en_route", label: "En route" },
  { key: "on_site", label: "On site" },
  { key: "completed", label: "Completed" },
  { key: "invoiced", label: "Invoiced" },
  { key: "paid", label: "Paid" },
]
const STEP_INDEX: Record<string, number> = {
  new: 0, scheduled: 1, en_route: 2, on_site: 3, on_hold: 3,
  completed: 4, invoiced: 5, paid: 6, closed: 6,
}

const fmtStamp = (s: string | null | undefined) =>
  s ? new Date(s.replace(" ", "T")).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""

function JobProgress({ status, stamps }: { status: JobStatus; stamps: Record<string, string | null> }) {
  if (status === "cancelled") {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm font-medium text-red-600 dark:text-red-400">This job was cancelled.</div>
  }
  const current = STEP_INDEX[status] ?? 0
  return (
    <div className="flex items-start justify-between gap-1">
      {PROGRESS_STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        const at = fmtStamp(stamps[s.key])
        return (
          <div key={s.key} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done || active ? "bg-primary" : "bg-border")} />
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2",
                done ? "bg-primary text-primary-foreground ring-primary" : active ? "bg-primary/15 text-primary ring-primary" : "bg-muted text-muted-foreground ring-border")}>
                {done ? "✓" : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === PROGRESS_STEPS.length - 1 ? "opacity-0" : done ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("mt-1.5 text-[10px] leading-tight", active ? "font-medium text-foreground" : "text-muted-foreground")}>{s.label}</span>
            <span className="mt-0.5 text-[10px] leading-tight tabular-nums text-muted-foreground">{at || "—"}</span>
          </div>
        )
      })}
    </div>
  )
}

async function downloadQr(url: string, ref: string) {
  try {
    const data = await QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: "M" })
    const a = document.createElement("a")
    a.href = data
    a.download = `${ref}-tracking-qr.png`
    a.click()
  } catch { /* ignore */ }
}

export default function JobDetail() {
  const [params] = useSearchParams()
  const id = params.get("id")
  const { user } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobDetailData | null>(null)
  const [busy, setBusy] = useState(false)
  const [schedOpen, setSchedOpen] = useState(false)
  const [summary, setSummary] = useState("")
  const [brief, setBrief] = useState("")
  const [checklist, setChecklist] = useState<string[]>([])
  const [newCheck, setNewCheck] = useState("")
  const [briefBusy, setBriefBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replyBusy, setReplyBusy] = useState(false)
  const JOB_PATH = id ? `/jobs/get?id=${id}` : null
  const { data: jobData, isPending, isError } = useApi<{ job: JobDetailData }>(JOB_PATH)
  const { data: engData } = useApi<{ engineers: { id: number; name: string; available: number }[] }>("/engineers")
  const engineers = useMemo(() => engData?.engineers ?? [], [engData])

  const loading = !!id && isPending
  useEffect(() => { if (isError) toast.error("Job not found") }, [isError])

  // The brief/summary/checklist are EDITABLE — they stay local state, seeded from the server
  // each time the job is (re)fetched. Reading them straight off the query would fight the user's
  // typing on every background refetch.
  useEffect(() => {
    if (!jobData) return
    setJob(jobData.job)
    setSummary(jobData.job.summary ?? "")
    setBrief(jobData.job.engineer_brief ?? "")
    setChecklist(jobData.job.checklist?.map((c) => c.label) ?? [])
  }, [jobData])

  /** Refetch this job + everything a job change makes stale (lists, schedule, dashboard, activity). */
  const load = () => { if (JOB_PATH) invalidate(JOB_PATH, "/jobs", "/schedule", "/dashboard", "/activity") }

  // Swap the assigned engineer without deleting/unscheduling the job.
  async function reassign(value: string) {
    if (!job) return
    try {
      await api("/jobs/assign-engineer", { method: "POST", body: { id: job.id, engineer_id: value === UNASSIGNED_ENG ? "" : Number(value) } })
      toast.success(value === UNASSIGNED_ENG ? "Engineer removed" : "Engineer reassigned"); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't reassign") }
  }

  async function aiBrief() {
    if (!job) return
    setAiBusy(true)
    try {
      const r = await api<{ summary: string; brief: string; checklist: string[] }>("/jobs/ai-brief", { method: "POST", body: { id: job.id } })
      if (r.summary) setSummary(r.summary)
      if (r.brief) setBrief(r.brief)
      if (r.checklist?.length) setChecklist(r.checklist)
      toast.success("AI draft ready — review, then save")
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI draft failed") } finally { setAiBusy(false) }
  }

  async function saveBrief() {
    if (!job) return
    setBriefBusy(true)
    try {
      await api("/jobs/brief", { method: "POST", body: { id: job.id, summary: summary.trim(), brief: brief.trim(), checklist } })
      toast.success("Saved — the engineer will see this")
      await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") } finally { setBriefBusy(false) }
  }

  async function sendReply(messageId: number) {
    if (!replyText.trim()) return
    setReplyBusy(true)
    try {
      await api("/messages/reply", { method: "POST", body: { id: messageId, body: replyText.trim() } })
      toast.success("Reply sent to the customer")
      setReplyTo(null); setReplyText(""); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send") } finally { setReplyBusy(false) }
  }

  async function changeStatus(to: JobStatus) {
    if (!job) return
    setBusy(true)
    try {
      await api("/jobs/status", { method: "POST", body: { id: job.id, to } })
      toast.success(`Marked ${STATUS_LABEL[to]}`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update")
    } finally {
      setBusy(false)
    }
  }

  // Manager+ mistake-correction: pull a finished/cancelled job back to active. Reversing a
  // recorded payment is a separate action on the invoice (Undo payment).
  async function reopen() {
    if (!job || !(await confirmDialog({
      title: "Reopen this job to an active status?",
      body: "If a payment was recorded, reverse it separately with Undo payment on the invoice.",
      confirmText: "Reopen",
    }))) return
    setBusy(true)
    try { await api("/jobs/reopen", { method: "POST", body: { id: job.id } }); toast.success("Job reopened"); await load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't reopen") } finally { setBusy(false) }
  }

  async function ackMsg(id: number) { await api("/messages/ack", { method: "POST", body: { id } }); toast.success("Acknowledged"); load() }
  async function toggleVis(id: number, visible: boolean) { await api("/messages/visibility", { method: "POST", body: { id, visible } }); toast.success(visible ? "Engineer can see it" : "Hidden from engineer"); load() }

  async function createDoc(kind: "invoice" | "quote") {
    if (!job) return
    try {
      // Invoice from an existing quote → carry over EVERY line + price (accept builds a
      // draft invoice off the quote). Admin then adds any extra work / adjusts on the draft.
      // No quote → fall back to a single job-title line.
      if (kind === "invoice") {
        const quote = job.invoices.filter((iv) => iv.kind === "quote" && !["void", "declined"].includes(iv.status)).at(-1)
        if (quote) {
          const r = await api<{ invoice_id: number }>("/invoices/accept", { method: "POST", body: { id: quote.id } })
          navigate(`/ego/invoices/detail?id=${r.invoice_id}`)
          return
        }
      }
      const res = await api<{ id: number }>("/invoices", {
        method: "POST",
        body: {
          job_id: job.id,
          kind,
          vat_rate: 0,
          lines: [{ description: job.title, quantity: 1, unit_price: job.quoted_amount ? Number(job.quoted_amount) : 0 }],
        },
      })
      navigate(`/ego/${kind === "quote" ? "quotes" : "invoices"}/detail?id=${res.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create")
    }
  }

  if (loading) return <DetailSkeleton />
  if (!job) return <div className="p-6 text-muted-foreground">Job not found.</div>

  const targets = user ? allowedTargets(job.status, user.role) : []
  const trackUrl = `${location.origin}${import.meta.env.BASE_URL}track/${job.track_token}`
  const stageStamps: Record<string, string | null> = {
    scheduled: job.scheduled_start, en_route: job.en_route_at, on_site: job.on_site_at, completed: job.completed_at,
  }

  // The single obvious "next step" for this job — a big primary button. Money steps included
  // so the office is nudged straight from a finished job into invoicing / taking payment.
  const unpaidInvoice = job.invoices.find((iv) => iv.kind === "invoice" && ["sent", "overdue"].includes(iv.status))
  const nextStep: { label: string; run: () => void } | null =
    job.status === "new" ? { label: "Schedule & assign", run: () => setSchedOpen(true) }
    : job.status === "scheduled" ? { label: "Start travel", run: () => changeStatus("en_route") }
    : job.status === "en_route" ? { label: "Arrived on site", run: () => changeStatus("on_site") }
    : job.status === "on_site" ? { label: "Mark complete", run: () => changeStatus("completed") }
    : job.status === "on_hold" ? { label: "Resume job", run: () => changeStatus("on_site") }
    : job.status === "completed" ? { label: "Create invoice", run: () => createDoc("invoice") }
    : job.status === "invoiced" && unpaidInvoice ? { label: "Record payment", run: () => navigate(`/ego/invoices/detail?id=${unpaidInvoice.id}`) }
    : null
  // Remaining transitions become demoted "override" buttons. 'invoiced'/'paid' are never manual
  // (the invoice send + payment drive them), and the happy-path target is already the primary.
  const primaryTargetStatus =
    job.status === "new" ? "scheduled" : job.status === "scheduled" ? "en_route"
    : job.status === "en_route" ? "on_site" : job.status === "on_site" ? "completed"
    : job.status === "on_hold" ? "on_site" : null
  const overrides = targets.filter((t) => t !== primaryTargetStatus && !["invoiced", "paid"].includes(t))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/ego/jobs"><ArrowLeft /> Jobs</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{job.reference}</h1>
            <StatusPill status={job.status} />
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", PRIORITY_CLASS[job.priority])}>
              {PRIORITY_LABEL[job.priority]} priority
            </span>
            <SlaBadge sla={job.sla} />
          </div>
          <p className="text-base">{job.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* One obvious next step (primary), everything else demoted to outline */}
          {nextStep && (
            <Button disabled={busy} onClick={nextStep.run}>
              {busy && <Loader2 className="animate-spin" />} {nextStep.label}
            </Button>
          )}
          {overrides.map((to) =>
            to === "scheduled" ? (
              <Button key={to} variant="outline" disabled={busy} onClick={() => setSchedOpen(true)}>Schedule &amp; assign</Button>
            ) : (
              <Button key={to} variant="outline" disabled={busy} onClick={() => changeStatus(to)}>{STATUS_LABEL[to]}</Button>
            )
          )}
          {/* Edit the job's details (office+), any time */}
          {isOffice(user?.role) && (
            <Button asChild variant="outline" disabled={busy}>
              <Link to={`/ego/jobs/edit?id=${job.id}`}><Pencil className="size-4" /> Edit</Link>
            </Button>
          )}
          {/* Reschedule shortcut once already scheduled */}
          {(job.status === "scheduled" || job.status === "on_hold") && isOffice(user?.role) && (
            <Button variant="outline" disabled={busy} onClick={() => setSchedOpen(true)}>
              Reschedule
            </Button>
          )}
          {/* Reopen a finished/cancelled job (manager+) — undo a premature paid/closed. */}
          {atLeast(user?.role, "manager") && ["completed", "invoiced", "paid", "closed", "cancelled"].includes(job.status) && (
            <Button variant="outline" disabled={busy} onClick={reopen}><RotateCcw className="size-4" /> Reopen</Button>
          )}
          {atLeast(user?.role, "manager") && (
            <Button variant="outline" className="text-destructive hover:text-destructive" disabled={busy}
              onClick={async () => {
                if (!(await confirmDialog({ title: `Delete job ${job.reference}?`, body: "This can be recovered.", confirmText: "Delete", danger: true }))) return
                try { await api("/jobs/delete", { method: "POST", body: { id: job.id } }); toast.success("Job deleted"); navigate("/ego/jobs") }
                catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed") }
              }}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>

      <ScheduleDialog
        jobId={job.id}
        open={schedOpen}
        onOpenChange={setSchedOpen}
        onDone={load}
        defaults={{
          engineer_id: undefined,
          date: job.scheduled_start ? job.scheduled_start.slice(0, 10) : "",
          start: job.scheduled_start ? job.scheduled_start.slice(11, 16) : "09:00",
          end: job.scheduled_end ? job.scheduled_end.slice(11, 16) : "11:00",
        }}
      />

      {job.status === "on_hold" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400"><PauseCircle className="size-4" /> On hold</p>
          {job.hold_reason && <p className="mt-1 text-muted-foreground">{job.hold_reason}</p>}
          {job.parts_required === 1 && (
            <p className="mt-2 flex items-start gap-1.5 font-medium"><Package className="mt-0.5 size-4 text-amber-600" /> Order needed{job.parts_note ? `: ${job.parts_note}` : ""}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
            <CardContent><JobProgress status={job.status} stamps={stageStamps} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">What needs doing</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {job.summary && <p className="text-sm font-medium">{job.summary}</p>}
              {job.description
                ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.summary && <span className="font-medium">Client's request: </span>}{job.description}</p>
                : !job.summary && <p className="text-sm italic text-muted-foreground">No description was added for this job.</p>}
            </CardContent>
          </Card>

          {/* Engineer brief + on-site checklist — what the engineer sees in the field */}
          {isOffice(user?.role) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4 text-primary" /> Engineer brief</CardTitle>
                <Button size="sm" variant="outline" onClick={aiBrief} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} AI draft
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">One-line summary — the "what needs doing" headline.</p>
                  <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Clean the garden" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Detailed brief — the engineer reads this on site.</p>
                  <Textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. Boiler not firing. Check gas supply and PCB. Customer is elderly — be patient." />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">On-site checklist</p>
                  {checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={item} onChange={(e) => setChecklist((cs) => cs.map((c, idx) => idx === i ? e.target.value : c))} className="h-9" />
                      <Button size="icon" variant="ghost" className="size-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setChecklist((cs) => cs.filter((_, idx) => idx !== i))} aria-label="Remove check"><X className="size-4" /></Button>
                    </div>
                  ))}
                  <form onSubmit={(e) => { e.preventDefault(); if (newCheck.trim()) { setChecklist((cs) => [...cs, newCheck.trim()]); setNewCheck("") } }} className="flex items-center gap-2">
                    <Input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} placeholder="Add a check…" className="h-9" />
                    <Button type="submit" size="icon" variant="outline" className="size-9 shrink-0" aria-label="Add check"><Plus className="size-4" /></Button>
                  </form>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveBrief} disabled={briefBusy}>{briefBusy && <Loader2 className="size-4 animate-spin" />} Save for engineer</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {job.messages.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Messages</CardTitle>
                <span className="text-xs text-muted-foreground">{job.messages.length}</span>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.messages.map((m) => (
                  <div key={m.id} className={cn("rounded-lg border p-3", m.channel === "portal" && !m.acknowledged && "border-amber-500/40 bg-amber-500/5")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {m.direction === "inbound" ? (m.from_name || m.from_email || "Customer") : "You"}
                        {m.channel === "portal" && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">portal</span>}
                      </p>
                      <span className="text-xs text-muted-foreground">{m.created_at?.slice(5, 16)}</span>
                    </div>
                    {m.subject && <p className="text-xs text-muted-foreground">{m.subject}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                    {m.direction === "inbound" && (
                      <div className="mt-2 space-y-2 border-t pt-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {m.acknowledged ? (
                            <span className="text-xs text-emerald-600">✓✓ Acknowledged</span>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => ackMsg(m.id)}>Acknowledge</Button>
                          )}
                          {m.channel === "portal" && (
                            <Button size="sm" onClick={() => { setReplyTo(replyTo === m.id ? null : m.id); setReplyText("") }}>Reply</Button>
                          )}
                          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                            Show engineer
                            <Switch checked={m.visible_to_engineer === 1} onCheckedChange={(v) => toggleVis(m.id, v)} />
                          </label>
                        </div>
                        {replyTo === m.id && (
                          <div className="space-y-2">
                            <Textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to the customer — they'll see it on their tracking page (and by email)." />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>Cancel</Button>
                              <Button size="sm" onClick={() => sendReply(m.id)} disabled={replyBusy || !replyText.trim()}>{replyBusy && <Loader2 className="size-4 animate-spin" />} Send reply</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CircleUserRound className="size-4 text-muted-foreground" />
                <Link to={`/ego/customers/detail?id=${job.customer_id}`} className="font-medium hover:underline">{job.customer_name}</Link>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> {job.customer_phone || "—"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> {job.customer_email || "—"}</div>
              {job.address && (job.address.line1 || job.address.postcode) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    {[job.address.line1, job.address.city, job.address.postcode].filter(Boolean).join(", ")}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-muted-foreground" />
                {job.scheduled_start ? job.scheduled_start : <span className="text-muted-foreground">Not scheduled</span>}
              </div>
              <div className="flex items-center gap-2">
                <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
                {isOffice(user?.role) && !["completed", "invoiced", "paid", "closed", "cancelled"].includes(job.status) ? (
                  <Select value={job.engineer_id ? String(job.engineer_id) : UNASSIGNED_ENG} onValueChange={reassign}>
                    <SelectTrigger className="h-8 w-[200px]"><SelectValue placeholder="Assign engineer…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_ENG}>Unassigned</SelectItem>
                      {engineers.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}{e.available ? "" : " · away"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{job.engineer_name ?? "Unassigned"}</span>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Money</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quoted</span>
                <span className="font-mono font-medium">{job.quoted_amount ? gbp(Number(job.quoted_amount)) : "—"}</span>
              </div>

              {job.invoices.length > 0 && (
                <div className="space-y-1.5 border-t pt-2">
                  {job.invoices.map((iv) => (
                    <Link key={iv.id} to={`/ego/${iv.kind === "quote" ? "quotes" : "invoices"}/detail?id=${iv.id}`} className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/40">
                      <span className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{iv.number ?? (iv.kind === "quote" ? "Quote draft" : "Invoice draft")}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusPill status={iv.status as never} />
                        <span className="font-mono">{gbp(Number(iv.total))}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {job.status === "completed" && job.invoices.length === 0 && (
                <div className="rounded-md bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ready to invoice — raise it below.
                </div>
              )}
              {isOffice(user?.role) && (
                <div className="flex flex-wrap gap-2 border-t pt-2">
                  {/* Once the job is paid/closed it's settled — no new quotes or invoices. */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createDoc("quote")}
                    disabled={["paid", "closed"].includes(job.status)}
                    title={["paid", "closed"].includes(job.status) ? "This job is settled" : ""}
                  >
                    Create quote
                  </Button>
                  {/* Raise an invoice as soon as the job is assigned (payment can take days) —
                      not only at completion. Blocked before it's scheduled, if cancelled, or once settled. */}
                  <Button
                    size="sm"
                    onClick={() => createDoc("invoice")}
                    disabled={["new", "cancelled", "paid", "closed"].includes(job.status)}
                    title={
                      job.status === "new" ? "Schedule/assign the job first"
                      : job.status === "cancelled" ? "This job is cancelled"
                      : ["paid", "closed"].includes(job.status) ? "This job is settled"
                      : ""
                    }
                  >
                    Create invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Customer tracking</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Customer scans the code (or opens the link) to follow this job live.</p>
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/20 p-3">
                <TrackQr value={trackUrl} size={150} label={job.reference} />
                <p className="text-xs text-muted-foreground">Code: <span className="font-mono font-medium">{job.track_short}</span></p>
              </div>
              <div className="flex gap-2">
                <input readOnly value={trackUrl} className="flex-1 truncate rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(trackUrl); toast.success("Link copied") }}>
                  <Copy className="size-4" /> Copy
                </Button>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => downloadQr(trackUrl, job.reference)}>
                <Download className="size-4" /> Download QR
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
