import { useEffect, useState } from "react"
import { Loader2, Send, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TokenHint } from "@/components/ego/TokenHint"

interface Lead {
  id: number
  name: string | null
  company: string | null
  email: string | null
  website: string | null
  note: string | null
}
interface Template { id: number; name: string; subject: string | null; body: string | null }

interface Props {
  lead: Lead | null
  templates: Template[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSent: () => void
}

export default function LeadOutreachDialog({ lead, templates, open, onOpenChange, onSent }: Props) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [brief, setBrief] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)

  // Fresh slate each time the dialog opens for a lead.
  useEffect(() => { if (open) { setSubject(""); setBody(""); setBrief("") } }, [open, lead?.id])

  function usePreset(id: string) {
    const t = templates.find((x) => String(x.id) === id)
    if (!t) return
    setSubject(t.subject ?? "")
    setBody(t.body ?? "")
    toast.success(`Loaded "${t.name}" — {{first_name}} / {{company}} fill on send`)
  }

  async function draft() {
    if (!lead) return
    setDrafting(true)
    try {
      const r = await api<{ subject: string; body: string }>("/leads/draft", { method: "POST", body: { id: lead.id, brief } })
      if (r.subject) setSubject(r.subject)
      setBody(r.body || "")
      toast.success("Draft ready — review before sending")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Draft failed") } finally { setDrafting(false) }
  }

  async function send() {
    if (!lead) return
    if (!subject.trim() || !body.trim()) { toast.error("Add a subject and a message"); return }
    setSending(true)
    try {
      const r = await api<{ to: string }>("/leads/email", { method: "POST", body: { id: lead.id, subject, body } })
      toast.success(`Sent to ${r.to}`)
      onOpenChange(false); onSent()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed") } finally { setSending(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="truncate">Email {lead?.company || lead?.name || lead?.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            To <span className="font-medium text-foreground">{lead?.email}</span>
            {lead?.website ? <> · {lead.website}</> : null}
            <TokenHint className="mt-1.5" />
          </div>

          {/* Preset + AI draft */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Start from a preset</Label>
              <Select onValueChange={usePreset}>
                <SelectTrigger><SelectValue placeholder="Pick a sequence…" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">…or let AI draft it</Label>
              <div className="flex gap-2">
                <Input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Optional angle…" className="flex-1" />
                <Button type="button" variant="outline" onClick={draft} disabled={drafting}>
                  {drafting ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write, load a preset, or use AI. {{first_name}} and {{company}} fill from this lead." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending || drafting}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
