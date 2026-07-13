import { useEffect, useState } from "react"
import {
  Clock, Eye, Loader2, Mail, Pause, Play, Plus, Send, Sparkles, Trash2, TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { invalidate, useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { confirmDialog } from "@/components/ego/confirm"
import { TokenHint } from "@/components/ego/TokenHint"

import type { Campaign, Step } from "./types"

/**
 * The right-hand pane: the sequence itself, and the one button that makes it send.
 *
 * Two things here are deliberate and load-bearing:
 *
 *  - PREVIEW IS RENDERED BY THE SERVER (`POST /campaigns/preview`). v1 had a second merge
 *    implementation in the browser that hardcoded the company name, so the preview could show
 *    something different from what actually went out. If the preview and the send can disagree,
 *    the preview is a lie, and a person will send that lie to a stranger.
 *
 *  - NOTHING SENDS UNTIL SOMEONE PRESSES START. There is no hidden automation toggle. Starting
 *    requires at least one step and at least one recipient, and the server enforces both.
 */
export default function SequenceEditor({ campaign }: { campaign: Campaign }) {
  const { data } = useApi<{ campaign: Campaign; steps: Step[] }>(`/campaigns/get?id=${campaign.id}`)
  const steps = data?.steps ?? []

  const [busy, setBusy] = useState(false)

  async function setStatus(status: "active" | "paused") {
    setBusy(true)
    try {
      await api("/campaigns/status", { method: "POST", body: { id: campaign.id, status } })
      toast.success(status === "active" ? "Campaign started — the first emails go out on the next run" : "Paused. Nothing further will send.")
      invalidate("/campaigns")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change the campaign")
    } finally {
      setBusy(false)
    }
  }

  const live = campaign.status === "active"

  return (
    <div className="flex h-full flex-col">
      {/* Header — name, what it's doing, and the one control that matters */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{campaign.name}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {campaign.total} recipient{campaign.total === 1 ? "" : "s"} · {campaign.sent} sent
            {campaign.queued > 0 && <> · {campaign.queued} queued</>}
            {campaign.replied > 0 && <> · <span className="font-medium text-emerald-600">{campaign.replied} replied</span></>}
            {campaign.failed > 0 && <> · <span className="font-medium text-red-600">{campaign.failed} failed</span></>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {live ? (
            <Button variant="outline" size="sm" onClick={() => setStatus("paused")} disabled={busy}>
              <Pause className="size-4" /> Pause
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStatus("active")} disabled={busy || campaign.status === "completed"}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {campaign.status === "paused" ? "Resume" : "Start sending"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* An honest warning rather than a silent failure at 3am. */}
        {campaign.failed > 0 && (
          <Card className="mb-4 border-red-500/30 bg-red-500/5">
            <CardContent className="flex items-center gap-2.5 p-3 text-sm">
              <TriangleAlert className="size-4 shrink-0 text-red-600" />
              <span>
                {campaign.failed} email{campaign.failed === 1 ? "" : "s"} couldn&apos;t be delivered. Check SMTP in
                Settings → Integrations.
              </span>
            </CardContent>
          </Card>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sequence</h2>
          <p className="text-xs text-muted-foreground">Each step waits after the one before it</p>
        </div>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <StepCard key={s.id} campaign={campaign} step={s} first={i === 0} />
          ))}
          <NewStep campaign={campaign} nextNo={steps.length + 1} />
        </div>

        {steps.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            A sequence is a few short, useful emails spaced out over a couple of weeks.
            <br />
            Write the first one — you can always add more.
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ one step */

function StepCard({ campaign, step, first }: { campaign: Campaign; step: Step; first: boolean }) {
  const [subject, setSubject] = useState(step.subject)
  const [body, setBody] = useState(step.body)
  const [delay, setDelay] = useState(step.delay_days)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const [brief, setBrief] = useState("")
  const [drafting, setDrafting] = useState(false)

  // Re-seed from the server whenever this step changes underneath us.
  useEffect(() => { setSubject(step.subject); setBody(step.body); setDelay(step.delay_days) }, [step])

  const dirty = subject !== step.subject || body !== step.body || delay !== step.delay_days

  async function save() {
    setSaving(true)
    try {
      // image_url is round-tripped. v1's step editor never sent it, so editing a step just to change
      // its delay silently wiped any image off it.
      await api("/campaigns/steps", {
        method: "POST",
        body: { id: step.id, campaign_id: campaign.id, subject, body, delay_days: delay, image_url: step.image_url },
      })
      toast.success(`Step ${step.step_no} saved`)
      invalidate("/campaigns")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save")
    } finally { setSaving(false) }
  }

  async function draft() {
    if (!brief.trim()) { toast.error("Say what this email should do"); return }
    setDrafting(true)
    try {
      const r = await api<{ subject: string; body: string }>("/campaigns/draft", { method: "POST", body: { brief } })
      if (r.subject) setSubject(r.subject)
      if (r.body) setBody(r.body)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI couldn't help right now")
    } finally { setDrafting(false) }
  }

  /** Ask the SERVER what this will look like. Never re-implement the merge in the browser. */
  async function showPreview() {
    try {
      const r = await api<{ subject: string; body: string }>("/campaigns/preview", {
        method: "POST", body: { subject, body },
      })
      setPreview(r)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't render the preview")
    }
  }

  async function sendTest() {
    try {
      const r = await api<{ to: string }>("/campaigns/test", { method: "POST", body: { subject, body, image_url: step.image_url } })
      toast.success(`Test sent to ${r.to}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the test")
    }
  }

  async function remove() {
    if (!(await confirmDialog({
      title: `Delete step ${step.step_no}?`,
      body: "Anyone who already received it keeps it — this only stops it going to the rest.",
      confirmText: "Delete step",
      danger: true,
    }))) return
    await api("/campaigns/steps/delete", { method: "POST", body: { id: step.id } })
    invalidate("/campaigns")
    toast.success("Step deleted")
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {step.step_no}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {first ? (
              <span>Sent as soon as they&apos;re added</span>
            ) : (
              <span className="flex items-center gap-1.5">
                Wait
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="h-7 w-16 text-center"
                  aria-label={`Days to wait before step ${step.step_no}`}
                />
                day{delay === 1 ? "" : "s"} after the previous email
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={showPreview} aria-label="Preview" title="Preview">
              <Eye className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={sendTest} aria-label="Send a test to me" title="Send a test to me">
              <Send className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
              onClick={remove} aria-label={`Delete step ${step.step_no}`} title="Delete step">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="font-medium" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Write the email…" />
        <TokenHint />

        <div className="flex flex-wrap items-center gap-2">
          <Input value={brief} onChange={(e) => setBrief(e.target.value)}
            placeholder="Tell the AI what this email should do…" className="h-8 flex-1 min-w-48 text-sm" />
          <Button variant="outline" size="sm" onClick={draft} disabled={drafting}>
            {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Draft
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {dirty ? "Save" : "Saved"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-4" /> What they&apos;ll actually receive
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Rendered by the server with the same merge the send uses — so this is exactly what goes out.
          </p>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-sm font-semibold">{preview?.subject}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{preview?.body}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* ------------------------------------------------------------------ add a step */

function NewStep({ campaign, nextNo }: { campaign: Campaign; nextNo: number }) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [delay, setDelay] = useState(nextNo === 1 ? 0 : 3)
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!subject.trim() || !body.trim()) { toast.error("A step needs a subject and a message"); return }
    setSaving(true)
    try {
      await api("/campaigns/steps", {
        method: "POST",
        body: { campaign_id: campaign.id, subject, body, delay_days: delay },
      })
      setSubject(""); setBody(""); setOpen(false)
      invalidate("/campaigns")
      toast.success(`Step ${nextNo} added`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add the step")
    } finally { setSaving(false) }
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add {nextNo === 1 ? "the first email" : `step ${nextNo}`}
      </Button>
    )
  }

  return (
    <Card className={cn("border-primary/40")}>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold">Step {nextNo}</p>
        {nextNo > 1 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Label htmlFor="new-delay">Wait</Label>
            <Input id="new-delay" type="number" min={0} max={365} value={delay}
              onChange={(e) => setDelay(Number(e.target.value))} className="h-7 w-16 text-center" />
            days after the previous email
          </div>
        )}
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Write the email…" />
        <TokenHint />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={add} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Add step
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
