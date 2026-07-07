import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
  /** Fixed job (from job detail). Omit to show a job picker (from calendar). */
  jobId?: number
  /** Jobs to choose from when no fixed jobId. */
  pickJobs?: { id: number; reference: string; title: string }[]
  defaults?: { engineer_id?: number | null; date?: string; start?: string; end?: string }
}

export default function ScheduleDialog({ open, onOpenChange, onDone, jobId, pickJobs, defaults }: Props) {
  const [engineers, setEngineers] = useState<{ id: number; name: string; available: number }[]>([])
  const [selectedJob, setSelectedJob] = useState<string>("")
  const [engineerId, setEngineerId] = useState<string>(defaults?.engineer_id ? String(defaults.engineer_id) : "")
  const [date, setDate] = useState(defaults?.date ?? "")
  const [start, setStart] = useState(defaults?.start ?? "09:00")
  const [end, setEnd] = useState(defaults?.end ?? "11:00")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    api<{ engineers: { id: number; name: string; available: number }[] }>("/engineers").then((r) => setEngineers(r.engineers))
    // refresh prefilled date/time when reopened from a calendar selection
    if (defaults?.date) setDate(defaults.date)
    if (defaults?.start) setStart(defaults.start)
    if (defaults?.end) setEnd(defaults.end)
  }, [open, defaults?.date, defaults?.start, defaults?.end])

  async function submit() {
    const id = jobId ?? Number(selectedJob)
    if (!id) { toast.error("Pick a job"); return }
    if (!date) { toast.error("Pick a date"); return }
    setBusy(true)
    try {
      await api("/jobs/schedule", {
        method: "POST",
        body: { id, engineer_id: engineerId || null, scheduled_start: `${date} ${start}:00`, scheduled_end: `${date} ${end}:00` },
      })
      toast.success("Job scheduled")
      onOpenChange(false); onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't schedule")
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA" && !busy) { e.preventDefault(); void submit() } }}>
        <DialogHeader><DialogTitle>Schedule &amp; assign</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!jobId && (
            <div className="space-y-2">
              <Label>Job</Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger><SelectValue placeholder="Pick a job to schedule…" /></SelectTrigger>
                <SelectContent>
                  {(pickJobs ?? []).map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>{j.reference} · {j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Engineer</Label>
            <Select value={engineerId} onValueChange={setEngineerId}>
              <SelectTrigger><SelectValue placeholder="Assign an engineer…" /></SelectTrigger>
              <SelectContent>
                {engineers.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)} disabled={!e.available}>
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", e.available ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                      {e.name}{!e.available && <span className="text-xs text-muted-foreground">· Away</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-date">Date</Label>
            <Input id="sched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sched-start">From</Label>
              <Input id="sched-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-end">To</Label>
              <Input id="sched-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
