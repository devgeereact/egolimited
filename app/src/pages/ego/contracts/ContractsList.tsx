import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FileSignature, Plus, Search, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface CtRow {
  id: number
  reference: string | null
  title: string
  status: "active" | "pending" | "expired" | "cancelled"
  value: number
  renewal_date: string | null
  next_service: string | null
  next_bill_date: string | null
  customer_id: number | null
  customer_name: string | null
}

const STATUS_VARIANT: Record<CtRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", pending: "secondary", expired: "outline", cancelled: "destructive",
}
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n)

export default function ContractsList() {
  const [rows, setRows] = useState<CtRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      api<{ contracts: CtRow[] }>(`/contracts?q=${encodeURIComponent(q)}`)
        .then((r) => setRows(r.contracts))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const pager = usePager(rows)
  useEffect(() => { pager.setPage(1) }, [q])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSignature className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Contracts &amp; PPM</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} contracts</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/contracts/new"><Plus /> New contract</Link>
        </Button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, title, customer…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Next PPM</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No contracts yet. <Link to="/ego/contracts/new" className="text-primary hover:underline">Create one</Link>.</TableCell></TableRow>
              ) : (
                pager.slice.map((ct) => (
                  <TableRow key={ct.id}>
                    <TableCell><Link to={`/ego/contracts/edit?id=${ct.id}`} className="font-medium tabular-nums hover:underline">{ct.reference || `#${ct.id}`}</Link></TableCell>
                    <TableCell>{ct.title}</TableCell>
                    <TableCell className="text-muted-foreground">{ct.customer_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{ct.next_service || "—"}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{ct.renewal_date || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{gbp(ct.value)}</TableCell>
                    <TableCell className="text-right"><Badge variant={STATUS_VARIANT[ct.status]} className="capitalize">{ct.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="contracts" />
        </CardContent>
      </Card>
    </div>
  )
}
