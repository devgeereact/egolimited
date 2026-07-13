import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle, Building2, Check, ExternalLink, Loader2, MapPin, RefreshCw, Search, X,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { invalidate, useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { gbp } from "@/lib/invoicing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TimeStamp } from "@/components/ego/TimeStamp"

import { TENDER_TABS, type Tender, type TenderStatus } from "./types"

/**
 * TENDERS — the only place work comes TO us.
 *
 * Everything else in this app is push: we email a stranger and hope. This is pull. Councils,
 * schools, NHS trusts and housing associations are required to publish the work they need doing,
 * and they publish it as structured, open data. We read the official Contracts Finder API — no
 * scraping, no login, no personal data, nothing to argue with a regulator about.
 *
 * The list is sorted by DEADLINE, always. A tender is worth exactly nothing the moment it closes,
 * and there is no second chance, so "closing soonest" is the only honest order for this screen.
 */
export default function TendersPage() {
  const [tab, setTab] = useState<TenderStatus>("new")
  const [q, setQ] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)

  const { data, isPending } = useApi<{
    tenders: Tender[]
    counts: Record<string, number>
    closing_soon: number
  }>(`/tenders?status=${tab}`)

  const rows = useMemo(() => {
    const list = data?.tenders ?? []
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter((t) =>
      [t.title, t.buyer, t.cpv_label, t.postcode].join(" ").toLowerCase().includes(s))
  }, [data, q])

  async function sync() {
    setSyncing(true)
    try {
      const r = await api<{ seen: number; matched: number; added: number }>("/tenders/sync", {
        method: "POST", body: { days: 7 },
      })
      toast.success(
        r.added > 0
          ? `${r.added} new — ${r.matched} matched out of ${r.seen} notices`
          : `Nothing new. Checked ${r.seen} notices.`
      )
      invalidate("/tenders")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reach Contracts Finder")
    } finally { setSyncing(false) }
  }

  async function decide(t: Tender, status: TenderStatus) {
    setBusy(t.id)
    try {
      const r = await api<{ customer_id: number | null }>("/tenders/decide", {
        method: "POST", body: { id: t.id, status },
      })
      // Shortlisting is not a bookmark: it puts the buyer in the Pipeline with the tender's own
      // deadline. Say so, or nobody will believe the button did anything.
      toast.success(
        status === "shortlisted"
          ? r.customer_id
            ? "Shortlisted — the buyer is in your Pipeline, due 3 days before it closes"
            : "Shortlisted (this buyer published no contact email, so there's nobody to add)"
          : status === "rejected" ? "Passed on it" : "Updated"
      )
      invalidate("/tenders")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that")
    } finally { setBusy(null) }
  }

  const closingSoon = data?.closing_soon ?? 0

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenders</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Public bodies must publish the work they need doing. This reads the official Contracts
            Finder feed and keeps the notices EGO could actually do.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Check now
        </Button>
      </div>

      {/* The number that should make someone move. */}
      {closingSoon > 0 && tab === "new" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            <strong>{closingSoon}</strong> {closingSoon === 1 ? "closes" : "close"} within a week.
            A tender is worth nothing the day after it shuts.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {TENDER_TABS.map((t) => {
          const n = data?.counts?.[t.key] ?? 0
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              title={t.help}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {t.label}
              {n > 0 && <span className="tabular-nums opacity-70">{n}</span>}
            </button>
          )
        })}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenders"
            className="h-8 pl-8 text-sm" aria-label="Search tenders" />
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium">
            {tab === "new" ? "Nothing waiting" : `Nothing ${TENDER_TABS.find((t) => t.key === tab)?.label.toLowerCase()}`}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {tab === "new"
              ? "The feed runs every morning. Hit “Check now” to pull the last week yourself."
              : TENDER_TABS.find((t) => t.key === tab)?.help}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => {
            const due = t.deadline_at ? new Date(t.deadline_at.replace(" ", "T")) : null
            const days = due ? (due.getTime() - Date.now()) / 86_400_000 : null
            const urgent = days !== null && days <= 7
            return (
              <li key={t.id}
                className={cn("rounded-xl border bg-card p-4 transition-colors hover:border-primary/30",
                  urgent && tab === "new" && "border-red-500/30")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{t.title}</p>

                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {t.buyer && <span className="flex items-center gap-1"><Building2 className="size-3" /> {t.buyer}</span>}
                      {t.postcode && <span className="flex items-center gap-1"><MapPin className="size-3" /> {t.postcode}</span>}
                      {t.value_amount !== null && (
                        <span className="font-medium text-foreground">{gbp(t.value_amount)}</span>
                      )}
                      {t.sme === 1 && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">SME-friendly</Badge>}
                    </p>

                    {/* Why this is in front of you. A human triaging fifty of these needs the reason,
                        not a shrug. */}
                    {t.match_reason && (
                      <p className="mt-1 truncate text-[11px] text-muted-foreground/80">{t.match_reason}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {due && (
                      <span className={cn("text-xs font-medium",
                        urgent ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        Closes <TimeStamp value={t.deadline_at!} />
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      {t.url && (
                        <Button asChild size="sm" variant="ghost" className="h-7">
                          <a href={t.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5" /> Notice
                          </a>
                        </Button>
                      )}
                      {t.customer_id && (
                        <Button asChild size="sm" variant="ghost" className="h-7">
                          <Link to="/ego/pipeline">In Pipeline</Link>
                        </Button>
                      )}
                      {tab === "new" && (
                        <>
                          <Button size="sm" className="h-7" disabled={busy === t.id}
                            onClick={() => decide(t, "shortlisted")}>
                            <Check className="size-3.5" /> Shortlist
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-muted-foreground"
                            disabled={busy === t.id} onClick={() => decide(t, "rejected")}
                            aria-label="Not for us">
                            <X className="size-3.5" />
                          </Button>
                        </>
                      )}
                      {tab === "shortlisted" && (
                        <Button size="sm" className="h-7" disabled={busy === t.id}
                          onClick={() => decide(t, "bid")}>
                          Mark as bid
                        </Button>
                      )}
                      {tab === "bid" && (
                        <>
                          <Button size="sm" className="h-7" disabled={busy === t.id}
                            onClick={() => decide(t, "won")}>Won</Button>
                          <Button size="sm" variant="ghost" className="h-7" disabled={busy === t.id}
                            onClick={() => decide(t, "lost")}>Lost</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
