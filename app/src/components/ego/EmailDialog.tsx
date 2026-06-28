import { useEffect, useState } from "react"
import { Loader2, Sparkles, Send } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  to: string
  toName?: string
  /** Let the user type/change the recipient (compose mode). */
  editableTo?: boolean
  customerName?: string
  /** Short context for the AI draft, e.g. "Job MB1123-J1 'Boiler repair', status scheduled". */
  context?: string
  jobId?: number
  customerId?: number
  onSent?: () => void
}

export default function EmailDialog({ open, onOpenChange, to, toName, customerName, context, jobId, customerId, editableTo, onSent }: Props) {
  const [recipient, setRecipient] = useState(to)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [instruction, setInstruction] = useState("")
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)

  useEffect(() => { if (open) setRecipient(to) }, [open, to])

  async function draft() {
    setAiBusy(true)
    try {
      const prompt =
        `You are writing a short, friendly, professional email on behalf of EGO LIMITED, a UK home & commercial maintenance company.\n` +
        `Recipient: ${customerName ?? to}.\n` +
        (context ? `Context: ${context}.\n` : "") +
        (instruction ? `The email should: ${instruction}.\n` : "Write a brief, polite update.\n") +
        `Return ONLY the email body text (no subject line). Sign off as "EGO LIMITED".`
      const r = await api<{ text: string }>("/ai/draft", { method: "POST", body: { prompt } })
      setBody(r.text)
      if (!subject) setSubject(context ? `Update on your job` : `A note from EGO LIMITED`)
      toast.success("Draft ready — review before sending")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI draft failed")
    } finally {
      setAiBusy(false)
    }
  }

  async function sendEmail() {
    if (!recipient.trim() || !subject.trim() || !body.trim()) { toast.error("Recipient, subject and body required"); return }
    setBusy(true)
    try {
      await api("/email/send", { method: "POST", body: { to: recipient.trim(), to_name: toName, subject, body, job_id: jobId, customer_id: customerId } })
      toast.success(`Emailed ${recipient}`)
      onOpenChange(false); setSubject(""); setBody(""); setInstruction("")
      onSent?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Email failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Email {customerName ?? to}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="em-to">To</Label>
            <Input id="em-to" value={recipient} onChange={(e) => setRecipient(e.target.value)} disabled={!editableTo} placeholder="name@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-subj">Subject</Label>
            <Input id="em-subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          </div>

          {/* AI draft */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <Label className="text-xs text-muted-foreground">AI draft (OpenRouter) — you approve before sending</Label>
            <div className="mt-1.5 flex gap-2">
              <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="What should it say? (optional)" className="h-9" />
              <Button type="button" variant="outline" onClick={draft} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Draft
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="em-body">Message</Label>
            <Textarea id="em-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message, or use AI draft…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={sendEmail} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
