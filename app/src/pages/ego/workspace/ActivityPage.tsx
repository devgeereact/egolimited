import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Activity, BadgePoundSterling, CalendarClock, Camera, ChevronLeft, ChevronRight, FileText,
  Loader2, Lock, Mail, MessageSquare, PauseCircle, Plus, Search, Star, StickyNote, type LucideIcon,
} from "lucide-react"

import { useApi } from "@/lib/query"
import { TimeStamp } from "@/components/ego/TimeStamp"
import { STATUS_LABEL, type JobStatus } from "@/lib/jobStatus"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Event {
  id: number; action: string; detail: string | null; created_at: string
  job_id: number | null; job_reference: string | null; actor_id: number | null; actor_name: string | null
}
interface User { id: number; name: string; role: string }
interface Resp {
  activity: Event[]; total: number; page: number; per_page: number; pages: number
  scope: "all" | "self"; users?: User[]
}

const ALL = "__all__"

const ICON: Record<string, LucideIcon> = {
  created: Plus, status_changed: CalendarClock, scheduled: CalendarClock,
  note: StickyNote, photo: Camera, quote_created: FileText, invoice_created: FileText,
  quote_sent: Mail, invoice_sent: Mail, emailed: Mail, invoice_reminder: Mail,
  payment_recorded: BadgePoundSterling, review: Star, portal_message: MessageSquare,
  ready_to_invoice: FileText, on_hold: PauseCircle,
}

function describe(action: string, detail: string | null): string {
  let d: Record<string, unknown> = {}
  try { d = detail ? JSON.parse(detail) : {} } catch { /* ignore */ }
  switch (action) {
    case "created": return `Job created${d.reference ? ` (${d.reference})` : ""}${d.recurring ? " · recurring" : ""}`
    case "status_changed": return `Status ${STATUS_LABEL[d.from as JobStatus] ?? d.from} → ${STATUS_LABEL[d.to as JobStatus] ?? d.to}${d.note ? ` · ${d.note}` : ""}`
    case "scheduled": return `Scheduled${d.start ? ` for ${String(d.start).slice(0, 16)}` : ""}`
    case "note": return `Note added${d.body ? `: ${String(d.body).slice(0, 80)}` : ""}`
    case "photo": return "Photo uploaded"
    case "quote_created": return "Quote drafted"
    case "invoice_created": return "Invoice drafted"
    case "quote_sent": return `Quote sent${d.number ? ` (${d.number})` : ""}`
    case "invoice_sent": return `Invoice sent${d.number ? ` (${d.number})` : ""}`
    case "emailed": return `Emailed${d.to ? ` ${d.to}` : ""}`
    case "invoice_reminder": return `Payment reminder sent${d.to ? ` to ${d.to}` : ""}`
    case "payment_recorded": return `Payment recorded${d.amount ? ` · £${d.amount}` : ""}`
    case "review": return `Customer review${d.rating ? ` · ${d.rating}★` : ""}`
    case "portal_message": return `Message via portal${d.from ? ` from ${d.from}` : ""}`
    case "ready_to_invoice": return "Marked ready to invoice"
    default: return action.replace(/_/g, " ")
  }
}

export default function ActivityPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [user, setUser] = useState<string>(ALL)
  const [query, setQuery] = useState({ page: 1, q: "", user: ALL })

  const onSearch = (v: string) => { setQ(v); setPage(1) }
  const onUser = (v: string) => { setUser(v); setPage(1) }

  // Single debounced fetch; handlers reset the page so a new query starts at 1.
  useEffect(() => {
    const t = setTimeout(() => setQuery({ page, q, user }), 250)
    return () => clearTimeout(t)
  }, [page, q, user])

  const qs = useMemo(() => {
    const p = new URLSearchParams({ page: String(query.page) })
    if (query.q.trim()) p.set("q", query.q.trim())
    if (query.user !== ALL) p.set("user", query.user)
    return p.toString()
  }, [query])

  const { data, isPending } = useApi<Resp>(`/activity?${qs}`)
  const loading = isPending

  const events = data?.activity ?? []
  const isFounder = data?.scope === "all"
  const pages = data?.pages ?? 1

  return (
    <div className={embedded ? "flex flex-col gap-5" : "flex flex-1 flex-col gap-6 p-4 md:p-6"}>
      {embedded ? (
        <div className="flex flex-wrap items-center gap-2">
          <Activity className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {isFounder ? "· full audit trail" : (<>· <Lock className="size-3.5" /> your activity</>)}{data ? ` · ${data.total}` : ""}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-none tracking-tight">Activity log</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {isFounder ? "Full company audit trail — who did what." : (<><Lock className="size-3.5" /> Your activity only.</>)}
                {data ? ` · ${data.total} entries` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search action, job, person…" className="pl-9" />
        </div>
        {isFounder && data?.users && (
          <Select value={user} onValueChange={onUser}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All users" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All users</SelectItem>
              {data.users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>{u.name} <span className="text-muted-foreground">· {u.role}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          {loading ? (
            <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : events.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No activity{q || user !== ALL ? " matches the filters" : " yet"}.</p>
          ) : (
            <ol className="relative space-y-5 border-l pl-6">
              {events.map((e) => {
                const Icon = ICON[e.action] ?? Activity
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-background">
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-sm">{describe(e.action, e.detail)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <TimeStamp value={e.created_at} />
                      {e.job_reference && (
                        <> · <Link to={`/ego/jobs/detail?id=${e.job_id}`} className="font-mono text-primary hover:underline">{e.job_reference}</Link></>
                      )}
                      <> · {e.actor_name ?? "System"}</>
                    </p>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {data?.page ?? page} of {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={loading || page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
