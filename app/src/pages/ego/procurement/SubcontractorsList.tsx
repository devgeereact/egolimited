import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { HardHat, Plus, Search, Loader2, AlertTriangle } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface SubRow {
  id: number
  name: string
  company: string | null
  trades: string | null
  coverage_areas: string | null
  phone: string | null
  email: string | null
  insurance_expiry: string | null
  day_rate: number | null
  rating: number | null
  status: "active" | "pending" | "suspended"
}

const STATUS_VARIANT: Record<SubRow["status"], "default" | "secondary" | "destructive"> = {
  active: "default",
  pending: "secondary",
  suspended: "destructive",
}

const gbp = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n)

function insuranceLapsed(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}

export default function SubcontractorsList() {
  const [rows, setRows] = useState<SubRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      api<{ subcontractors: SubRow[] }>(`/subcontractors?q=${encodeURIComponent(q)}`)
        .then((r) => setRows(r.subcontractors))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const pager = usePager(rows)
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HardHat className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Subcontractors</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} subcontractors</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/subcontractors/new"><Plus /> New subcontractor</Link>
        </Button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, trade, area…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trades</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead className="text-right">Day rate</TableHead>
                <TableHead className="text-right">Status</TableHead>
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
                    No subcontractors yet. <Link to="/ego/subcontractors/new" className="text-primary hover:underline">Add one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                pager.slice.map((r) => {
                  const lapsed = insuranceLapsed(r.insurance_expiry)
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link to={`/ego/subcontractors/edit?id=${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                        {r.company && <div className="text-xs text-muted-foreground">{r.company}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.trades || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.coverage_areas || "—"}</TableCell>
                      <TableCell>
                        {r.insurance_expiry ? (
                          <span className={lapsed ? "inline-flex items-center gap-1 text-destructive" : "text-muted-foreground"}>
                            {lapsed && <AlertTriangle className="size-3.5" />}
                            {r.insurance_expiry}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{gbp(r.day_rate)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="subcontractors" />
        </CardContent>
      </Card>
    </div>
  )
}
