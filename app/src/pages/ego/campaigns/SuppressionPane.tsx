import { useState } from "react"
import { Loader2, Plus, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { invalidate, useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { Suppression } from "./types"

/**
 * The suppression list — a first-class destination, not a hidden flag.
 *
 * It is the most important screen in this section and v1 didn't have one. People who opted out
 * lived as `subscribed=0` on a subscriber row, and an admin retyping their address did
 * `ON DUPLICATE KEY UPDATE subscribed=1` — silently resurrecting someone who had said stop. That is
 * the one thing PECR does not forgive, and it happened by accident, invisibly.
 *
 * Here, being on this list is a fact with a reason. Someone who actually unsubscribed cannot be
 * taken off it at all: the server refuses (409), because there is no legitimate reason to email them
 * again, and a UI that lets you try is a UI that invites you to.
 */

const REASON_META: Record<Suppression["reason"], { label: string; className: string; help: string }> = {
  unsubscribed: { label: "Opted out", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400", help: "They clicked unsubscribe. Permanent." },
  bounced: { label: "Bounced", className: "bg-red-500/15 text-red-600 dark:text-red-400", help: "The address doesn't exist." },
  complained: { label: "Complained", className: "bg-red-500/15 text-red-600 dark:text-red-400", help: "Marked as spam." },
  manual: { label: "Added by us", className: "bg-muted text-muted-foreground", help: "Someone here added them." },
}

export default function SuppressionPane() {
  const { data, isPending } = useApi<{ suppressions: Suppression[]; total: number }>("/suppressions")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!email.trim()) return
    setBusy(true)
    try {
      await api("/suppressions", { method: "POST", body: { email } })
      toast.success("Added — they'll never be emailed again, and any live sequence has stopped")
      setEmail("")
      invalidate("/suppressions", "/campaigns")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add")
    } finally { setBusy(false) }
  }

  const rows = data?.suppressions ?? []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ShieldCheck className="size-4 text-emerald-600" /> Do not email
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {data?.total ?? 0} address{(data?.total ?? 0) === 1 ? "" : "es"}. Checked when someone is added to a campaign,
          and again immediately before every single email — so an opt-out between the two still stops the send.
        </p>
      </div>

      <div className="flex gap-2 border-b p-3">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
          placeholder="Add an address we should never email" className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button size="sm" onClick={add} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">Nobody has asked us to stop</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unsubscribes and bounced addresses land here automatically.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((s) => (
              <li key={s.email} className="flex items-center gap-3 px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {REASON_META[s.reason].help}
                    {s.source ? ` · ${s.source}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", REASON_META[s.reason].className)}>
                  {REASON_META[s.reason].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
