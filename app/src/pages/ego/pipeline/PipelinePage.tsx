import { useMemo, useState } from "react"
import { AlertCircle, Loader2, Search } from "lucide-react"

import { useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { TimeStamp } from "@/components/ego/TimeStamp"

import ContactPane from "./ContactPane"
import { SOURCE_LABEL, STAGE_META, STAGES, type Contact, type Stage } from "./types"

/**
 * PIPELINE — one place a business exists, from stranger to paying customer.
 *
 * This replaces Campaigns + Leads + Automation, which were three fragments of one process. The
 * fragmentation was the bug: a cold prospect lived in ego_leads, a website enquiry became an inbox
 * email, a customer lived in ego_customers, and NOTHING joined them. So the moment that decides
 * whether EGO earns money — someone saying "yes, quote me" — had nowhere to go.
 *
 * Three panes: stage → who's in it → the whole story of one business.
 */
export default function PipelinePage() {
  const { data: summary } = useApi<{ counts: Record<string, number>; due: number }>("/pipeline")
  const [stage, setStage] = useState<Stage>("interested")
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<number | null>(null)

  const { data, isPending } = useApi<{ contacts: Contact[] }>(`/pipeline/contacts?stage=${stage}`)

  const rows = useMemo(() => {
    const list = data?.contacts ?? []
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter((c) => [c.name, c.company, c.email, c.phone].join(" ").toLowerCase().includes(s))
  }, [data, q])

  // Keep the selection honest: if the chosen contact isn't in this stage's list, show the first.
  const selected = picked && rows.some((r) => r.id === picked) ? picked : rows[0]?.id ?? null

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-1 overflow-hidden rounded-xl border bg-background">
      {/* ── LEFT: the stages ─────────────────────────────────────── */}
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20">
        {/* The number that should make someone anxious. */}
        {(summary?.due ?? 0) > 0 && (
          <div className="m-3 flex items-start gap-2 rounded-md bg-red-500/10 p-2 text-[11px] font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            <span>{summary!.due} waiting on us right now</span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-2">
          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pipeline
          </p>
          <ul className="space-y-0.5">
            {STAGES.map((s) => {
              const n = summary?.counts?.[s.key] ?? 0
              const on = stage === s.key
              return (
                <li key={s.key}>
                  <button
                    onClick={() => { setStage(s.key); setPicked(null) }}
                    title={s.help}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      on ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/60"
                    )}
                  >
                    <span className="truncate">{s.label}</span>
                    {n > 0 && (
                      <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums">{n}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* ── MIDDLE: who's in this stage ──────────────────────────── */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
              className="h-8 pl-8 text-sm" aria-label="Search contacts" />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {STAGES.find((s) => s.key === stage)?.help}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isPending ? (
            <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">Nobody here.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((c) => {
                const overdue = !!c.next_action_at && new Date(c.next_action_at.replace(" ", "T")) <= new Date()
                const on = selected === c.id
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setPicked(c.id)}
                      className={cn("w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                        on && "bg-primary/5")}
                    >
                      <p className="truncate text-sm font-medium">{c.company || c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", STAGE_META[c.stage].className)}>
                          {SOURCE_LABEL[c.source] ?? c.source}
                        </span>
                        {c.next_action_at && (
                          <span className={cn("text-[11px]", overdue ? "font-medium text-red-600" : "text-muted-foreground")}>
                            {overdue ? "Needs an answer" : "Due"} <TimeStamp value={c.next_action_at} />
                          </span>
                        )}
                        {!c.next_action_at && c.last_activity_at && (
                          <span className="text-[11px] text-muted-foreground">
                            <TimeStamp value={c.last_activity_at} />
                          </span>
                        )}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── RIGHT: the whole story of one business ───────────────── */}
      <main className="flex-1 overflow-hidden">
        {selected ? (
          <ContactPane key={selected} id={selected} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="max-w-xs">
              <p className="text-sm font-medium">Nothing in {STAGES.find((s) => s.key === stage)?.label.toLowerCase()}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stage === "interested"
                  ? "When someone replies to us, they land here — owned, with a deadline."
                  : STAGES.find((s) => s.key === stage)?.help}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
