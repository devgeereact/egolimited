import { useMemo, useState } from "react"
import { Check, Loader2, Search, Sparkles, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { invalidate, useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { confirmDialog } from "@/components/ego/confirm"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

import type { Campaign, Lead } from "./types"

/**
 * Leads: find businesses, then decide who's worth talking to. Approving is a human act — nothing
 * is ever emailed because a machine found it.
 *
 * Approving now stamps `approved_at` server-side, which is what "send as soon as they're added"
 * must measure from. v1 had no such column and measured the first step from the day the lead was
 * SCRAPED, so a lead approved a fortnight later got step 1 instantly.
 */

const STATUSES = ["found", "approved", "rejected", "emailed"] as const

export default function LeadsPane({ campaigns }: { campaigns: Campaign[] }) {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("found")
  const [q, setQ] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  // prospecting
  const [query, setQuery] = useState("")
  const [where, setWhere] = useState("")
  const [searching, setSearching] = useState(false)

  const { data, isPending } = useApi<{ leads: Lead[] }>(`/leads?status=${status}`)
  const rows = useMemo(() => {
    const list = data?.leads ?? []
    const s = q.trim().toLowerCase()
    return s ? list.filter((l) => [l.name, l.company, l.email].join(" ").toLowerCase().includes(s)) : list
  }, [data, q])

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  async function findLeads() {
    if (!query.trim()) { toast.error("Describe the businesses you're looking for"); return }
    setSearching(true)
    try {
      const r = await api<{ found: number; skipped: number; no_email: number }>("/leads/search", {
        method: "POST", body: { query, location: where },
      })
      // Report what actually happened, including the businesses we had to drop. The old toast said
      // "9 new" while the list stayed empty, because leads with no published email were counted as
      // found and then filtered out of every view.
      const bits = [
        `${r.found} new`,
        r.skipped ? `${r.skipped} already known` : null,
        r.no_email ? `${r.no_email} had no public email` : null,
      ].filter(Boolean)
      toast.success(bits.join(" · "))
      setStatus("found")
      invalidate("/leads")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed")
    } finally { setSearching(false) }
  }

  async function decide(action: "approve" | "reject") {
    if (!selected.size) return
    setBusy(true)
    try {
      // The count in this toast is the number of rows the server ACTUALLY changed. v1 returned the
      // number of ids you sent, so re-approving an already-approved lead cheerfully said "Approved 5".
      const r = await api<{ count: number }>(`/leads/${action}`, { method: "POST", body: { ids: [...selected] } })
      toast.success(`${r.count} ${action === "approve" ? "approved" : "rejected"}`)
      setSelected(new Set())
      invalidate("/leads")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update")
    } finally { setBusy(false) }
  }

  async function addTo(campaignId: string) {
    if (!selected.size) return
    setBusy(true)
    try {
      const r = await api<{ enrolled: number; suppressed: number; duplicate: number }>("/campaigns/enroll", {
        method: "POST", body: { campaign_id: Number(campaignId), lead_ids: [...selected] },
      })
      const bits = [
        r.enrolled ? `${r.enrolled} added` : null,
        r.duplicate ? `${r.duplicate} already in it` : null,
        r.suppressed ? `${r.suppressed} skipped (opted out)` : null,
      ].filter(Boolean)
      toast.success(bits.join(" · ") || "Nothing to add")
      setSelected(new Set())
      invalidate("/campaigns")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add them")
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!selected.size) return
    if (!(await confirmDialog({
      title: `Delete ${selected.size} lead${selected.size === 1 ? "" : "s"}?`,
      body: "This removes them entirely. Anyone already emailed keeps their history.",
      confirmText: "Delete",
      danger: true,
    }))) return
    await api("/leads/delete", { method: "POST", body: { ids: [...selected] } })
    setSelected(new Set())
    invalidate("/leads")
    toast.success("Deleted")
  }

  const sendable = campaigns.filter((c) => c.status === "draft" || c.status === "active" || c.status === "paused")

  return (
    <div className="flex h-full flex-col border-r">
      {/* Find businesses */}
      <div className="space-y-2 border-b p-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. managing agents for blocks of flats" className="h-8 text-sm" />
        <div className="flex gap-2">
          <Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Where? (optional)" className="h-8 text-sm" />
          <Button size="sm" onClick={findLeads} disabled={searching}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Find
          </Button>
        </div>
      </div>

      {/* Triage */}
      <div className="space-y-2 border-b p-3">
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button key={`status-${s}`} onClick={() => { setStatus(s); setSelected(new Set()) }}
              className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
              {s === "found" ? "New" : s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads" className="h-8 pl-8 text-sm" aria-label="Search leads" />
        </div>
      </div>

      {/* Bulk actions appear only when there's a selection — no dead buttons. */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/40 p-2">
          <span className="px-1 text-xs font-medium">{selected.size} selected</span>
          {status === "found" && (
            <>
              <Button size="sm" variant="secondary" className="h-7" onClick={() => decide("approve")} disabled={busy}>
                <Check className="size-3.5" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => decide("reject")} disabled={busy}>
                <X className="size-3.5" /> Reject
              </Button>
            </>
          )}
          {status === "approved" && sendable.length > 0 && (
            <Select onValueChange={addTo}>
              <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="Add to campaign…" /></SelectTrigger>
              <SelectContent>
                {sendable.map((c) => <SelectItem key={`camp-${c.id}`} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-muted-foreground hover:text-destructive"
            onClick={remove} aria-label="Delete selected leads">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium">
              {status === "found" ? "No new leads" : `Nothing ${status}`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === "found" ? "Describe who you want to reach and search above." : "Approve some new leads to see them here."}
            </p>
          </div>
        ) : (
          <>
            {/* The select-all row is a header, not a list item — it belongs outside the <ul>. */}
            <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
              <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
              <span className="text-[11px] font-medium text-muted-foreground">{rows.length} lead{rows.length === 1 ? "" : "s"}</span>
            </div>
            <ul className="divide-y">
            {rows.map((l) => (
              <li key={`lead-${l.id}`} className={cn("flex items-start gap-2 px-3 py-2.5 hover:bg-muted/40", selected.has(l.id) && "bg-primary/5")}>
                <Checkbox className="mt-0.5" checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)}
                  aria-label={`Select ${l.company || l.email}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.company || l.name || l.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.email}</p>
                  {l.website && <p className="truncate text-[11px] text-muted-foreground/70">{l.website}</p>}
                </div>
              </li>
            ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
