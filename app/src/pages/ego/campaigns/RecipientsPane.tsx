import { useMemo, useState } from "react"
import { Loader2, Search, ShieldOff, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { invalidate, useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { confirmDialog } from "@/components/ego/confirm"
import { TimeStamp } from "@/components/ego/TimeStamp"

import { STATE_META, type Campaign, type Enrollment, type EnrollState } from "./types"

/**
 * The middle pane: who is in this campaign, and exactly where each person has got to.
 *
 * This is the screen v1 could not have shown you at all. Progress lived on the LEAD as a single
 * enum, so "where is Bell Court up to?" had no answer — and a manual bulk send could quietly
 * abandon their sequence with nothing to see. Here every row is an enrolment with its own state,
 * its own cursor, and a reason if it stopped.
 */

const FILTERS: { key: EnrollState | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "In sequence" },
  { key: "replied", label: "Replied" },
  { key: "completed", label: "Finished" },
  { key: "bounced", label: "Bounced" },
  { key: "unsubscribed", label: "Opted out" },
]

function dueLabel(e: Enrollment, totalSteps: number): string {
  if (e.state === "replied") return "They replied — sequence stopped"
  if (e.state === "bounced") return "Address doesn't exist"
  if (e.state === "unsubscribed") return "Opted out"
  if (e.state === "stopped") return e.stop_reason ?? "Stopped"
  if (e.state === "completed") return `All ${e.sent_count} emails sent`
  if (!e.next_due_at) return "Waiting"
  const next = e.current_step + 1
  // Never promise a step the sequence doesn't have. The label used to count the next step without
  // knowing how many existed, so a 2-step campaign cheerfully said "Step 3 due in 2 days".
  if (totalSteps > 0 && next > totalSteps) return `All ${e.sent_count} emails sent`
  const due = new Date(e.next_due_at.replace(" ", "T"))
  const days = Math.round((due.getTime() - Date.now()) / 86_400_000)
  const when = days <= 0 ? "due now" : days === 1 ? "due tomorrow" : `due in ${days} days`
  return `Step ${next} of ${totalSteps || "?"} ${when}`
}

export default function RecipientsPane({ campaign }: { campaign: Campaign }) {
  const [filter, setFilter] = useState<EnrollState | "all">("all")
  const [q, setQ] = useState("")
  const [adding, setAdding] = useState(false)

  const path = `/campaigns/enrollments?id=${campaign.id}${filter === "all" ? "" : `&state=${filter}`}`
  const { data, isPending } = useApi<{ enrollments: Enrollment[] }>(path)

  const rows = useMemo(() => {
    const list = data?.enrollments ?? []
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter((e) => [e.name, e.company, e.email].join(" ").toLowerCase().includes(s))
  }, [data, q])

  /** Add every approved lead that isn't already here. The server refuses anyone suppressed and
   *  tells us exactly what happened to each — no fake "added 12" when it added none. */
  async function addApproved() {
    setAdding(true)
    try {
      const r = await api<{ enrolled: number; suppressed: number; duplicate: number }>("/campaigns/enroll", {
        method: "POST",
        body: { campaign_id: campaign.id, audience: "approved_leads" },
      })
      const bits = [
        r.enrolled ? `${r.enrolled} added` : null,
        r.duplicate ? `${r.duplicate} already here` : null,
        r.suppressed ? `${r.suppressed} skipped (opted out)` : null,
      ].filter(Boolean)
      toast.success(bits.length ? bits.join(" · ") : "Nobody new to add")
      invalidate("/campaigns")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add recipients")
    } finally { setAdding(false) }
  }

  async function stop(e: Enrollment) {
    if (!(await confirmDialog({
      title: `Stop emailing ${e.name || e.company || e.email}?`,
      body: "They'll get no further steps. What we've already sent stays on their record.",
      confirmText: "Stop the sequence",
    }))) return
    await api("/campaigns/unenroll", { method: "POST", body: { id: e.id } })
    invalidate("/campaigns")
    toast.success("Stopped")
  }

  return (
    <div className="flex h-full flex-col border-r">
      <div className="space-y-2.5 border-b p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipients"
              className="h-8 pl-8 text-sm" aria-label="Search recipients" />
          </div>
          <Button size="sm" variant="secondary" onClick={addApproved} disabled={adding} title="Add every approved lead">
            {adding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">Nobody here yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your approved leads and they&apos;ll start the sequence.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={addApproved} disabled={adding}>
              <UserPlus className="size-4" /> Add approved leads
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((e) => (
              <li key={e.id} className="group flex items-start gap-2 px-3 py-2.5 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.name || e.company || e.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.email}</p>
                  <p className="mt-1 flex items-center gap-1.5">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", STATE_META[e.state].className)}>
                      {STATE_META[e.state].label}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">{dueLabel(e, campaign.steps)}</span>
                  </p>
                  {e.last_sent_at && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      <TimeStamp value={e.last_sent_at} prefix="Last emailed" />
                    </p>
                  )}
                </div>
                {e.state === "active" && (
                  <Button
                    variant="ghost" size="icon"
                    className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => stop(e)}
                    aria-label={`Stop emailing ${e.email}`}
                    title="Stop the sequence"
                  >
                    <ShieldOff className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
