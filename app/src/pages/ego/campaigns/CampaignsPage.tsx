import { useEffect, useMemo, useState } from "react"
import { Loader2, Send, Sparkles, Plus, Trash2, Users, UserRound, Mail, ImageIcon, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Subscriber {
  id: number
  email: string
  name: string | null
  source: string
  subscribed: number
  created_at: string
}
interface SubsResponse {
  subscribers: Subscriber[]
  subscriber_count: number
  customer_email_count: number
}

type Audience = "subscribers" | "customers" | "all"
interface Template { id: number; name: string; subject: string | null; body: string | null }

export default function CampaignsPage() {
  const [data, setData] = useState<SubsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])

  // compose
  const [audience, setAudience] = useState<Audience>("subscribers")
  const [subject, setSubject] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [brief, setBrief] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  // AI header image (makes the email read like a post)
  const [imagePrompt, setImagePrompt] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imaging, setImaging] = useState(false)

  // add subscriber
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)

  function load() {
    return api<SubsResponse>("/subscribers")
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load subscribers"))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
    api<{ templates: Template[] }>("/email-templates").then((r) => setTemplates(r.templates)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function useTemplate(id: string) {
    const t = templates.find((x) => String(x.id) === id)
    if (!t) return
    setSubject(t.subject ?? "")
    setBodyText(t.body ?? "")
    toast.success(`Loaded "${t.name}" — personalise the {{tokens}} before sending`)
  }

  // Save the current subject/body back as a reusable brand template (e.g. an email
  // sequence step) so it's there next time. Lands in the same picker above.
  async function saveAsTemplate() {
    if (!subject.trim() && !bodyText.trim()) { toast.error("Write a subject or message first"); return }
    const name = window.prompt("Save this as a template called:")
    if (!name?.trim()) return
    try {
      await api("/email-templates", { method: "POST", body: { name: name.trim(), subject, body: bodyText, kind: "campaign" } })
      const r = await api<{ templates: Template[] }>("/email-templates")
      setTemplates(r.templates)
      toast.success(`Saved "${name.trim()}" to your templates`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save template") }
  }

  async function genImage() {
    if (!imagePrompt.trim()) { toast.error("Describe the image you want"); return }
    setImaging(true)
    try {
      const r = await api<{ url: string }>("/ai/image", { method: "POST", body: { prompt: imagePrompt } })
      setImageUrl(r.url)
      toast.success("Image ready — it sits at the top of the email")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Image generation failed") }
    finally { setImaging(false) }
  }

  const audienceCount = useMemo(() => {
    if (!data) return 0
    if (audience === "subscribers") return data.subscriber_count
    if (audience === "customers") return data.customer_email_count
    return data.subscriber_count + data.customer_email_count // upper bound (deduped on send)
  }, [audience, data])

  async function draftWithAI() {
    if (!brief.trim()) { toast.error("Tell the AI what the message should say"); return }
    setDrafting(true)
    try {
      const r = await api<{ subject: string; body: string }>("/campaigns/draft", {
        method: "POST", body: { brief, kind: "marketing" },
      })
      if (r.subject) setSubject(r.subject)
      setBodyText(r.body || "")
      toast.success("Draft ready — review and edit before sending")
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI draft failed") }
    finally { setDrafting(false) }
  }

  async function send() {
    if (!subject.trim() || !bodyText.trim()) { toast.error("Add a subject and a message"); return }
    if (!confirm(`Send this to ${audienceCount} recipient${audienceCount === 1 ? "" : "s"} (${audience})?`)) return
    setSending(true)
    try {
      const r = await api<{ sent: number; failed: number; recipients: number }>("/campaigns/send", {
        method: "POST", body: { audience, subject, body: bodyText, image_url: imageUrl || undefined },
      })
      toast.success(`Sent to ${r.sent} of ${r.recipients}${r.failed ? ` · ${r.failed} failed` : ""}`)
      setSubject(""); setBodyText(""); setBrief(""); setImageUrl(""); setImagePrompt("")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed") }
    finally { setSending(false) }
  }

  async function addSubscriber() {
    if (!newEmail.trim()) return
    setAdding(true)
    try {
      await api("/subscribers", { method: "POST", body: { email: newEmail, name: newName || null } })
      setNewEmail(""); setNewName("")
      await load()
      toast.success("Contact added")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add") }
    finally { setAdding(false) }
  }

  async function removeSubscriber(id: number) {
    try { await api("/subscribers/delete", { method: "POST", body: { id } }); await load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't remove") }
  }

  const audiences: { id: Audience; label: string; icon: typeof Users; count: number }[] = [
    { id: "subscribers", label: "Subscribers", icon: Mail, count: data?.subscriber_count ?? 0 },
    { id: "customers", label: "Customers", icon: UserRound, count: data?.customer_email_count ?? 0 },
    { id: "all", label: "Everyone", icon: Users, count: (data?.subscriber_count ?? 0) + (data?.customer_email_count ?? 0) },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Send a one-off update or marketing email to your subscribers and customers. The AI can draft it — you always review before it sends.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Compose */}
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Compose a campaign</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Audience */}
            <div className="space-y-2">
              <Label>Audience</Label>
              <div className="grid grid-cols-3 gap-2">
                {audiences.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAudience(a.id)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                      audience === a.id ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-border hover:border-accent/50",
                    )}
                  >
                    <a.icon className="size-4 text-accent" />
                    <span className="text-sm font-medium">{a.label}</span>
                    <span className="text-xs text-muted-foreground">{a.count} {a.count === 1 ? "person" : "people"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start from a saved brand template */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Start from a template</Label>
                <Select onValueChange={useTemplate}>
                  <SelectTrigger><SelectValue placeholder="Pick a saved brand template…" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* AI draft */}
            <div className="space-y-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3">
              <Label className="flex items-center gap-1.5 text-sm"><Sparkles className="size-4 text-accent" /> Draft with AI</Label>
              <Textarea rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. A spring offer: 10% off planned maintenance booked in March, friendly and short." />
              <Button variant="outline" size="sm" onClick={draftWithAI} disabled={drafting}>
                {drafting ? <Loader2 className="animate-spin" /> : <Sparkles className="size-4" />} Generate draft
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" rows={10} value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="Write your message, or generate a draft above…" />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Sends on the EGO branded email template. Plain line breaks become paragraphs.</p>
                <Button type="button" variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={saveAsTemplate}>
                  <Plus className="size-4" /> Save as template
                </Button>
              </div>
            </div>

            {/* AI header image — makes the campaign read like a post */}
            <div className="space-y-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3">
              <Label className="flex items-center gap-1.5 text-sm"><ImageIcon className="size-4 text-accent" /> Header image (optional)</Label>
              {imageUrl ? (
                <div className="relative overflow-hidden rounded-lg border">
                  <img src={imageUrl} alt="" className="block max-h-48 w-full object-cover" />
                  <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 size-7" onClick={() => setImageUrl("")} aria-label="Remove image"><X className="size-4" /></Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="e.g. a freshly painted bright hallway, warm daylight" />
                  <Button type="button" variant="outline" size="sm" onClick={genImage} disabled={imaging} className="shrink-0">
                    {imaging ? <Loader2 className="animate-spin" /> : <ImageIcon className="size-4" />} Generate
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Sits at the top of the email. Needs an image model set in Settings → Integrations.</p>
            </div>

            <Button onClick={send} disabled={sending} className="w-full sm:w-auto">
              {sending ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
              Send to {audienceCount} {audienceCount === 1 ? "person" : "people"}
            </Button>
          </CardContent>
        </Card>

        {/* Subscribers / contacts */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Subscribers &amp; contacts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="email@example.com" />
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (optional)" className="sm:max-w-[10rem]" />
              <Button onClick={addSubscriber} disabled={adding} size="icon" className="shrink-0" aria-label="Add contact">
                {adding ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
            ) : !data?.subscribers.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No subscribers yet. Newsletter signups from the website land here automatically.</p>
            ) : (
              <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-lg border">
                {data.subscribers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name || s.email}</p>
                      {s.name && <p className="truncate text-xs text-muted-foreground">{s.email}</p>}
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.source}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeSubscriber(s.id)} aria-label="Remove">
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
