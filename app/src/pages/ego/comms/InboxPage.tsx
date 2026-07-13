import { useEffect, useMemo, useState } from "react"
import {
  Inbox, Send as SendIcon, FileEdit, StickyNote, RefreshCw, Loader2, Reply, Check,
  PenSquare, Search, ChevronLeft, ChevronRight, Save, Trash2, Plus, Archive, ArchiveRestore, Flag,
  Paperclip, Download, X,
} from "lucide-react"
import DOMPurify from "dompurify"
import { toast } from "sonner"
import { api, apiForm } from "@/lib/api"
import { TimeStamp } from "@/components/ego/TimeStamp"
import { useApi, invalidate } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AiButton } from "@/components/ego/AiButton"
import { confirmDialog } from "@/components/ego/confirm"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

const PER_PAGE = 12

interface MsgRow {
  id: number
  direction: "inbound" | "outbound"
  channel?: string | null
  from_email: string | null
  from_name: string | null
  to_email: string | null
  subject: string | null
  status: string
  created_at: string
  customer_name: string | null
  job_reference: string | null
  acknowledged?: number
  archived?: number
  flagged?: number
  attachment_count?: number
}
interface Attachment { id: number; filename: string; mime: string; size: number; url: string }
interface MsgFull extends MsgRow { body: string | null; body_html: string | null; acknowledged: number; attachments?: Attachment[] }
interface Draft { id?: number; to: string; subject: string; body: string }

