import { useEffect, useMemo, useState } from "react"
import {
  Inbox, Send as SendIcon, FileEdit, StickyNote, RefreshCw, Loader2, Reply, Check,
  PenSquare, Search, ChevronLeft, ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

const PER_PAGE = 12

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
interface MsgFull extends MsgRow { body: string | null; body_html: string | null; acknowledged: number }

type Folder = "inbox" | "sent" | "drafts" | "notes"
const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"
const fmtDate = (d: string) => {
  if (!d) return ""
  return d.slice(0, 10) === new Date().toISOString().slice(0, 10) ? d.slice(11, 16) : d.slice(0, 10)
}

function inFolder(m: MsgRow, f: Folder): boolean {
  if (f === "inbox") return m.direction === "inbound"
  if (f === "sent") return m.direction === "outbound" && m.status !== "draft"
  if (f === "drafts") return m.status === "draft"
  return (m as MsgRow & { channel?: string }).status === "note" // notes: none yet (placeholder tab)
}

export default function InboxPage() {
  const [rows, setRows] = useState<MsgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [folder, setFolder] = useState<Folder>("inbox")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<MsgFull | null>(null)
  const [reply, setReply] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  function load(silent = false) {
    if (!silent) setLoading(true)
    api<{ messages: MsgRow[] }>("/inbox").then((r) => setRows(r.messages)).finally(() => { if (!silent) setLoading(false) })
  }
  // Initial load + light polling so new mail / read state stay current without a refresh.
  useEffect(() => {
    load()
    const t = setInterval(() => load(true), 30000)
    const onFocus = () => load(true)
    window.addEventListener("focus", onFocus)
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus) }
  }, [])
  useEffect(() => { setPage(1) }, [folder, q])

  const counts = useMemo(() => ({
    inbox: rows.filter((m) => inFolder(m, "inbox")).length,
    sent: rows.filter((m) => inFolder(m, "sent")).length,
    drafts: rows.filter((m) => inFolder(m, "drafts")).length,
    notes: rows.filter((m) => inFolder(m, "notes")).length,
    unread: rows.filter((m) => m.direction === "inbound" && !m.acknowledged).length,
  }), [rows])

  const filtered = useMemo(() => {
    const base = rows.filter((m) => inFolder(m, folder))
    const needle = q.trim().toLowerCase()
    return needle
      ? base.filter((m) => [m.subject, m.from_name, m.from_email, m.to_email, m.customer_name].some((v) => v?.toLowerCase().includes(needle)))
      : base
  }, [rows, folder, q])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  async function openMessage(id: number) {
    setOpen(true); setMsg(null); setReply("")
    try {
      const r = await api<{ message: MsgFull }>(`/inbox/get?id=${id}`)
      setMsg(r.message)
      if (r.message.direction === "inbound" && !r.message.acknowledged) {
        api("/messages/ack", { method: "POST", body: { id } }).then(() =>
          setRows((prev) => prev.map((m) => (m.id === id ? { ...m, acknowledged: 1 } : m)))).catch(() => {})
      }
    } catch { toast.error("Could not open message") }
  }

  async function sync() {
    setSyncing(true)
    try { const r = await api<{ synced: number }>("/inbox/sync", { method: "POST" }); toast.success(`Synced — ${r.synced} new`); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Sync failed") } finally { setSyncing(false) }
  }
  async function sendReply() {
    if (!msg || !reply.trim()) return
    setSendingReply(true)
    try { await api("/messages/reply", { method: "POST", body: { id: msg.id, body: reply } }); toast.success("Reply sent"); setOpen(false); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Reply failed") } finally { setSendingReply(false) }
  }

  const TABS: { key: Folder; label: string; icon: typeof Inbox; badge?: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, badge: counts.unread },
    { key: "sent", label: "Sent", icon: SendIcon },
    { key: "drafts", label: "Drafts", icon: FileEdit },
    { key: "notes", label: "Notes", icon: StickyNote },
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Toolbar: Compose + folder tabs + sync + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ComposeDialog onSent={load} />
          <Tabs value={folder} onValueChange={(v) => setFolder(v as Folder)}>
            <TabsList>
              {TABS.map(({ key, label, icon: Icon, badge }) => (
                <TabsTrigger key={key} value={key} className="gap-1.5">
                  <Icon className="size-4" /> {label}
                  {!!badge && <Badge className="ml-1 h-4 px-1 text-[10px]">{badge}</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-44 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="h-9 pl-9" />
          </div>
          <Button variant="outline" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      </div>

      {/* List (paginated — no scroll) */}
      <Card className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]">{folder === "sent" ? "To" : "From"}</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Linked</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  {folder === "drafts" ? "No drafts." : folder === "notes" ? "No notes yet." : "Nothing here. Hit Sync to pull email."}
                </TableCell></TableRow>
              ) : (
                pageRows.map((m) => {
                  const unread = m.direction === "inbound" && !m.acknowledged
                  const who = m.direction === "inbound" ? (m.from_name || m.from_email || "Unknown") : (m.to_email || "—")
                  return (
                    <TableRow key={m.id} className="cursor-pointer" onClick={() => openMessage(m.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {unread
                            ? <span className="size-2 shrink-0 rounded-full bg-primary" />
                            : <span className="size-2 shrink-0" />}
                          <Avatar className="size-7 shrink-0"><AvatarFallback className="text-[11px]">{initials(who)}</AvatarFallback></Avatar>
                          <span className={cn("truncate", unread ? "font-bold text-foreground" : "text-muted-foreground")}>{who}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn("max-w-0 truncate", unread ? "font-bold text-foreground" : "text-muted-foreground")}>{m.subject || "(no subject)"}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{m.customer_name || m.job_reference || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmtDate(m.created_at)}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination footer */}
          <div className="mt-auto flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{filtered.length} message{filtered.length === 1 ? "" : "s"}</span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
                <span className="tabular-nums">Page {page} of {pages}</span>
                <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reading modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[88vh] max-h-[88vh] w-[95vw] max-w-4xl flex-col overflow-hidden p-0">
          {!msg ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <DialogHeader className="shrink-0 border-b p-5 pb-4">
                <DialogTitle className="pr-8 text-lg leading-snug">{msg.subject || "(no subject)"}</DialogTitle>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar className="size-9"><AvatarFallback className="text-xs">
                    {initials(msg.direction === "inbound" ? (msg.from_name || msg.from_email || "?") : (msg.to_email || "?"))}
                  </AvatarFallback></Avatar>
                  <div className="min-w-0 text-left text-sm">
                    <p className="font-medium">{msg.direction === "inbound" ? (msg.from_name || msg.from_email) : `To: ${msg.to_email}`}</p>
                    <p className="text-xs text-muted-foreground">{msg.created_at}{msg.customer_name ? ` · ${msg.customer_name}` : ""}{msg.job_reference ? ` · ${msg.job_reference}` : ""}</p>
                  </div>
                  {!!msg.acknowledged && <Badge variant="outline" className="ml-auto"><Check className="size-3" /> Read</Badge>}
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
                {msg.body_html
                  ? <div className="prose prose-sm max-w-none [&_a]:text-primary" dangerouslySetInnerHTML={{ __html: msg.body_html }} />
                  : <p className="whitespace-pre-wrap">{msg.body || "(empty)"}</p>}
              </div>

              {msg.direction === "inbound" && (
                <div className="shrink-0 space-y-2 border-t p-4">
                  <Textarea rows={2} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={sendReply} disabled={sendingReply || !reply.trim()}>
                      {sendingReply ? <Loader2 className="animate-spin" /> : <Reply />} Send reply
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
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
    try { await api("/email/send", { method: "POST", body: { to, subject, body } }); toast.success(`Sent to ${to}`); setOpen(false); setTo(""); setSubject(""); setBody(""); onSent() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Send failed") } finally { setSending(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><PenSquare /> Compose</Button></DialogTrigger>
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
