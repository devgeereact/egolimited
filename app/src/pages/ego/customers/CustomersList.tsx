import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Users, Plus, Search, Loader2, Phone, Mail, Briefcase } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { gbp } from "@/lib/mock/jobs"

interface CustomerRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  job_count: number
  last_job: string | null
  balance: number
}

export default function CustomersList() {
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [capped, setCapped] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      api<{ customers: CustomerRow[]; capped?: boolean }>(`/customers?q=${encodeURIComponent(q)}`)
        .then((r) => { setRows(r.customers); setCapped(!!r.capped) })
        .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load customers"))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const pager = usePager(rows)
  // Reset to page 1 when the search changes so filtering never leaves us on an
  // empty page.
  useEffect(() => { pager.setPage(1) }, [q])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} customers</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/customers/new">
            <Plus /> New customer
          </Link>
        </Button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Last job</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Quick actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No customers yet.{" "}
                    <Link to="/ego/customers/new" className="text-primary hover:underline">Add one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                pager.slice.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link to={`/ego/customers/detail?id=${c.id}`} className="hover:underline">{c.name}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone || c.email || "—"}
                    </TableCell>
                    <TableCell>{c.job_count}</TableCell>
                    <TableCell className="text-muted-foreground">{c.last_job?.slice(0, 10) ?? "—"}</TableCell>
                    <TableCell className={cn("text-right font-mono", c.balance > 0 && "font-medium text-red-600 dark:text-red-400")}>{gbp(c.balance)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" className="size-8" title="Call" disabled={!c.phone}>
                          <a href={c.phone ? `tel:${c.phone}` : undefined}><Phone className="size-4" /></a>
                        </Button>
                        <Button asChild size="icon" variant="ghost" className="size-8" title="Email" disabled={!c.email}>
                          <a href={c.email ? `mailto:${c.email}` : undefined}><Mail className="size-4" /></a>
                        </Button>
                        <Button asChild size="icon" variant="ghost" className="size-8" title="New job">
                          <Link to={`/ego/jobs/new?customer=${c.id}`}><Briefcase className="size-4" /></Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {capped && <p className="mb-2 text-xs text-muted-foreground">Showing the first 500 customers — search to narrow the list.</p>}
          <Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="customers" />
        </CardContent>
      </Card>
    </div>
  )
}
