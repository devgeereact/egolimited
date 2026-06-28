import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Inbox, Send as SendIcon, Mails, RefreshCw, Loader2, Reply, Check, PenSquare,
  Search, ArrowLeft, CornerUpLeft,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

interface MsgRow {
  id: number
  direction: "inbound" | "outbound"
  from_email: string | null
  from_name: string | null
  to_email: string | null
  subject: string | null
  status: string
  created_at: string
  customer_name: string | null
  job_reference: string | null
  acknowledged?: number
}
interface MsgFull extends MsgRow {
  body: string | null
  body_html: string | null
  acknowledged: number
}

type Folder = "inbox" | "sent" | "all"
const FOLDERS: { key: Folder; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "sent", label: "Sent", icon: SendIcon },
  { key: "all", label: "All mail", icon: Mails },
]

const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"
const fmtDate = (d: string) => {
  if (!d) return ""
  const today = new Date().toISOString().slice(0, 10)
  return d.slice(0, 10) === today ? d.slice(11, 16) : d.slice(5, 10)
}

export default function InboxPage() {
  const [rows, setRows] = useState<MsgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [folder, setFolder] = useState<Folder>("inbox")
  const [q, setQ] = useState("")
  const [selId, setSelId] = useState<number | null>(null)
  const [msg, setMsg] = useState<MsgFull | null>(null)
  const [reply, setReply] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api<{ messages: MsgRow[] }>("/inbox")
      .then((r) => setRows(r.messages))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const counts = useMemo(() => ({
    inbox: rows.filter((m) => m.direction === "inbound").length,
    sent: rows.filter((m) => m.direction === "outbound").length,
    all: rows.length,
    unread: rows.filter((m) => m.direction === "inbound" && !m.acknowledged).length,
  }), [rows])

  const list = useMemo(() => {
    const byFolder = rows.filter((m) =>
      folder === "all" ? true : folder === "inbox" ? m.direction === "inbound" : m.direction === "outbound")
    const needle = q.trim().toLowerCase()
    if (!needle) return byFolder
    return byFolder.filter((m) =>
      [m.subject, m.from_name, m.from_email, m.to_email, m.customer_name].some((v) => v?.toLowerCase().includes(needle)))
  }, [rows, folder, q])

  useEffect(() => {
    if (selId == null) { setMsg(null); return }
    api<{ message: MsgFull }>(`/inbox/get?id=${selId}`).then((r) => {
      setMsg(r.message)
      if (r.message.direction === "inbound" && !r.message.acknowledged) {
        api("/messages/ack", { method: "POST", body: { id: r.message.id } }).then(() => {
          setRows((prev) => prev.map((m) => (m.id === r.message.id ? { ...m, acknowledged: 1 } : m)))
        }).catch(() => {})
      }
    }).catch(() => setMsg(null))
  }, [selId])

  async function sync() {
    setSyncing(true)
    try {
      const r = await api<{ synced: number }>("/inbox/sync", { method: "POST" })
      toast.success(`Synced — ${r.synced} new`)
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Sync failed") }
    finally { setSyncing(false) }
  }

  async function sendReply() {
    if (!msg || !reply.trim()) return
    setSendingReply(true)
    try {
      await api("/messages/reply", { method: "POST", body: { id: msg.id, body: reply } })
      toast.success("Reply sent")
      setReply("")
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Reply failed") }
    finally { setSendingReply(false) }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Mail</h1>
        <div className="flex gap-2">
          <ComposeDialog onSent={load} />
          <Button variant="outline" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[12rem_22rem_1fr]">
        {/* Folders */}
        <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-2 lg:flex-col lg:overflow-visible">
          {FOLDERS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setFolder(key); setSelId(null) }}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                folder === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
              <Icon className="size-4" /> {label}
              {key === "inbox" && counts.unread > 0 && (
                <Badge className="ml-auto h-5 px-1.5">{counts.unread}</Badge>
              )}
              {key !== "inbox" && <span className="ml-auto text-xs text-muted-foreground">{counts[key]}</span>}
            </button>
          ))}
        </nav>

        {/* List */}
        <div className={cn("min-h-0 flex-col rounded-xl border bg-card", selId != null ? "hidden lg:flex" : "flex")}>
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="h-9 border-0 bg-muted/50 pl-9 focus-visible:ring-1" />
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></div>
            ) : list.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing here. Hit Sync to pull email.</div>
            ) : (
              <ul className="divide-y">
                {list.map((m) => {
                  const unread = m.direction === "inbound" && !m.acknowledged
                  const who = m.direction === "inbound" ? (m.from_name || m.from_email || "Unknown") : (m.to_email || "—")
                  return (
                    <li key={m.id}>
                      <button onClick={() => setSelId(m.id)}
                        className={cn("flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                          selId === m.id && "bg-muted")}>
                        <Avatar className="mt-0.5 size-8 shrink-0"><AvatarFallback className="text-xs">{initials(who)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("truncate text-sm", unread ? "font-semibold text-foreground" : "text-foreground/90")}>{who}</span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(m.created_at)}</span>
                          </div>
                          <p className={cn("truncate text-sm", unread ? "font-medium" : "text-muted-foreground")}>{m.subject || "(no subject)"}</p>
                          {(m.customer_name || m.job_reference) && (
                            <p className="truncate text-xs text-muted-foreground">{m.customer_name}{m.job_reference ? ` · ${m.job_reference}` : ""}</p>
                          )}
                        </div>
                        {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Reading pane */}
        <div className={cn("min-h-0 flex-col rounded-xl border bg-card", selId != null ? "flex" : "hidden lg:flex")}>
          {!msg ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <div className="text-center"><Mails className="mx-auto mb-2 size-8 opacity-40" />Select a message to read</div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b p-3">
                <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={() => setSelId(null)}><ArrowLeft className="size-4" /></Button>
                <h2 className="flex-1 truncate font-semibold">{msg.subject || "(no subject)"}</h2>
                <Badge variant={msg.direction === "inbound" ? "default" : "secondary"} className="capitalize">{msg.direction}</Badge>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-4 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9"><AvatarFallback className="text-xs">
                      {initials(msg.direction === "inbound" ? (msg.from_name || msg.from_email || "?") : (msg.to_email || "?"))}
                    </AvatarFallback></Avatar>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">{msg.direction === "inbound" ? (msg.from_name || msg.from_email) : `To: ${msg.to_email}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {msg.direction === "inbound" && msg.from_email ? `${msg.from_email} · ` : ""}{msg.created_at}
                        {msg.customer_name ? ` · ${msg.customer_name}` : ""}{msg.job_reference ? ` · ${msg.job_reference}` : ""}
                      </p>
                    </div>
                    {!!msg.acknowledged && <Badge variant="outline" className="ml-auto"><Check className="size-3" /> Read</Badge>}
                  </div>

                  <div className="text-sm leading-relaxed">
                    {msg.body_html
                      ? <div className="prose prose-sm max-w-none [&_a]:text-primary" dangerouslySetInnerHTML={{ __html: msg.body_html }} />
                      : <p className="whitespace-pre-wrap">{msg.body || "(empty)"}</p>}
                  </div>
                </div>
              </ScrollArea>

              {msg.direction === "inbound" && (
                <div className="space-y-2 border-t p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CornerUpLeft className="size-3.5" /> Reply</div>
                  <Textarea rows={3} placeholder={`Reply to ${msg.from_name || msg.from_email || ""}…`} value={reply} onChange={(e) => setReply(e.target.value)} />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={sendReply} disabled={sendingReply || !reply.trim()}>
                      {sendingReply ? <Loader2 className="animate-spin" /> : <Reply />} Send reply
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ComposeDialog({ onSent }: { onSent: () => void }) {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  async function send() {
    if (!to.trim() || !subject.trim() || !body.trim()) return toast.error("To, subject and body are required")
    setSending(true)
    try {
      await api("/email/send", { method: "POST", body: { to, subject, body } })
      toast.success(`Sent to ${to}`)
      setOpen(false); setTo(""); setSubject(""); setBody("")
      onSent()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed") }
    finally { setSending(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><PenSquare /> <span className="hidden sm:inline">Compose</span></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New message</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="email" placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea rows={8} placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>{sending ? <Loader2 className="animate-spin" /> : <SendIcon />} Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
