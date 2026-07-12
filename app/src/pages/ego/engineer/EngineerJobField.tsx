import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowLeft, Phone, Navigation, Camera, StickyNote, CheckCircle2, PauseCircle, Loader2, Package,
  MapPin, ListChecks, Sparkles, MessageSquare, Plus,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useApi, invalidate } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { StatusPill } from "@/components/ego/StatusPill"
import type { JobStatus } from "@/lib/jobStatus"

interface FieldDetail {
  id: number
  reference: string
  title: string
  summary: string | null
  description: string | null
  engineer_brief: string | null
  status: JobStatus
  scheduled_start: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  address: { line1?: string; line2?: string; city?: string; postcode?: string } | null
  photos: { id: number; url: string; caption: string | null }[]
  notes: { body: string; created_at: string; author: string | null }[]
  checklist: { id: number; label: string; done: number }[]
  hold_reason: string | null
  parts_required: number
  parts_note: string | null
  messages: { from: string; is_customer: number; subject: string | null; body: string | null; created_at: string }[]
}

const PRIMARY: Partial<Record<JobStatus, { label: string; to: JobStatus }>> = {
  scheduled: { label: "I'm on my way", to: "en_route" },
  en_route: { label: "Arrived on site", to: "on_site" },
}

export default function EngineerJobField() {
  const [params] = useSearchParams()
  const id = params.get("id")
  const fileRef = useRef<HTMLInputElement>(null)
  const [job, setJob] = useState<FieldDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState("")
  const [noteAiBusy, setNoteAiBusy] = useState(false)
  const [newCheck, setNewCheck] = useState("")
  const [signOpen, setSignOpen] = useState(false)
  const [signName, setSignName] = useState("")
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdReason, setHoldReason] = useState("")
  const [partsNeeded, setPartsNeeded] = useState(false)
  const [partsNote, setPartsNote] = useState("")

  const JOB_PATH = id ? `/me/jobs/get?id=${id}` : null
  const { data, isPending, isError } = useApi<{ job: FieldDetail }>(JOB_PATH)
  const loading = !!id && isPending
  useEffect(() => { if (isError) toast.error("Job not found") }, [isError])
  useEffect(() => { if (data) setJob(data.job) }, [data])

  /** An engineer's field action changes their own job list AND the office's view of it. */
  const load = () => {
    if (JOB_PATH) invalidate(JOB_PATH, "/me/jobs", "/jobs", "/schedule", "/dashboard")
  }

  async function move(to: JobStatus, extra: Record<string, unknown> = {}) {
    if (!job) return
    const prev = job.status
    setJob({ ...job, status: to }) // optimistic
    setBusy(true)
    try {
      await api("/jobs/status", { method: "POST", body: { id: job.id, to, ...extra } })
      await load()
    } catch (e) {
      setJob({ ...job, status: prev }) // revert
      toast.error(e instanceof Error ? e.message : "Couldn't update")
    } finally {
      setBusy(false)
    }
  }

  async function addNote() {
    if (!job || !note.trim()) return
    await api("/jobs/note", { method: "POST", body: { id: job.id, body: note.trim() } })
    setNote(""); setNoteOpen(false); toast.success("Note added"); load()
  }

  async function toggleCheck(itemId: number, done: boolean) {
    if (!job) return
    setJob({ ...job, checklist: job.checklist.map((c) => (c.id === itemId ? { ...c, done: done ? 1 : 0 } : c)) }) // optimistic
    try { await api("/jobs/checklist/toggle", { method: "POST", body: { id: itemId, done } }) }
    catch { toast.error("Couldn't update"); load() }
  }

  async function addCheckItem() {
    if (!job || !newCheck.trim()) return
    try {
      await api("/jobs/checklist/add", { method: "POST", body: { job_id: job.id, label: newCheck.trim() } })
      setNewCheck(""); load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add") }
  }

  async function polishNote() {
    if (!note.trim()) return
    setNoteAiBusy(true)
    try {
      const r = await api<{ text: string }>("/me/note/ai", { method: "POST", body: { text: note.trim() } })
      if (r.text) setNote(r.text)
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI couldn't help right now") } finally { setNoteAiBusy(false) }
  }

  function pickPhoto() { fileRef.current?.click() }
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !job) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await api("/jobs/photo", { method: "POST", body: { id: job.id, data: reader.result } })
        toast.success("Photo added"); load()
      } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed") }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  async function complete() {
    await move("completed", { signoff_name: signName.trim() || null })
    setSignOpen(false)
  }

  async function putOnHold() {
    await move("on_hold", { hold_reason: holdReason.trim(), parts_required: partsNeeded ? 1 : 0, parts_note: partsNote.trim() })
    setHoldOpen(false); setHoldReason(""); setPartsNeeded(false); setPartsNote("")
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
  if (!job) return <div className="p-6 text-muted-foreground">Job not found.</div>

  const addrLines = job.address ? [job.address.line1, job.address.line2, [job.address.city, job.address.postcode].filter(Boolean).join(" ")].filter(Boolean) : []
  const addr = addrLines.join(", ")
  const primary = PRIMARY[job.status]
  const onSite = job.status === "on_site"
  const done = ["completed", "invoiced", "paid", "closed"].includes(job.status)
  const checkDone = job.checklist.filter((c) => c.done).length
  const canAddChecks = !done && job.status !== "cancelled"

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link to="/ego/engineer/today"><ArrowLeft /> Back</Link>
      </Button>

      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">{job.reference}</span>
        <StatusPill status={job.status} />
      </div>
      <h1 className="-mt-2 text-xl font-semibold tracking-tight">{job.title}</h1>

      {/* On-hold banner */}
      {job.status === "on_hold" && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">On hold</p>
            {job.hold_reason && <p className="mt-1 text-muted-foreground">{job.hold_reason}</p>}
            {job.parts_required === 1 && (
              <p className="mt-2 flex items-start gap-1.5 font-medium"><Package className="mt-0.5 size-4 text-amber-600" /> Order needed{job.parts_note ? `: ${job.parts_note}` : ""}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer + location */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
              <p className="truncate font-semibold">{job.customer_name}</p>
            </div>
          </div>
          {addrLines.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{addrLines.map((l, i) => <span key={i} className="block">{l}</span>)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button asChild variant="outline" className="h-11 flex-col gap-0.5 text-[11px]" disabled={!job.customer_phone}>
              <a href={job.customer_phone ? `tel:${job.customer_phone}` : undefined}><Phone className="size-4" /> Call</a>
            </Button>
            <Button asChild className="h-11 flex-col gap-0.5 text-[11px]" disabled={!addr}>
              <a href={addr ? `https://maps.google.com/?q=${encodeURIComponent(addr)}` : undefined} target="_blank" rel="noreferrer"><Navigation className="size-4" /> Navigate</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What needs doing — one-line summary headline + the detailed office brief */}
      {(job.summary || job.engineer_brief || job.description) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-1 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary"><Sparkles className="size-3.5" /> What needs doing</p>
            <p className="text-sm font-medium">{job.summary || job.engineer_brief || job.description}</p>
            {job.engineer_brief && (job.summary || job.description !== job.engineer_brief) && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.engineer_brief}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* On-site checklist */}
      {(job.checklist.length > 0 || canAddChecks) && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium"><ListChecks className="size-4 text-primary" /> On-site checklist</p>
              {job.checklist.length > 0 && <span className="text-xs text-muted-foreground">{checkDone}/{job.checklist.length}</span>}
            </div>
            {job.checklist.length > 0 && (
              <div className="space-y-1">
                {job.checklist.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40">
                    <Checkbox checked={c.done === 1} onCheckedChange={(v) => toggleCheck(c.id, Boolean(v))} className="size-5" />
                    <span className={cn("text-sm", c.done && "text-muted-foreground line-through")}>{c.label}</span>
                  </label>
                ))}
              </div>
            )}
            {canAddChecks && (
              <form onSubmit={(e) => { e.preventDefault(); addCheckItem() }} className="flex items-center gap-2">
                <Input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} placeholder="Add your own check…" className="h-9" />
                <Button type="submit" size="icon" variant="outline" className="size-9 shrink-0" disabled={!newCheck.trim()} aria-label="Add check"><Plus className="size-4" /></Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages — shown by their real sender (customer vs office) */}
      {job.messages.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><MessageSquare className="size-3.5" /> Messages</p>
            {job.messages.map((m, i) => (
              <div key={i} className={cn("rounded-lg border p-2.5 text-sm", m.is_customer ? "border-amber-500/30 bg-amber-500/5" : "border-border")}>
                <p className="text-[11px] font-medium">{m.is_customer ? `From ${m.from} (customer)` : "From the office"}</p>
                {m.subject && <p className="font-medium">{m.subject}</p>}
                <p className="text-muted-foreground">{m.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {job.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {job.photos.map((p) => (
            <img key={p.id} src={p.url} alt={p.caption ?? "Job photo"} className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      )}

      {/* Notes */}
      {job.notes.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-4">
            {job.notes.map((n, i) => (
              <div key={i} className="text-sm">
                <span className="text-muted-foreground">{n.body}</span>
                <span className="ml-2 text-xs text-muted-foreground/70">{n.author}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />

      {/* On-site tools */}
      {onSite && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={pickPhoto}><Camera /> Add photo</Button>
          <Button variant="outline" onClick={() => setNoteOpen(true)}><StickyNote /> Add note</Button>
          <Button variant="outline" className="col-span-2" disabled={busy} onClick={() => setHoldOpen(true)}>
            <PauseCircle /> Put on hold
          </Button>
        </div>
      )}

      {/* Primary action — inline (in flow) so it never covers the on-site tools */}
      {done ? (
        <div className="mt-1 flex items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5" /> Job complete — the office handles the invoice
        </div>
      ) : onSite ? (
        <Button size="lg" className="mt-1 h-12 w-full text-base" disabled={busy} onClick={() => setSignOpen(true)}>
          {busy && <Loader2 className="animate-spin" />} Mark job complete
        </Button>
      ) : primary ? (
        <Button size="lg" className="mt-1 h-12 w-full text-base" disabled={busy} onClick={() => move(primary.to)}>
          {busy && <Loader2 className="animate-spin" />} {primary.label}
        </Button>
      ) : null}

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a note</DialogTitle></DialogHeader>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened on site? Rough notes are fine — tap Polish with AI." />
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={polishNote} disabled={noteAiBusy || !note.trim()}>
            {noteAiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Polish with AI
          </Button>
          <p className="text-xs text-muted-foreground">AI tidies your note so the office and customer get a clear picture. Review before saving.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={!note.trim()}>Save note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign-off dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Customer sign-off</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="signoff">Name of person signing off</Label>
            <Input id="signoff" value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="e.g. Margaret Hughes" />
            <p className="text-xs text-muted-foreground">Confirms the work is done to their satisfaction.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)}>Cancel</Button>
            <Button onClick={complete} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Complete job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Put-on-hold dialog */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Put job on hold</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hold-reason">Reason</Label>
              <Textarea id="hold-reason" rows={3} value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="e.g. No access, awaiting part, customer not in…" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="parts" checked={partsNeeded} onCheckedChange={(v) => setPartsNeeded(Boolean(v))} />
              <Label htmlFor="parts" className="font-normal">An order / parts are needed</Label>
            </div>
            {partsNeeded && (
              <div className="space-y-2">
                <Label htmlFor="parts-note">What to order</Label>
                <Input id="parts-note" value={partsNote} onChange={(e) => setPartsNote(e.target.value)} placeholder="e.g. Worcester PCB 87161463250" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>Cancel</Button>
            <Button onClick={putOnHold} disabled={busy || !holdReason.trim()}>{busy && <Loader2 className="animate-spin" />} Put on hold</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
