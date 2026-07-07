import { useEffect, useMemo, useState } from "react"
import { Loader2, Send, Sparkles, Plus, Trash2, Users, UserRound, Mail, ImageIcon, X, Search, Check, ContactRound, Zap } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { confirmDialog } from "@/components/ego/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

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

type Audience = "subscribers" | "customers" | "all" | "leads"
interface Template { id: number; name: string; subject: string | null; body: string | null }

interface Lead {
  id: number
  name: string | null
  company: string | null
  email: string | null
  website: string | null
  source_url: string | null
  note: string | null
  status: "found" | "approved" | "rejected" | "emailed"
  search_query: string | null
  emailed_at: string | null
  created_at: string
}
interface LeadsResponse { leads: Lead[]; counts: Record<string, number> }

interface AutomationConfig {
  enabled: number
  subject: string | null
  body: string | null
  image_url: string | null
  batch_size: number
}
interface AutomationResponse { automation: AutomationConfig | null; approved_leads: number }

export default function CampaignsPage() {
  const [data, setData] = useState<SubsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({})

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

  // leads (M17: prospecting)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadStatus, setLeadStatus] = useState<Lead["status"]>("found")
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLocation, setSearchLocation] = useState("")
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // automation (M17: unattended drip via campaign_cron.php)
  const [auto, setAuto] = useState<AutomationResponse | null>(null)
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [autoSubject, setAutoSubject] = useState("")
  const [autoBody, setAutoBody] = useState("")
  const [autoBatch, setAutoBatch] = useState(25)
  const [autoSaving, setAutoSaving] = useState(false)

  function load() {
    return api<SubsResponse>("/subscribers")
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load subscribers"))
      .finally(() => setLoading(false))
  }
  function loadLeadCounts() {
    api<LeadsResponse>("/leads").then((r) => setLeadCounts(r.counts)).catch(() => {})
  }
  useEffect(() => {
    load()
    loadLeadCounts()
    api<{ templates: Template[] }>("/email-templates").then((r) => setTemplates(r.templates)).catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load templates"))
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
    if (audience === "leads") return leadCounts.approved ?? 0
    if (!data) return 0
    if (audience === "subscribers") return data.subscriber_count
    if (audience === "customers") return data.customer_email_count
    return data.subscriber_count + data.customer_email_count // upper bound (deduped on send)
  }, [audience, data, leadCounts])

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
    if (!(await confirmDialog({ title: `Send to ${audienceCount} recipient${audienceCount === 1 ? "" : "s"}?`, body: `Audience: ${audience}.`, confirmText: "Send" }))) return
    setSending(true)
    try {
      const r = await api<{ sent: number; failed: number; recipients: number }>("/campaigns/send", {
        method: "POST", body: { audience, subject, body: bodyText, image_url: imageUrl || undefined },
      })
      toast.success(`Sent to ${r.sent} of ${r.recipients}${r.failed ? ` · ${r.failed} failed` : ""}`)
      setSubject(""); setBodyText(""); setBrief(""); setImageUrl(""); setImagePrompt("")
      if (audience === "leads") loadLeadCounts()
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

  // ---- Leads (M17) ----
  function loadLeads(status: Lead["status"]) {
    setLeadsLoading(true)
    setSelected(new Set())
    api<LeadsResponse>(`/leads?status=${status}`)
      .then((r) => { setLeads(r.leads); setLeadCounts(r.counts) })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load leads"))
      .finally(() => setLeadsLoading(false))
  }
  useEffect(() => { loadLeads(leadStatus) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadStatus])

  async function runLeadSearch() {
    if (!searchQuery.trim()) { toast.error("Describe the kind of business to look for"); return }
    setSearching(true)
    try {
      const r = await api<{ found: number; skipped: number }>("/leads/search", {
        method: "POST", body: { query: searchQuery, location: searchLocation || undefined },
      })
      toast.success(`Found ${r.found} new prospect${r.found === 1 ? "" : "s"}${r.skipped ? ` · ${r.skipped} skipped` : ""} — review before approving`)
      if (leadStatus === "found") loadLeads("found"); else loadLeadCounts()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Search failed") }
    finally { setSearching(false) }
  }

  function toggleLead(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function bulkAction(action: "approve" | "reject") {
    if (!selected.size) { toast.error("Select at least one lead"); return }
    try {
      const r = await api<{ ok: boolean; count: number }>(`/leads/${action}`, { method: "POST", body: { ids: Array.from(selected) } })
      toast.success(`${action === "approve" ? "Approved" : "Rejected"} ${r.count}`)
      loadLeads(leadStatus)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't update") }
  }

  async function deleteLead(id: number) {
    try { await api("/leads/delete", { method: "POST", body: { id } }); loadLeads(leadStatus) }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't remove") }
  }

  // ---- Automation (M17) ----
  function loadAutomation() {
    setAutoLoading(true)
    api<AutomationResponse>("/campaigns/automation")
      .then((r) => {
        setAuto(r)
        setAutoEnabled(!!r.automation?.enabled)
        setAutoSubject(r.automation?.subject ?? "")
        setAutoBody(r.automation?.body ?? "")
        setAutoBatch(r.automation?.batch_size ?? 25)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load automation"))
      .finally(() => setAutoLoading(false))
  }
  useEffect(() => { loadAutomation() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function saveAutomation(nextEnabled: boolean) {
    if (nextEnabled && (!autoSubject.trim() || !autoBody.trim())) {
      toast.error("Write a subject and message before turning automation on")
      return
    }
    setAutoSaving(true)
    try {
      await api("/campaigns/automation", {
        method: "POST",
        body: { enabled: nextEnabled, subject: autoSubject, body: autoBody, batch_size: autoBatch },
      })
      setAutoEnabled(nextEnabled)
      toast.success(nextEnabled ? "Automation on — the cron job will drip approved leads" : "Automation off")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save") }
    finally { setAutoSaving(false) }
  }

  const audiences: { id: Audience; label: string; icon: typeof Users; count: number }[] = [
    { id: "subscribers", label: "Subscribers", icon: Mail, count: data?.subscriber_count ?? 0 },
    { id: "customers", label: "Customers", icon: UserRound, count: data?.customer_email_count ?? 0 },
    { id: "leads", label: "Approved leads", icon: ContactRound, count: leadCounts.approved ?? 0 },
    { id: "all", label: "Everyone", icon: Users, count: (data?.subscriber_count ?? 0) + (data?.customer_email_count ?? 0) },
  ]

  const statusTabs: { id: Lead["status"]; label: string }[] = [
    { id: "found", label: "New" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "emailed", label: "Emailed" },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Send updates, find new prospects, and (optionally) drip approved leads automatically. The AI can draft and search — you always review before anything sends.</p>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="leads">
            Leads {leadCounts.found ? <Badge variant="secondary" className="ml-1.5">{leadCounts.found}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* ===================== COMPOSE ===================== */}
        <TabsContent value="compose">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader><CardTitle className="text-base">Compose a campaign</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  {audience === "leads" && !leadCounts.approved && (
                    <p className="text-xs text-muted-foreground">No approved leads yet — find and approve some in the Leads tab first.</p>
                  )}
                </div>

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
        </TabsContent>

        {/* ===================== LEADS ===================== */}
        <TabsContent value="leads">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Find prospects</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">AI searches the web for businesses that match. Only publicly published emails are captured — nothing is emailed until you approve it below.</p>
                <div className="space-y-2">
                  <Label>What kind of business?</Label>
                  <Textarea rows={2} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. letting agents managing 20+ properties" />
                </div>
                <div className="space-y-2">
                  <Label>Location (optional)</Label>
                  <Input value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} placeholder="e.g. South-East London" />
                </div>
                <Button onClick={runLeadSearch} disabled={searching} className="w-full">
                  {searching ? <Loader2 className="animate-spin" /> : <Search className="size-4" />} Search
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Prospects</CardTitle>
                {selected.size > 0 && leadStatus === "found" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => bulkAction("approve")}><Check className="size-4" /> Approve {selected.size}</Button>
                    <Button size="sm" variant="outline" onClick={() => bulkAction("reject")}>Reject {selected.size}</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {statusTabs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setLeadStatus(s.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        leadStatus === s.id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/50",
                      )}
                    >
                      {s.label} {leadCounts[s.id] ? `(${leadCounts[s.id]})` : ""}
                    </button>
                  ))}
                </div>

                {leadsLoading ? (
                  <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
                ) : !leads.length ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {leadStatus === "found" ? "No new prospects — try a search on the left." : `No ${leadStatus} leads.`}
                  </p>
                ) : (
                  <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto rounded-lg border">
                    {leads.map((l) => (
                      <li key={l.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                        {leadStatus === "found" && (
                          <input
                            type="checkbox"
                            className="mt-1 size-4 shrink-0"
                            checked={selected.has(l.id)}
                            onChange={() => toggleLead(l.id)}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{l.company || l.name || l.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{l.email || "no public email found"}{l.website ? ` · ${l.website}` : ""}</p>
                          {l.note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{l.note}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteLead(l.id)} aria-label="Remove">
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== AUTOMATION ===================== */}
        <TabsContent value="automation">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="text-base flex items-center gap-1.5"><Zap className="size-4 text-accent" /> Auto-drip to approved leads</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                When on, the scheduled job (<code>campaign_cron.php</code>, runs every 1-2h) sends this message to a small batch of
                approved leads that haven't been emailed yet — a fresh segment each run, never a repeat send to the same person.
              </p>
              {autoLoading ? (
                <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Automation</p>
                      <p className="text-xs text-muted-foreground">{auto?.approved_leads ?? 0} approved lead{(auto?.approved_leads ?? 0) === 1 ? "" : "s"} waiting to be drip-sent</p>
                    </div>
                    <Switch checked={autoEnabled} disabled={autoSaving} onCheckedChange={(v) => saveAutomation(v)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input value={autoSubject} onChange={(e) => setAutoSubject(e.target.value)} placeholder="Subject line" />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea rows={8} value={autoBody} onChange={(e) => setAutoBody(e.target.value)} placeholder="What every drip email says. {{first_name}} and {{company}} are personalised per lead." />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch size per run</Label>
                    <Input type="number" min={1} max={100} value={autoBatch} onChange={(e) => setAutoBatch(Number(e.target.value) || 25)} className="max-w-[8rem]" />
                    <p className="text-xs text-muted-foreground">How many approved leads get emailed each time the cron job runs.</p>
                  </div>

                  <Button onClick={() => saveAutomation(autoEnabled)} disabled={autoSaving} className="w-full sm:w-auto">
                    {autoSaving ? <Loader2 className="animate-spin" /> : <Check className="size-4" />} Save message
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
