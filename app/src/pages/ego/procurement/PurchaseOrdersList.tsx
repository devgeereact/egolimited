import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, Plus, Search, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface PORow {
  id: number
  reference: string | null
  status: "draft" | "ordered" | "received" | "cancelled"
  order_date: string | null
  expected_date: string | null
  received_date: string | null
  total: number
  supplier_id: number
  supplier_name: string
}

const STATUS_VARIANT: Record<PORow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  ordered: "default",
  received: "outline",
  cancelled: "destructive",
}

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

export default function PurchaseOrdersList() {
  const [rows, setRows] = useState<PORow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      api<{ purchase_orders: PORow[] }>(`/purchase-orders?q=${encodeURIComponent(q)}`)
        .then((r) => setRows(r.purchase_orders))
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
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Purchase orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} orders</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/purchase-orders/new"><Plus /> New PO</Link>
        </Button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref or supplier…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
                    No purchase orders yet. <Link to="/ego/purchase-orders/new" className="text-primary hover:underline">Raise one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                pager.slice.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link to={`/ego/purchase-orders/edit?id=${po.id}`} className="font-medium tabular-nums hover:underline">
                        {po.reference || `#${po.id}`}
                      </Link>
                    </TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{po.order_date || "—"}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{po.expected_date || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{gbp(po.total)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={STATUS_VARIANT[po.status]} className="capitalize">{po.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="orders" />
        </CardContent>
      </Card>
    </div>
  )
}
