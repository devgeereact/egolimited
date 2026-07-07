import { useState } from "react"
import { Loader2, Sparkles, Save, Trash2, Clock } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { TemplateSelect } from "@/components/ego/TemplateSelect"
import { TokenHint } from "@/components/ego/TokenHint"

interface Step { id: number; step_no: number; delay_days: number; subject: string | null; body: string | null }
interface Template { id: number; name: string; subject: string | null; body: string | null }

interface Props {
  step: Step
  index: number
  templates: Template[]
  onSaved: () => void
  onDeleted: () => void
  onCancel?: () => void // for an unsaved (new) step
}

export default function SequenceStep({ step, index, templates, onSaved, onDeleted, onCancel }: Props) {
  const [subject, setSubject] = useState(step.subject ?? "")
  const [body, setBody] = useState(step.body ?? "")
  const [delay, setDelay] = useState(step.delay_days ?? (index === 0 ? 0 : 3))
  const [brief, setBrief] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isNew = step.id === 0

  async function draft() {
    if (!brief.trim()) { toast.error("Tell the AI what this touch should say"); return }
    setDrafting(true)
    try {
      const r = await api<{ subject: string; body: string }>("/campaigns/draft", {
        method: "POST",
        body: { brief: `${brief}. Address the reader as {{first_name}} and their business as {{company}} using those exact placeholders.`, kind: "marketing" },
      })
      if (r.subject) setSubject(r.subject)
      setBody(r.body || "")
      toast.success("Draft ready — review it")
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI draft failed") } finally { setDrafting(false) }
  }

  async function save() {
    if (!subject.trim() || !body.trim()) { toast.error("Add a subject and message"); return }
    setSaving(true)
    try {
      await api("/campaigns/steps", { method: "POST", body: { id: step.id || undefined, delay_days: delay, subject, body } })
      toast.success(isNew ? "Step added" : "Step saved")
      onSaved()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save") } finally { setSaving(false) }
  }

  async function del() {
    if (isNew) { onCancel?.(); return }
    setDeleting(true)
    try {
      await api("/campaigns/steps/delete", { method: "POST", body: { id: step.id } })
      toast.success("Step removed")
      onDeleted()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't delete") } finally { setDeleting(false) }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={del} disabled={deleting}>
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {isNew ? "Discard" : "Delete"}
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs"><Clock className="size-3.5" /> {index === 0 ? "Send after approval" : "Wait after previous"}</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={0} max={365} value={delay} onChange={(e) => setDelay(Math.max(0, Number(e.target.value) || 0))} className="w-20" />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label className="text-xs">Start from a preset</Label>
            <TemplateSelect templates={templates} onPick={(t) => { setSubject(t.subject ?? ""); setBody(t.body ?? ""); toast.success(`Loaded "${t.name}"`) }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What this touch says. {{first_name}} and {{company}} fill per lead." />
          <TokenHint />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Or let AI draft this touch…" className="min-w-[10rem] flex-1" />
          <Button type="button" variant="outline" onClick={draft} disabled={drafting}>
            {drafting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} AI
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {isNew ? "Add step" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
