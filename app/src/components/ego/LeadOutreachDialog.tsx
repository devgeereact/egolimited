import { useEffect, useMemo, useState } from "react"
import { Loader2, Send, Wand2, Eye, Pencil } from "lucide-react"
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

/** Client-side mirror of the server merge — fills the recipient tokens so the office
 *  sees exactly what this lead will receive. Sender tokens fill on send. */
function mergePreview(text: string, lead: Lead | null): string {
  if (!lead) return text
  const first = (lead.name || lead.company || "").trim().split(/\s+/)[0] || "there"
  const company = (lead.company || "your business").trim()
  const map: Record<string, string> = {
    first_name: first, firstname: first, name: first, "first name": first,
    full_name: lead.name || first,
    company, company_name: company, agency_name: company, business_name: company,
    organisation: company, organization: company,
    website: lead.website || "",
  }
  return text
    .replace(/\{\{\s*([a-z0-9_ ]+?)\s*\}\}/gi, (_m, k: string) => {
      const key = k.toLowerCase().trim()
      if (key in map) return map[key]
      if (["sender_name", "sender_company", "from_company", "our_company"].includes(key)) return "EGO LTD"
      return ""
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
}

export default function LeadOutreachDialog({ lead, templates, open, onOpenChange, onSent }: Props) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [brief, setBrief] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState(false)

  const mergedSubject = useMemo(() => mergePreview(subject, lead), [subject, lead])
  const mergedBody = useMemo(() => mergePreview(body, lead), [body, lead])

  // Fresh slate each time the dialog opens for a lead.
  useEffect(() => { if (open) { setSubject(""); setBody(""); setBrief(""); setPreview(false) } }, [open, lead?.id])

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

          <div className="flex items-center justify-between">
            <Label>{preview ? "Preview — as this lead receives it" : "Compose"}</Label>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => setPreview((p) => !p)} disabled={!subject && !body}>
              {preview ? <><Pencil className="size-3.5" /> Edit</> : <><Eye className="size-3.5" /> Preview merge</>}
            </Button>
          </div>
          {preview ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-semibold">{mergedSubject || <span className="text-muted-foreground">(no subject)</span>}</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{mergedBody || "(empty)"}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write, load a preset, or use AI. {{first_name}} and {{company}} fill from this lead." />
              </div>
            </>
          )}
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
