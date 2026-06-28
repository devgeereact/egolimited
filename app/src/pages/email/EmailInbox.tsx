import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import DOMPurify from "dompurify"
import {
  Mail, RefreshCw, ArrowDownLeft, ArrowUpRight, Reply, Loader2, Inbox, Sparkles, Send, PenSquare, Layers,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import EmailDialog from "@/components/ego/EmailDialog"

interface Msg {
  id: number; direction: "inbound" | "outbound"
  from_email: string | null; from_name: string | null; to_email: string | null
  subject: string | null; status: string; created_at: string
  customer_id: number | null; job_id: number | null; customer_name: string | null; job_reference: string | null; body?: string; body_html?: string | null
}

type Folder = "inbox" | "sent" | "all"
const initials = (s: string) => (s || "?").trim().slice(0, 1).toUpperCase()

// Renders a real HTML email with its ORIGINAL formatting (inline styles + <style> kept),
// isolated in a sandboxed iframe so the email's CSS can't leak into / break the app shell.
// Scripts are stripped by sandbox AND by DOMPurify; the frame auto-sizes to its content.
function EmailHtml({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(240)
  const clean = useMemo(
    () => DOMPurify.sanitize(html, { WHOLE_DOCUMENT: true, FORBID_TAGS: ["script"], ADD_ATTR: ["target"] }),
    [html],
  )
  const srcDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<base target="_blank">` +
      `<style>html{color-scheme:light}body{margin:0;padding:4px 2px;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;background:#fff;word-break:break-word}img{max-width:100%;height:auto}a{color:#2563eb}</style>` +
      `</head><body>${clean}</body></html>`,
    [clean],
  )
  function fit() {
    const doc = ref.current?.contentWindow?.document
    // Size the frame to the full email so it never scrolls inside itself — the
    // whole message flows; only the reader pane scrolls (one scrollbar).
    if (doc) setHeight(doc.body.scrollHeight + 8)
  }
  return (
    <div className="overflow-hidden rounded-lg border-t bg-white pt-3">
      <iframe
        ref={ref}
        title="Email"
        scrolling="no"
        sandbox="allow-same-origin allow-popups"
        srcDoc={srcDoc}
        onLoad={fit}
        className="w-full"
        style={{ height, border: 0, overflow: "hidden" }}
      />
    </div>
  )
}

export default function EmailInbox() {
  const [list, setList] = useState<Msg[]>([])
  const [sel, setSel] = useState<Msg | null>(null)
  const [folder, setFolder] = useState<Folder>("inbox")
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summarising, setSummarising] = useState(false)

  function load() { return api<{ messages: Msg[] }>("/inbox").then((r) => setList(r.messages)) }
  useEffect(() => { load().finally(() => setLoading(false)) }, [])
  // near-real-time: refresh the list every 20s
  useEffect(() => {
    const t = setInterval(() => { load().catch(() => {}) }, 20000)
    return () => clearInterval(t)
  }, [])

  const counts = useMemo(() => ({
    inbox: list.filter((m) => m.direction === "inbound").length,
    sent: list.filter((m) => m.direction === "outbound").length,
    all: list.length,
  }), [list])

  const rows = useMemo(() => list.filter((m) => folder === "all" || (folder === "inbox" ? m.direction === "inbound" : m.direction === "outbound")), [list, folder])

  async function sync() {
    setSyncing(true)
    try {
      const r = await api<{ synced: number }>("/inbox/sync", { method: "POST" })
      await load()
      toast.success(r.synced ? `${r.synced} new message${r.synced > 1 ? "s" : ""}` : "Up to date")
    } catch {
      // this host blocks web-initiated IMAP; a cron pulls mail every 15 min
      await load()
      toast.message("Refreshed", { description: "Inbox syncs automatically every 15 minutes." })
    } finally { setSyncing(false) }
  }
  async function open(m: Msg) { setSummary(null); const r = await api<{ message: Msg }>(`/inbox/get?id=${m.id}`); setSel(r.message) }
  async function summarise() {
    if (!sel?.body) return
    setSummarising(true)
    try {
      const r = await api<{ text: string }>("/ai/draft", { method: "POST", body: { prompt: `Summarise this customer email in 2-3 short bullet points, then suggest the single best next action. Be concise.\n\nSubject: ${sel.subject}\n\n${sel.body}` } })
      setSummary(r.text)
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI summary failed") } finally { setSummarising(false) }
  }

  const MAILBOXES: { id: Folder; label: string; icon: typeof Inbox }[] = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
    { id: "all", label: "All", icon: Layers },
  ]

  return (
    <div className="flex h-[calc(100svh-10.5rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mail className="size-5" /></div>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Email</h1>
        <Button onClick={sync} disabled={syncing} variant="outline" size="sm" className="ml-auto">
          <RefreshCw className={cn("size-4", syncing && "animate-spin")} /> Sync
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Mailboxes rail */}
        <Card className="hidden h-full flex-col overflow-hidden lg:flex">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
            <Button className="w-full" onClick={() => setComposeOpen(true)}><PenSquare className="size-4" /> Compose</Button>
            <div className="space-y-0.5">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mailboxes</p>
              {MAILBOXES.map((mb) => (
                <button key={mb.id} onClick={() => { setFolder(mb.id); setSel(null) }}
                  className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors", folder === mb.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
                  <mb.icon className="size-4" /> {mb.label}
                  <span className="ml-auto text-xs tabular-nums">{counts[mb.id]}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className={cn("h-full flex-col overflow-hidden", sel ? "hidden md:flex" : "flex")}>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                <Inbox className="size-7" /> Nothing here. Add IMAP details in Integrations, then Sync.
              </div>
            ) : (
              <ul className="divide-y">
                {rows.map((m) => {
                  const who = m.direction === "inbound" ? (m.from_name || m.from_email || "?") : (m.to_email || "?")
                  return (
                    <li key={m.id}>
                      <button onClick={() => open(m)} className={cn("relative flex w-full items-start gap-3 p-3 pl-4 text-left transition-colors hover:bg-muted/40", sel?.id === m.id ? "bg-primary/5" : "")}>
                        <span className={cn("absolute inset-y-2 left-0 w-1 rounded-full transition-colors", sel?.id === m.id ? "bg-primary" : "bg-transparent")} />
                        <Avatar className="size-9 shrink-0"><AvatarFallback className="text-xs">{initials(who)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("flex items-center gap-1 truncate text-sm", m.direction === "inbound" ? "font-semibold" : "font-medium")}>
                              {m.direction === "inbound" ? <ArrowDownLeft className="size-3 text-blue-500" /> : <ArrowUpRight className="size-3 text-emerald-500" />}
                              {who}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{m.created_at?.slice(5, 16)}</span>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{m.subject || "(no subject)"}</p>
                          {(m.customer_name || m.job_reference) && (
                            <div className="mt-0.5 flex gap-1.5">
                              {m.customer_name && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{m.customer_name}</span>}
                              {m.job_reference && <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">{m.job_reference}</span>}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Reader */}
        <Card className="hidden h-full flex-col overflow-hidden md:flex">
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-5">
            {!sel ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a message</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10"><AvatarFallback>{initials(sel.direction === "inbound" ? (sel.from_name || sel.from_email || "?") : (sel.to_email || "?"))}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">{sel.subject || "(no subject)"}</h2>
                      <p className="text-sm text-muted-foreground">
                        {sel.direction === "inbound" ? `${sel.from_name || ""} <${sel.from_email}>` : `To ${sel.to_email}`} · {sel.created_at?.slice(0, 16)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={summarise} disabled={summarising}>
                      {summarising ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    </Button>
                    {sel.direction === "inbound" && sel.from_email && (
                      <Button size="sm" onClick={() => setReplyOpen(true)}><Reply className="size-4" /> Reply</Button>
                    )}
                  </div>
                </div>
                {summary && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary"><Sparkles className="size-3.5" /> AI summary</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{summary}</p>
                  </div>
                )}
                {(sel.customer_name || sel.job_reference) && (
                  <div className="flex gap-2 text-xs">
                    {sel.customer_name && <Link to={`/ego/customers/detail?id=${sel.customer_id}`} className="rounded bg-muted px-2 py-0.5 hover:underline">{sel.customer_name}</Link>}
                    {sel.job_reference && <Link to={`/ego/jobs/detail?id=${sel.job_id}`} className="rounded bg-primary/10 px-2 py-0.5 font-mono text-primary hover:underline">{sel.job_reference}</Link>}
                  </div>
                )}
                {sel.body_html ? (
                  <EmailHtml html={sel.body_html} />
                ) : (
                  <div className="whitespace-pre-wrap border-t pt-3 text-sm">{sel.body || "(empty)"}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reply */}
      {sel?.from_email && (
        <EmailDialog open={replyOpen} onOpenChange={setReplyOpen} to={sel.from_email} toName={sel.from_name ?? undefined}
          customerName={sel.customer_name ?? undefined} context={sel.job_reference ? `Reply about job ${sel.job_reference}` : `Reply to: ${sel.subject}`}
          jobId={sel.job_id ?? undefined} customerId={sel.customer_id ?? undefined} onSent={load} />
      )}
      {/* Compose */}
      <EmailDialog open={composeOpen} onOpenChange={setComposeOpen} to="" editableTo onSent={() => { setFolder("sent"); load() }} />
    </div>
  )
}
