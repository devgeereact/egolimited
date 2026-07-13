import { useMemo, useState } from "react"
import { Clock, Loader2, Plus, Send, ShieldCheck, Sparkles, Users } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { invalidate, useApi } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import LeadsPane from "./LeadsPane"
import RecipientsPane from "./RecipientsPane"
import SequenceEditor from "./SequenceEditor"
import SuppressionPane from "./SuppressionPane"
import { STATUS_META, type Campaign } from "./types"

/**
 * CAMPAIGNS — a three-pane mail workspace.
 *
 * Three panes because that is the shape mail *is*: Gmail, Outlook and Superhuman all converged on
 * it independently. Left = what you're working on. Middle = who's in it. Right = the work itself.
 *
 * v1 was three tabs (Compose / Leads / Automation), each owning a slice of the same job, so the
 * actual workflow — find someone, decide they're worth talking to, write a sequence, watch it run —
 * was spread across all three with no thread connecting them, and with three different ways to send
 * an email that could silently undo each other. See docs/CAMPAIGNS-V2.md.
 */

type View = { kind: "campaign"; id: number } | { kind: "leads" } | { kind: "suppression" }

export default function CampaignsPage() {
  const { data, isPending } = useApi<{ campaigns: Campaign[]; suppressed: number; window: string | null }>("/campaigns")
  const campaigns = useMemo(() => data?.campaigns ?? [], [data])

  // `null` means "nothing chosen yet" — we DERIVE the landing pane rather than setting state in an
  // effect. Same reason as everywhere else in this app: a setState-in-effect costs an extra render
  // and creates a second source of truth that can drift from the one below it.
  const [picked, setPicked] = useState<View | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  // Land on the campaign you're most likely to want: the one that's actually sending.
  const view: View = picked ?? (campaigns.length > 0
    ? { kind: "campaign", id: (campaigns.find((c) => c.status === "active") ?? campaigns[0]).id }
    : { kind: "leads" })
  const setView = (v: View) => setPicked(v)

  const selected = view.kind === "campaign" ? campaigns.find((c) => c.id === view.id) : undefined

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-1 overflow-hidden rounded-xl border bg-background">
      {/* ── LEFT: what you're working on ───────────────────────────── */}
      <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/20">
        <div className="p-3">
          <Button className="w-full" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> New campaign
          </Button>
        </div>

        {/* The sending window, stated plainly. Nobody should have to wonder why nothing has gone out. */}
        {data?.window && (
          <div className="mx-3 mb-2 flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
            <Clock className="mt-px size-3.5 shrink-0" />
            <span>Nothing sends right now — {data.window}. Emails go out Mon–Fri, 8am–6pm.</span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Campaigns
          </p>
          {isPending ? (
            <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
          ) : campaigns.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              None yet. A campaign is a short sequence of emails to a list of businesses.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {campaigns.map((c) => {
                const on = view.kind === "campaign" && view.id === c.id
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setView({ kind: "campaign", id: c.id })}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                        on ? "bg-background shadow-sm" : "hover:bg-background/60"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_META[c.status].dot)} />
                        <span className="truncate text-sm font-medium">{c.name}</span>
                      </span>
                      <span className="mt-0.5 block truncate pl-3 text-[11px] text-muted-foreground">
                        {STATUS_META[c.status].label} · {c.total} recipient{c.total === 1 ? "" : "s"}
                        {c.replied > 0 && ` · ${c.replied} replied`}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Audience
          </p>
          <ul className="space-y-0.5">
            <li>
              <RailItem icon={Users} label="Leads" active={view.kind === "leads"} onClick={() => setView({ kind: "leads" })} />
            </li>
            <li>
              <RailItem
                icon={ShieldCheck}
                label="Do not email"
                badge={data?.suppressed || undefined}
                active={view.kind === "suppression"}
                onClick={() => setView({ kind: "suppression" })}
              />
            </li>
          </ul>
        </nav>
      </aside>

      {/* ── MIDDLE + RIGHT ─────────────────────────────────────────── */}
      {view.kind === "suppression" ? (
        <main className="flex-1 overflow-hidden"><SuppressionPane /></main>
      ) : view.kind === "leads" ? (
        <>
          <div className="w-80 shrink-0 overflow-hidden"><LeadsPane campaigns={campaigns} /></div>
          <main className="flex flex-1 items-center justify-center p-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <h2 className="text-base font-semibold">Find businesses worth talking to</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search for the kind of business you want as a customer, approve the ones that look right, then add them
                to a campaign. Nothing is ever emailed automatically — a person approves every name.
              </p>
            </div>
          </main>
        </>
      ) : selected ? (
        <>
          <div className="w-80 shrink-0 overflow-hidden"><RecipientsPane campaign={selected} /></div>
          <main className="flex-1 overflow-hidden"><SequenceEditor campaign={selected} /></main>
        </>
      ) : (
        <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Pick a campaign</main>
      )}

      <NewCampaign open={newOpen} onOpenChange={setNewOpen} onCreated={(id) => setView({ kind: "campaign", id })} />
    </div>
  )
}

function RailItem({
  icon: Icon, label, badge, active, onClick,
}: { icon: typeof Users; label: string; badge?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/60"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums">{badge}</span>
      ) : null}
    </button>
  )
}

function NewCampaign({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim()) { toast.error("Give it a name"); return }
    setBusy(true)
    try {
      const r = await api<{ id: number }>("/campaigns", { method: "POST", body: { name, audience: "leads" } })
      invalidate("/campaigns")
      onOpenChange(false)
      setName("")
      onCreated(r.id)
      toast.success("Campaign created — write the first email")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create it")
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="size-4" /> New campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="e.g. Managing agents — spring"
          />
          <p className="text-xs text-muted-foreground">
            You&apos;ll write the emails next. Nothing sends until you press Start.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
