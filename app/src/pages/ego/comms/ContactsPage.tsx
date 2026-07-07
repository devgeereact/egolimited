import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Contact, Loader2, Mail, Phone, Search, Plus, UserPlus, Pencil, Trash2,
  Power, ShieldCheck, Copy,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { confirmDialog } from "@/components/ego/confirm"
import { cn } from "@/lib/utils"
import { useAuth } from "@/store/auth.store"
import { atLeast, ROLE_LABEL, ROLE_RANK, type Role } from "@/lib/roles"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface Customer { id: number; name: string; phone: string | null; email: string | null; ref_code: string | null }
interface Member {
  id: number; name: string; email: string; phone: string | null
  role: Role; active: number; available?: number; pending?: number
}

type Tab = "customers" | "team"

const ROLE_TONE: Record<Role, string> = {
  founder: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  manager: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  office: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  engineer: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
}

const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(name)}
    </span>
  )
}

/** Blank customer form values. */
const EMPTY_CUST = { id: 0, name: "", phone: "", email: "", notes: "", line1: "", city: "", postcode: "" }
type CustForm = typeof EMPTY_CUST

export default function ContactsPage() {
  const { user } = useAuth()
  const canManageTeam = atLeast(user?.role, "manager")

  const [customers, setCustomers] = useState<Customer[]>([])
  const [team, setTeam] = useState<Member[]>([])
  const [assignable, setAssignable] = useState<Role[]>([])
  const [myRole, setMyRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("customers")
  const [q, setQ] = useState("")

  // ---- customer create/edit dialog ----
  const [custOpen, setCustOpen] = useState(false)
  const [cust, setCust] = useState<CustForm>(EMPTY_CUST)
  const [custBusy, setCustBusy] = useState(false)

  // ---- team add dialog ----
  const [teamOpen, setTeamOpen] = useState(false)
  const [tName, setTName] = useState("")
  const [tEmail, setTEmail] = useState("")
  const [tPhone, setTPhone] = useState("")
  const [tRole, setTRole] = useState("engineer")
  const [teamBusy, setTeamBusy] = useState(false)
  const [invite, setInvite] = useState<string | null>(null)

  function loadCustomers() {
    return api<{ customers: Customer[] }>("/customers").then((r) => setCustomers(r.customers))
  }
  function loadTeam() {
    // Managers+ get the rich team endpoint (roles, active, invite). Office view engineers only.
    if (canManageTeam) {
      return api<{ team: Member[]; assignable_roles: Role[]; my_role: Role }>("/team").then((r) => {
        setTeam(r.team); setAssignable(r.assignable_roles); setMyRole(r.my_role)
        if (r.assignable_roles.length) setTRole(r.assignable_roles[r.assignable_roles.length - 1])
      })
    }
    return api<{ engineers: Member[] }>("/engineers").then((r) => setTeam(r.engineers))
  }

  useEffect(() => {
    Promise.all([loadCustomers(), loadTeam()]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const custRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return customers
    return customers.filter((r) => [r.name, r.phone ?? "", r.email ?? ""].join(" ").toLowerCase().includes(s))
  }, [q, customers])

  const teamRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return team
    return team.filter((r) => [r.name, r.phone ?? "", r.email ?? ""].join(" ").toLowerCase().includes(s))
  }, [q, team])

  // ----- customer actions -----
  function openNewCustomer() { setCust(EMPTY_CUST); setCustOpen(true) }
  async function openEditCustomer(id: number) {
    setCust({ ...EMPTY_CUST, id })
    setCustOpen(true)
    try {
      const { customer } = await api<{ customer: any }>(`/customers/get?id=${id}`)
      const a = customer.addresses?.[0] ?? {}
      setCust({
        id, name: customer.name ?? "", phone: customer.phone ?? "", email: customer.email ?? "",
        notes: customer.notes ?? "", line1: a.line1 ?? "", city: a.city ?? "", postcode: a.postcode ?? "",
      })
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load") }
  }
  async function saveCustomer() {
    if (cust.name.trim().length < 2) { toast.error("Name is required"); return }
    setCustBusy(true)
    const payload = {
      id: cust.id || undefined,
      name: cust.name.trim(), phone: cust.phone, email: cust.email, notes: cust.notes,
      address: { line1: cust.line1, city: cust.city, postcode: cust.postcode },
    }
    try {
      await api(cust.id ? "/customers/update" : "/customers", { method: "POST", body: payload })
      toast.success(cust.id ? "Customer updated" : "Customer created")
      setCustOpen(false)
      await loadCustomers()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") }
    finally { setCustBusy(false) }
  }
  async function deleteCustomer(c: Customer) {
    if (!(await confirmDialog({ title: `Delete ${c.name}?`, body: "This archives the customer and their history.", confirmText: "Delete", danger: true }))) return
    try { await api("/customers/delete", { method: "POST", body: { id: c.id } }); await loadCustomers(); toast.success("Customer deleted") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }

  // ----- team actions -----
  async function addMember() {
    if (!tName.trim() || !tEmail.trim()) { toast.error("Name and email required"); return }
    setTeamBusy(true)
    try {
      const r = await api<{ invite_token: string }>("/team", { method: "POST", body: { name: tName.trim(), email: tEmail.trim(), phone: tPhone.trim(), role: tRole } })
      setInvite(`${window.location.origin}${import.meta.env.BASE_URL}ego/invite/${r.invite_token}`)
      setTName(""); setTEmail(""); setTPhone("")
      await loadTeam()
      toast.success("Member added — share the invite link")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setTeamBusy(false) }
  }
  async function changeRole(m: Member, role: string) {
    try { await api("/team/update", { method: "POST", body: { id: m.id, role } }); await loadTeam() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  async function toggleActive(m: Member) {
    try { await api("/team/update", { method: "POST", body: { id: m.id, active: m.active ? 0 : 1 } }); await loadTeam() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  async function removeMember(m: Member) {
    if (!(await confirmDialog({ title: `Remove ${m.name}?`, body: "They'll lose access immediately.", confirmText: "Remove", danger: true }))) return
    try { await api("/team/delete", { method: "POST", body: { id: m.id } }); await loadTeam() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  // Founder can manage anyone but self; others manage strictly-lower ranks only.
  const canManageMember = (m: Member) => {
    if (!canManageTeam || myRole == null) return false
    if (myRole === "founder") return m.id !== user?.id
    return ROLE_RANK[m.role] < ROLE_RANK[myRole]
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Contact className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customers and your team — view and manage both here.</p>
        </div>
        <div className="ml-auto flex gap-2">
          {tab === "customers" ? (
            <Button onClick={openNewCustomer}><Plus /> New customer</Button>
          ) : canManageTeam ? (
            <Button onClick={() => { setInvite(null); setTeamOpen(true) }}><UserPlus className="size-4" /> Add member</Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="pl-9" />
        </div>
      </div>

      {/* ---------------- CUSTOMERS ---------------- */}
      {tab === "customers" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
                ) : custRows.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No customers match.</TableCell></TableRow>
                ) : custRows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} />
                        <Link to={`/ego/customers/detail?id=${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone ? <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a> : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email ? <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a> : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button asChild size="icon" variant="outline" className="size-8" disabled={!c.phone}>
                          <a href={c.phone ? `tel:${c.phone}` : undefined} aria-label="Call"><Phone className="size-4" /></a>
                        </Button>
                        <Button asChild size="icon" variant="outline" className="size-8" disabled={!c.email}>
                          <a href={c.email ? `mailto:${c.email}` : undefined} aria-label="Email"><Mail className="size-4" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" onClick={() => openEditCustomer(c.id)}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => deleteCustomer(c)}><Trash2 className="size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ---------------- TEAM ---------------- */}
      {tab === "team" && (
        <Card>
          <CardContent className="divide-y p-0">
            {loading ? (
              <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
            ) : teamRows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No team members match.</div>
            ) : teamRows.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">{initials(m.name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {m.name}
                    {!m.active && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">inactive</span>}
                    {m.pending ? <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-600">invite pending</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
                </div>

                {canManageMember(m) && assignable.length ? (
                  <Select value={m.role} onValueChange={(v) => changeRole(m, v)}>
                    <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", ROLE_TONE[m.role] ?? ROLE_TONE.engineer)}>
                    {m.role === "founder" && <ShieldCheck className="mr-1 inline size-3.5" />}{ROLE_LABEL[m.role] ?? m.role}
                  </span>
                )}

                <div className="flex gap-1.5">
                  <Button asChild size="icon" variant="outline" className="size-8" disabled={!m.phone}>
                    <a href={m.phone ? `tel:${m.phone}` : undefined} aria-label="Call"><Phone className="size-4" /></a>
                  </Button>
                  <Button asChild size="icon" variant="outline" className="size-8" disabled={!m.email}>
                    <a href={m.email ? `mailto:${m.email}` : undefined} aria-label="Email"><Mail className="size-4" /></a>
                  </Button>
                  {canManageMember(m) && (
                    <>
                      <Button size="icon" variant="ghost" className="size-8" title={m.active ? "Deactivate" : "Reactivate"} onClick={() => toggleActive(m)}>
                        <Power className={cn("size-4", m.active ? "text-emerald-600" : "text-muted-foreground")} />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" title="Remove" onClick={() => removeMember(m)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ---------------- Customer dialog ---------------- */}
      <Dialog open={custOpen} onOpenChange={setCustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{cust.id ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} placeholder="Customer name" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Phone</Label><Input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} placeholder="+44 …" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} placeholder="name@example.com" /></div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={cust.line1} onChange={(e) => setCust({ ...cust, line1: e.target.value })} placeholder="Street address" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>City</Label><Input value={cust.city} onChange={(e) => setCust({ ...cust, city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Postcode</Label><Input value={cust.postcode} onChange={(e) => setCust({ ...cust, postcode: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={cust.notes} onChange={(e) => setCust({ ...cust, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustOpen(false)}>Cancel</Button>
            <Button onClick={saveCustomer} disabled={custBusy}>{custBusy && <Loader2 className="size-4 animate-spin" />} {cust.id ? "Save changes" : "Create customer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Team add dialog ---------------- */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a team member</DialogTitle></DialogHeader>
          {invite ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Share this invite link so they can set a password:</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={invite} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 font-mono text-xs" />
                <Button size="icon" variant="outline" className="size-9 shrink-0" onClick={() => { navigator.clipboard.writeText(invite); toast.success("Copied") }}><Copy className="size-4" /></Button>
              </div>
              <DialogFooter><Button onClick={() => setTeamOpen(false)}>Done</Button></DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Name</Label><Input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Jane Doe" /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={tEmail} onChange={(e) => setTEmail(e.target.value)} placeholder="jane@egolimited.co.uk" /></div>
                <div className="space-y-1.5"><Label>Phone (optional)</Label><Input value={tPhone} onChange={(e) => setTPhone(e.target.value)} placeholder="+44 …" /></div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={tRole} onValueChange={setTRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTeamOpen(false)}>Cancel</Button>
                <Button onClick={addMember} disabled={teamBusy}>{teamBusy && <Loader2 className="size-4 animate-spin" />} Add member</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
