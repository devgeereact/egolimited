import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Briefcase, Check, FileText, Loader2, Mail, Phone, Send, Unlock, User,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { invalidate, useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { gbp } from "@/lib/invoicing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { TimeStamp } from "@/components/ego/TimeStamp"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

import {
  EVENT_LABEL, SOURCE_LABEL, STAGE_META, STAGES,
  type Contact, type ContactDoc, type ContactEvent, type ContactJob, type Stage,
} from "./types"

/**
 * The right pane: the whole story of one business, in one place.
 *
 * This screen does not exist today. Ask "what's the story with Marchmont?" and the honest answer is
 * that nobody can tell you: the cold emails are in one table, the reply is an inbox row, the quote
 * is in another, and the jobs in a third. Here they are one timeline, in order.
 */
export default function ContactPane({ id }: { id: number }) {
  const { data } = useApi<{
    contact: Contact; events: ContactEvent[]; jobs: ContactJob[]; documents: ContactDoc[]
  }>(`/pipeline/contact?id=${id}`)
  const { data: team } = useApi<{ team: { id: number; name: string }[] }>("/team")

  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const c = data?.contact
  if (!c) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
  }

  const refresh = () => invalidate("/pipeline", `/pipeline/contact?id=${id}`)
  const overdue = !!c.next_action_at && new Date(c.next_action_at.replace(" ", "T")) <= new Date()

  async function setStage(stage: string) {
    await api("/pipeline/stage", { method: "POST", body: { id, stage } })
    toast.success(`Moved to ${STAGE_META[stage as Stage].label}`)
    refresh()
  }

  async function unlock() {
    await api("/pipeline/unlock", { method: "POST", body: { id } })
    toast.success("The stage will follow the facts again")
    refresh()
  }

  async function assign(ownerId: string) {
    await api("/pipeline/owner", {
      method: "POST",
      body: { id, owner_id: Number(ownerId), next_action_at: c!.next_action_at },
    })
    toast.success("Someone is now chasing this")
    refresh()
  }

  async function markDone() {
    setBusy(true)
    try {
      await api("/pipeline/done", { method: "POST", body: { id } })
      toast.success("Cleared — it's off the hot queue")
      refresh()
    } finally { setBusy(false) }
  }

  async function addNote() {
    if (!note.trim()) return
    setBusy(true)
    try {
      await api("/pipeline/note", { method: "POST", body: { id, note } })
      setNote("")
      refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{c.company || c.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {c.email && <span className="flex items-center gap-1"><Mail className="size-3" /> {c.email}</span>}
              {c.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {c.phone}</span>}
              <span>{SOURCE_LABEL[c.source] ?? c.source}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={c.stage} onValueChange={setStage}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* A pinned stage stops following the facts — say so, and offer the way back. */}
            {c.stage_locked === 1 && (
              <Button variant="outline" size="sm" onClick={unlock} title="Let the stage follow the facts again">
                <Unlock className="size-3.5" /> Pinned
              </Button>
            )}
          </div>
        </div>

        {/* The deadline. This is the thing that stops a hot lead going cold in an inbox. */}
        {c.next_action_at && (
          <div className={cn("mt-3 flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-xs",
            overdue ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
            <span className="font-medium">
              {overdue ? "Needs an answer now" : "Due"} · <TimeStamp value={c.next_action_at} />
            </span>
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {c.owner_name ?? "nobody is chasing this"}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Select onValueChange={assign}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Assign…" /></SelectTrigger>
                <SelectContent>
                  {(team?.team ?? []).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7" onClick={markDone} disabled={busy}>
                <Check className="size-3.5" /> Done
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Their work with us */}
        {(data.jobs.length > 0 || data.documents.length > 0) && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {data.jobs.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><Briefcase className="size-3.5" /> Jobs</p>
                  <ul className="space-y-1">
                    {data.jobs.slice(0, 5).map((j) => (
                      <li key={j.id} className="truncate text-xs">
                        <Link to={`/ego/jobs/detail?id=${j.id}`} className="hover:underline">
                          <span className="font-mono text-muted-foreground">{j.reference}</span> {j.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {data.documents.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><FileText className="size-3.5" /> Quotes &amp; invoices</p>
                  <ul className="space-y-1">
                    {data.documents.slice(0, 5).map((d) => (
                      <li key={d.id} className="truncate text-xs">
                        <Link to={`/ego/invoices/detail?id=${d.id}`} className="hover:underline">
                          <span className="font-mono text-muted-foreground">{d.number ?? "Draft"}</span>{" "}
                          {gbp(Number(d.total))} · {d.status}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Add a note — the phone call that would otherwise live in someone's head */}
        <div className="mb-5 flex gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="Add a note — what was said on the phone?"
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={addNote} disabled={busy || !note.trim()}>
            <Send className="size-3.5" /> Add
          </Button>
        </div>

        {/* THE TIMELINE. The screen that didn't exist. */}
        <h2 className="mb-3 text-sm font-semibold">History</h2>
        {data.events.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nothing has happened yet.</p>
        ) : (
          <ol className="space-y-3">
            {data.events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full",
                  e.kind === "reply" ? "bg-emerald-500"
                    : e.kind === "escalated" || e.kind === "quote_chase" ? "bg-red-500"
                    : "bg-primary/40")} />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{EVENT_LABEL[e.kind] ?? e.kind}</span>
                    {" — "}{e.summary}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <TimeStamp value={e.created_at} />
                    {e.actor_name ? ` · ${e.actor_name}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