const API_ORIGIN = import.meta.env.DEV ? "https://egolimited.com" : ""
const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`)

type Folder = "inbox" | "sent" | "drafts" | "notes" | "archived"
const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"
function inFolder(m: MsgRow, f: Folder): boolean {
  if (f === "archived") return !!m.archived
  if (m.archived) return false // archived items live only in the Archive folder
  if (m.channel === "note") return f === "notes"
  if (m.status === "draft") return f === "drafts"
  if (f === "inbox") return m.direction === "inbound"
  if (f === "sent") return m.direction === "outbound"
  return false
}

export default function InboxPage() {
  const [syncing, setSyncing] = useState(false)
  const [folder, setFolder] = useState<Folder>("inbox")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)

  const [readOpen, setReadOpen] = useState(false)
  const [msg, setMsg] = useState<MsgFull | null>(null)
  const [reply, setReply] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  const [composeOpen, setComposeOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({ to: "", subject: "", body: "" })
  const [noteOpen, setNoteOpen] = useState(false)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // Cached + deduped + refetched in the background. 30s poll matches the previous hand-rolled
  // interval; window-focus refetch is handled globally (see lib/query.ts defaultOptions).
  const { data, isPending } = useApi<{ messages: MsgRow[] }>("/inbox", { refetchInterval: 30000 })
  const rows = useMemo(() => data?.messages ?? [], [data])
  const loading = isPending
  useEffect(() => { setPage(1); setSel(new Set()) }, [folder, q])

  const counts = useMemo(() => ({
    inbox: rows.filter((m) => inFolder(m, "inbox")).length,
    sent: rows.filter((m) => inFolder(m, "sent")).length,
    drafts: rows.filter((m) => inFolder(m, "drafts")).length,
    notes: rows.filter((m) => inFolder(m, "notes")).length,
    archived: rows.filter((m) => inFolder(m, "archived")).length,
    unread: rows.filter((m) => m.direction === "inbound" && m.channel !== "note" && !m.acknowledged && !m.archived).length,
  }), [rows])

  // Bulk multiselect actions (delete / archive / unarchive / flag / unflag).
  async function bulk(action: "delete" | "archive" | "unarchive" | "flag" | "unflag") {
    const ids = [...sel]
    if (!ids.length) return
    if (action === "delete" && !(await confirmDialog({ title: `Delete ${ids.length} item${ids.length > 1 ? "s" : ""}?`, body: "This can't be undone.", confirmText: "Delete", danger: true }))) return
    setBulkBusy(true)
    try {
      await api("/messages/bulk", { method: "POST", body: { action, ids } })
      setSel(new Set()); invalidate("/inbox")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Action failed") }
    finally { setBulkBusy(false) }
  }
  async function setFlag(id: number, flagged: boolean) {
    try { await api("/messages/flag", { method: "POST", body: { id, flagged: flagged ? 1 : 0 } }) }
    finally { invalidate("/inbox") }
  }
  async function setArchive(id: number, archived: boolean) {
    try { await api("/messages/archive", { method: "POST", body: { id, archived: archived ? 1 : 0 } }); setReadOpen(false); invalidate("/inbox") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }

  const filtered = useMemo(() => {
    const base = rows.filter((m) => inFolder(m, folder))
    const needle = q.trim().toLowerCase()
    return needle
      ? base.filter((m) => [m.subject, m.from_name, m.from_email, m.to_email, m.customer_name].some((v) => v?.toLowerCase().includes(needle)))
      : base
  }, [rows, folder, q])

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  async function openRow(m: MsgRow) {
    // Drafts open the composer for editing; everything else opens the reader.
    if (m.status === "draft") {
      try {
        const r = await api<{ message: MsgFull }>(`/inbox/get?id=${m.id}`)
        setDraft({ id: m.id, to: r.message.to_email ?? "", subject: r.message.subject ?? "", body: r.message.body ?? "" })
        setComposeOpen(true)
      } catch { toast.error("Could not open draft") }
      return
    }
    setReadOpen(true); setMsg(null); setReply("")
    try {
      const r = await api<{ message: MsgFull }>(`/inbox/get?id=${m.id}`)
      setMsg(r.message)
      if (r.message.direction === "inbound" && r.message.channel !== "note" && !r.message.acknowledged) {
        api("/messages/ack", { method: "POST", body: { id: m.id } }).then(() => invalidate("/inbox")).catch(() => {})
      }
    } catch { toast.error("Could not open message") }
  }

  async function sync() {
    setSyncing(true)
    try { const r = await api<{ synced: number }>("/inbox/sync", { method: "POST" }); toast.success(`Synced — ${r.synced} new`); invalidate("/inbox") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Sync failed") } finally { setSyncing(false) }
  }
  async function sendReply() {
    if (!msg || !reply.trim()) return
    setSendingReply(true)
    try { await api("/messages/reply", { method: "POST", body: { id: msg.id, body: reply } }); toast.success("Reply sent"); setReadOpen(false); invalidate("/inbox") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Reply failed") } finally { setSendingReply(false) }
  }
  async function deleteMsg(id: number) {
    if (!(await confirmDialog({ title: "Delete this item?", confirmText: "Delete", danger: true }))) return
    try { await api("/messages/delete", { method: "POST", body: { id } }); toast.success("Deleted"); setReadOpen(false); invalidate("/inbox") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed") }
  }

  const TABS: { key: Folder; label: string; icon: typeof Inbox; badge?: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, badge: counts.unread },
    { key: "sent", label: "Sent", icon: SendIcon },
    { key: "drafts", label: "Drafts", icon: FileEdit, badge: counts.drafts || undefined },
    { key: "notes", label: "Notes", icon: StickyNote, badge: counts.notes || undefined },
    { key: "archived", label: "Archive", icon: Archive, badge: counts.archived || undefined },
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={() => { setDraft({ to: "", subject: "", body: "" }); setComposeOpen(true) }}><PenSquare /> Compose</Button>
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
          {folder === "notes" && <Button variant="outline" onClick={() => setNoteOpen(true)}><Plus /> New note</Button>}
          <div className="relative w-44 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="h-9 pl-9" />
          </div>
          <Button variant="outline" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      </div>

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{sel.size} selected</span>
          <Button variant="outline" size="sm" className="text-destructive" disabled={bulkBusy} onClick={() => bulk("delete")}><Trash2 className="size-4" /> Delete</Button>
          {folder === "archived"
            ? <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => bulk("unarchive")}><ArchiveRestore className="size-4" /> Unarchive</Button>
            : <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => bulk("archive")}><Archive className="size-4" /> Archive</Button>}
          <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => bulk("flag")}><Flag className="size-4" /> Flag</Button>
          <Button variant="ghost" size="sm" onClick={() => setSel(new Set())}>Clear</Button>
          {bulkBusy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      <Card className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={pageRows.length > 0 && pageRows.every((m) => sel.has(m.id))}
                    onCheckedChange={(c) => setSel((prev) => {
                      const n = new Set(prev)
                      if (c) pageRows.forEach((m) => n.add(m.id)); else pageRows.forEach((m) => n.delete(m.id))
                      return n
                    })}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-[32%]">{folder === "notes" ? "By" : folder === "inbox" ? "From" : "To"}</TableHead>
                <TableHead>{folder === "notes" ? "Note" : "Subject"}</TableHead>
                <TableHead className="hidden md:table-cell">Linked</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  {folder === "drafts" ? "No drafts — hit Compose then Save draft." : folder === "notes" ? "No notes yet — add one with New note." : folder === "archived" ? "Nothing archived." : "Nothing here. Hit Sync to pull email."}
                </TableCell></TableRow>
              ) : (
                pageRows.map((m) => {
                  const unread = m.direction === "inbound" && m.channel !== "note" && !m.acknowledged
                  const who = m.channel === "note" ? (m.from_name || "—") : m.direction === "inbound" ? (m.from_name || m.from_email || "Unknown") : (m.to_email || "—")
                  return (
                    <TableRow key={m.id} className={cn("cursor-pointer", sel.has(m.id) && "bg-muted/50")} onClick={() => openRow(m)}>
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel.has(m.id)} aria-label="Select message"
                          onCheckedChange={(c) => setSel((prev) => { const n = new Set(prev); if (c) n.add(m.id); else n.delete(m.id); return n })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {unread ? <span className="size-2 shrink-0 rounded-full bg-primary" /> : <span className="size-2 shrink-0" />}
                          <Avatar className="size-7 shrink-0"><AvatarFallback className="text-[11px]">{initials(who)}</AvatarFallback></Avatar>
                          <span className={cn("truncate", unread ? "font-bold text-foreground" : "text-muted-foreground")}>{who}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn("max-w-0 truncate", unread ? "font-bold text-foreground" : "text-muted-foreground")}>
                        {!!m.flagged && <Flag className="mr-1 inline size-3.5 fill-amber-500 text-amber-500 align-[-2px]" />}
                        {m.subject || "(no subject)"}
                        {!!m.attachment_count && <Paperclip className="ml-1 inline size-3.5 text-muted-foreground align-[-2px]" />}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{m.customer_name || m.job_reference || "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground"><TimeStamp value={m.created_at} variant="short" /></TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <div className="mt-auto flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{filtered.length} {folder === "notes" ? "notes" : "messages"}</span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
                <span className="tabular-nums">Page {page} of {pages}</span>
                <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Read modal */}
      <Dialog open={readOpen} onOpenChange={setReadOpen}>
        <DialogContent className="flex h-[88vh] max-h-[88vh] w-[95vw] max-w-4xl flex-col overflow-hidden p-0">
          {!msg ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <DialogHeader className="shrink-0 border-b p-5 pb-4">
                <DialogTitle className="pr-8 text-lg leading-snug">{msg.subject || "(no subject)"}</DialogTitle>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar className="size-9"><AvatarFallback className="text-xs">
                    {initials(msg.channel === "note" ? (msg.from_name || "?") : msg.direction === "inbound" ? (msg.from_name || msg.from_email || "?") : (msg.to_email || "?"))}
                  </AvatarFallback></Avatar>
                  <div className="min-w-0 text-left text-sm">
                    <p className="font-medium">{msg.channel === "note" ? `Note · ${msg.from_name ?? ""}` : msg.direction === "inbound" ? (msg.from_name || msg.from_email) : `To: ${msg.to_email}`}</p>
                    <p className="text-xs text-muted-foreground">
                      <TimeStamp value={msg.created_at} />
                      {msg.customer_name ? ` · ${msg.customer_name}` : ""}{msg.job_reference ? ` · ${msg.job_reference}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {!!msg.acknowledged && msg.channel !== "note" && <Badge variant="outline"><Check className="size-3" /> Read</Badge>}
                    <Button variant="ghost" size="icon" className="size-8" title={msg.flagged ? "Unflag" : "Flag"}
                      onClick={() => { setFlag(msg.id, !msg.flagged); setMsg({ ...msg, flagged: msg.flagged ? 0 : 1 }) }}>
                      <Flag className={cn("size-4", msg.flagged && "fill-amber-500 text-amber-500")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" title={msg.archived ? "Unarchive" : "Archive"} onClick={() => setArchive(msg.id, !msg.archived)}>
                      {msg.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => deleteMsg(msg.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
                {msg.body_html
                  ? <div className="prose prose-sm max-w-none [&_a]:text-primary"
                         dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body_html, { ADD_ATTR: ["target"] }) }} />
                  : <p className="whitespace-pre-wrap">{msg.body || "(empty)"}</p>}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-5 border-t pt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Paperclip className="size-3.5" /> {msg.attachments.length} attachment{msg.attachments.length > 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.attachments.map((a) => (
                        <a key={a.id} href={`${API_ORIGIN}${a.url}`} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs transition-colors hover:bg-muted">
                          <Download className="size-4 shrink-0 text-muted-foreground" />
                          <span className="max-w-[220px] truncate font-medium">{a.filename}</span>
                          <span className="shrink-0 text-muted-foreground">{fmtBytes(a.size)}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {msg.direction === "inbound" && msg.channel !== "note" && (
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

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} draft={draft} onSaved={() => invalidate("/inbox")} />
      <NoteDialog open={noteOpen} onOpenChange={setNoteOpen} onSaved={() => invalidate("/inbox")} />
    </div>
  )
}

function ComposeDialog({ open, onOpenChange, draft, onSaved }:
  { open: boolean; onOpenChange: (o: boolean) => void; draft: Draft; onSaved: () => void }) {
  const [to, setTo] = useState(""); const [subject, setSubject] = useState(""); const [body, setBody] = useState("")
  const [id, setId] = useState<number | undefined>()
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setTo(draft.to); setSubject(draft.subject); setBody(draft.body); setId(draft.id); setFiles([]) } }, [open, draft])

  async function send() {
    if (!to.trim() || !subject.trim() || !body.trim()) return toast.error("To, subject and body are required")
    setBusy(true)
    try {
      // Always send as multipart so attachments (if any) ride along; the API accepts both.
      const fd = new FormData()
      fd.append("to", to); fd.append("subject", subject); fd.append("body", body)
      files.forEach((f) => fd.append("files[]", f))
      await apiForm("/email/send", fd)
      if (id) await api("/messages/delete", { method: "POST", body: { id } }) // sent -> remove the draft
      toast.success(`Sent to ${to}`); onOpenChange(false); onSaved()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed") } finally { setBusy(false) }
  }
  async function saveDraft() {
    if (!subject.trim() && !body.trim()) return toast.error("Nothing to save")
    setBusy(true)
    try {
      const r = await api<{ id: number }>("/email/draft", { method: "POST", body: { id, to, subject, body } })
      setId(r.id); toast.success("Draft saved"); onSaved()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-6">
          <DialogTitle>{id ? "Edit draft" : "New message"}</DialogTitle>
          <AiButton
            endpoint="/email/compose" title="Draft this email"
            extra={{ to_name: to }}
            placeholder="e.g. chase invoice 1043 politely, due last week"
            onResult={(d: { subject?: string; body?: string }) => { if (d.subject) setSubject(d.subject); if (d.body) setBody(d.body) }}
          />
        </DialogHeader>
        <div className="space-y-3">
          <Input type="email" placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea rows={8} placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Paperclip className="size-4" /> Attach files
              <input type="file" multiple className="hidden"
                onChange={(e) => { const fl = Array.from(e.target.files ?? []); setFiles((p) => [...p, ...fl]); e.target.value = "" }} />
            </label>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                    <Paperclip className="size-3 text-muted-foreground" />
                    <span className="max-w-[160px] truncate">{f.name}</span>
                    <span className="text-muted-foreground">{fmtBytes(f.size)}</span>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remove file"><X className="size-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={saveDraft} disabled={busy}><Save /> Save draft</Button>
          <Button onClick={send} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <SendIcon />} Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NoteDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setTitle(""); setBody("") } }, [open])
  async function save() {
    if (!body.trim()) return toast.error("Note is empty")
    setBusy(true)
    try { await api("/notes", { method: "POST", body: { title, body } }); toast.success("Note added"); onOpenChange(false); onSaved() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea rows={6} placeholder="Jot a note for the team…" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <StickyNote />} Add note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
