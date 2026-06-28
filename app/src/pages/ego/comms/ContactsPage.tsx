import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Contact, Loader2, Mail, Phone, Search } from "lucide-react"

import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface Customer { id: number; name: string; phone: string | null; email: string | null; ref_code: string | null }
interface Eng { id: number; name: string; phone: string | null; email: string | null }

type Tab = "customers" | "team"

const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(name)}
    </span>
  )
}

function Actions({ phone, email }: { phone: string | null; email: string | null }) {
  return (
    <div className="flex justify-end gap-1.5">
      <Button asChild size="icon" variant="outline" className="size-8" disabled={!phone}>
        <a href={phone ? `tel:${phone}` : undefined} aria-label="Call"><Phone className="size-4" /></a>
      </Button>
      <Button asChild size="icon" variant="outline" className="size-8" disabled={!email}>
        <a href={email ? `mailto:${email}` : undefined} aria-label="Email"><Mail className="size-4" /></a>
      </Button>
    </div>
  )
}

export default function ContactsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [team, setTeam] = useState<Eng[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("customers")
  const [q, setQ] = useState("")

  useEffect(() => {
    Promise.all([
      api<{ customers: Customer[] }>("/customers"),
      api<{ engineers: Eng[] }>("/engineers"),
    ])
      .then(([c, e]) => { setCustomers(c.customers); setTeam(e.engineers) })
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const src: (Customer | Eng)[] = tab === "customers" ? customers : team
    if (!s) return src
    return src.filter((r) => [r.name, r.phone ?? "", r.email ?? ""].join(" ").toLowerCase().includes(s))
  }, [tab, q, customers, team])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Contact className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone you call or email — customers and your team.</p>
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Reach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No contacts match.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={`${tab}-${r.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} />
                      {tab === "customers" ? (
                        <Link to={`/ego/customers/detail?id=${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                      ) : (
                        <span className="font-medium">{r.name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.phone ? <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a> : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.email ? <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a> : "—"}
                  </TableCell>
                  <TableCell><Actions phone={r.phone} email={r.email} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
