import { useEffect, useState } from "react"
import { Users, Loader2, UserPlus, ShieldCheck, Copy, Power, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ROLE_LABEL, type Role } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface Member {
  id: number; name: string; email: string; phone: string | null
  role: Role; active: number; available: number; pending: number; created_at: string
}

const ROLE_TONE: Record<Role, string> = {
  founder: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  manager: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  office: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  engineer: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
}

export default function TeamPage() {
  const [team, setTeam] = useState<Member[]>([])
  const [assignable, setAssignable] = useState<Role[]>([])
  const [myRole, setMyRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<string>("engineer")
  const [busy, setBusy] = useState(false)
  const [invite, setInvite] = useState<string | null>(null)

  function load() {
    return api<{ team: Member[]; assignable_roles: Role[]; my_role: Role }>("/team").then((r) => {
      setTeam(r.team); setAssignable(r.assignable_roles); setMyRole(r.my_role)
      if (r.assignable_roles.length) setRole(r.assignable_roles[r.assignable_roles.length - 1])
    })
  }
  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function add() {
    if (!name.trim() || !email.trim()) { toast.error("Name and email required"); return }
    setBusy(true)
    try {
      const r = await api<{ invite_token: string }>("/team", { method: "POST", body: { name: name.trim(), email: email.trim(), phone: phone.trim(), role } })
      const link = `${window.location.origin}${import.meta.env.BASE_URL}ego/invite/${r.invite_token}`
      setInvite(link)
      setName(""); setEmail(""); setPhone("")
      await load()
      toast.success("Member added — share the invite link")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setBusy(false) }
  }

  async function changeRole(m: Member, newRole: string) {
    try { await api("/team/update", { method: "POST", body: { id: m.id, role: newRole } }); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  async function toggleActive(m: Member) {
    try { await api("/team/update", { method: "POST", body: { id: m.id, active: m.active ? 0 : 1 } }); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  async function remove(m: Member) {
    if (!confirm(`Remove ${m.name}? They'll lose access immediately.`)) return
    try { await api("/team/delete", { method: "POST", body: { id: m.id } }); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }

  // A member is manageable if their rank is strictly below mine (founder can't be edited by manager, etc.)
  const RANK: Record<Role, number> = { engineer: 1, office: 2, manager: 3, founder: 4 }
  const canManage = (m: Member) => myRole != null && RANK[m.role] < RANK[myRole]

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="size-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Team</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage staff and their access. {team.length} member{team.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        <Button onClick={() => { setInvite(null); setAddOpen(true) }}><UserPlus className="size-4" /> Add member</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {team.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {m.name}
                    {!m.active && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">inactive</span>}
                    {m.pending ? <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-600">invite pending</span> : null}
                    {m.role === "engineer" && m.active ? (
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                        m.available ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                        <span className={cn("size-1.5 rounded-full", m.available ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                        {m.available ? "Available" : "Away"}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
                </div>

                {canManage(m) && assignable.length ? (
                  <Select value={m.role} onValueChange={(v) => changeRole(m, v)}>
                    <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", ROLE_TONE[m.role])}>
                    {m.role === "founder" && <ShieldCheck className="mr-1 inline size-3.5" />}{ROLE_LABEL[m.role]}
                  </span>
                )}

                {canManage(m) && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-8" title={m.active ? "Deactivate" : "Reactivate"} onClick={() => toggleActive(m)}>
                      <Power className={cn("size-4", m.active ? "text-emerald-600" : "text-muted-foreground")} />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" title="Remove" onClick={() => remove(m)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a team member</DialogTitle></DialogHeader>
          {invite ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Share this invite link so they can set a password:</p>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
                <code className="min-w-0 flex-1 truncate text-xs">{invite}</code>
                <Button size="icon" variant="outline" className="size-8 shrink-0" onClick={() => { navigator.clipboard.writeText(invite); toast.success("Copied") }}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <DialogFooter><Button onClick={() => setAddOpen(false)}>Done</Button></DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@egolimited.co.uk" /></div>
                <div className="space-y-1.5"><Label>Phone (optional)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 …" /></div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={add} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Add member</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
