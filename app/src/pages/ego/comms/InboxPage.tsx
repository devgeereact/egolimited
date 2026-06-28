import { useCallback, useEffect, useState } from "react"
import { Inbox, RefreshCw, Loader2, Send, Check, PenSquare, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
}
interface MsgFull extends MsgRow {
  body: string | null
  body_html: string | null
  acknowledged: number
}

export default function InboxPage() {
  const [rows, setRows] = useState<MsgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selId, setSelId] = useState<number | null>(null)
  const [msg, setMsg] = useState<MsgFull | null>(null)
  const [reply, setReply] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api<{ messages: MsgRow[] }>("/inbox")
      .then((r) => { setRows(r.messages); if (!selId && r.messages[0]) setSelId(r.messages[0].id) })
      .finally(() => setLoading(false))
  }, [selId])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selId == null) { setMsg(null); return }
    api<{ message: MsgFull }>(`/inbox/get?id=${selId}`).then((r) => setMsg(r.message)).catch(() => setMsg(null))
  }, [selId])

  async function sync() {
    setSyncing(true)
    try {
      const r = await api<{ synced: number }>("/inbox/sync", { method: "POST" })
      toast.success(`Synced — ${r.synced} new`)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed")
    } finally { setSyncing(false) }
  }

  async function ack() {
    if (!msg) return
    await api("/messages/ack", { method: "POST", body: { id: msg.id } })
    setMsg({ ...msg, acknowledged: 1 })
    toast.success("Acknowledged")
  }

  async function sendReply() {
    if (!msg || !reply.trim()) return
    setSendingReply(true)
    try {
      await api("/messages/reply", { method: "POST", body: { id: msg.id, body: reply } })
      toast.success("Reply sent")
      setReply("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reply failed")
    } finally { setSendingReply(false) }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Inbox className="size-5" /></div>
          <div><h1 className="text-2xl font-semibold leading-none tracking-tight">Inbox</h1><p className="mt-1 text-sm text-muted-foreground">{rows.length} messages</p></div>
        </div>
        <div className="flex gap-2">
          <ComposeDialog onSent={load} />
          <Button variant="outline" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* List */}
        <Card className="overflow-hidden">
          <CardContent className="max-h-[70vh] divide-y overflow-y-auto p-0">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></div>
            ) : rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No messages. Hit Sync to pull email.</div>
            ) : (
              rows.map((m) => (
                <button key={m.id} onClick={() => setSelId(m.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${selId === m.id ? "bg-muted" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {m.direction === "inbound" ? <ArrowDownLeft className="size-3.5 shrink-0 text-primary" /> : <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />}
                      {m.direction === "inbound" ? (m.from_name || m.from_email || "Unknown") : (m.to_email || "—")}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{m.created_at?.slice(5, 10)}</span>
                  </div>
                  <span className="truncate text-sm text-muted-foreground">{m.subject || "(no subject)"}</span>
                  {(m.customer_name || m.job_reference) && (
                    <span className="truncate text-xs text-muted-foreground">{m.customer_name}{m.job_reference ? ` · ${m.job_reference}` : ""}</span>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Reading pane */}
        <Card>
          <CardContent className="p-6">
            {!msg ? (
              <div className="flex h-full min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Select a message.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{msg.subject || "(no subject)"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {msg.direction === "inbound"
                        ? <>From <span className="font-medium text-foreground">{msg.from_name || msg.from_email}</span></>
                        : <>To <span className="font-medium text-foreground">{msg.to_email}</span></>}
                      {" · "}{msg.created_at}
                    </p>
                    {(msg.customer_name || msg.job_reference) && (
                      <p className="mt-1 text-xs text-muted-foreground">{msg.customer_name}{msg.job_reference ? ` · ${msg.job_reference}` : ""}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={msg.direction === "inbound" ? "default" : "secondary"} className="capitalize">{msg.direction}</Badge>
                    {!!msg.acknowledged && <Badge variant="outline"><Check className="size-3" /> Ack</Badge>}
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                  {msg.body_html
                    ? <div dangerouslySetInnerHTML={{ __html: msg.body_html }} />
                    : <p className="whitespace-pre-wrap">{msg.body || "(empty)"}</p>}
                </div>

                {msg.direction === "inbound" && (
                  <div className="space-y-2 border-t pt-4">
                    <Textarea rows={4} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <div className="flex justify-between">
                      {!msg.acknowledged
                        ? <Button variant="outline" size="sm" onClick={ack}><Check /> Acknowledge</Button>
                        : <span />}
                      <Button size="sm" onClick={sendReply} disabled={sendingReply || !reply.trim()}>
                        {sendingReply ? <Loader2 className="animate-spin" /> : <Send />} Send reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
    if (!to.trim() || !subject.trim() || !body.trim()) { toast.error("To, subject and body are required"); return }
    setSending(true)
    try {
      await api("/email/send", { method: "POST", body: { to, subject, body } })
      toast.success(`Sent to ${to}`)
      setOpen(false); setTo(""); setSubject(""); setBody("")
      onSent()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed")
    } finally { setSending(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><PenSquare /> Compose</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New email</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="email" placeholder="To (email)" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea rows={6} placeholder="Message…" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={sending}>{sending ? <Loader2 className="animate-spin" /> : <Send />} Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
