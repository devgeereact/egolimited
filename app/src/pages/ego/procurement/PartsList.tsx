import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Package, Plus, Search, Loader2, AlertTriangle } from "lucide-react"
import { useApi } from "@/lib/query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface PartRow {
  id: number
  sku: string | null
  name: string
  category: string | null
  unit: string
  cost_price: number
  sale_price: number
  stock_qty: number
  reorder_level: number
  active: number
  supplier_id: number | null
  supplier_name: string | null
}

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

const isLow = (p: PartRow) => p.reorder_level > 0 && p.stock_qty <= p.reorder_level

export default function PartsList() {
  const [q, setQ] = useState("")
  const [lowOnly, setLowOnly] = useState(false)
  const [query, setQuery] = useState({ q: "", lowOnly: false })

  useEffect(() => {
    const t = setTimeout(() => setQuery({ q, lowOnly }), 250)
    return () => clearTimeout(t)
  }, [q, lowOnly])

  const { data, isPending } = useApi<{ parts: PartRow[] }>(
    `/parts?q=${encodeURIComponent(query.q)}${query.lowOnly ? "&low=1" : ""}`
  )
  const rows = useMemo(() => data?.parts ?? [], [data])
  const loading = isPending

  const pager = usePager(rows)
  useEffect(() => { pager.setPage(1) }, [q, lowOnly])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Parts &amp; pricebook</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} parts</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/parts/new"><Plus /> New part</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, category…" className="pl-9" />
        </div>
        <Button variant={lowOnly ? "default" : "outline"} size="sm" onClick={() => setLowOnly((v) => !v)}>
          <AlertTriangle /> Low stock only
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Sale</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No parts yet. <Link to="/ego/parts/new" className="text-primary hover:underline">Add one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                pager.slice.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/ego/parts/edit?id=${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      <div className="text-xs text-muted-foreground">
                        {p.sku ? `${p.sku} · ` : ""}{p.category || "Uncategorised"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.supplier_name || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{gbp(p.cost_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{gbp(p.sale_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {isLow(p) ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />{p.stock_qty} {p.unit}
                        </Badge>
                      ) : (
                        <span>{p.stock_qty} {p.unit}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="parts" />
        </CardContent>
      </Card>
    </div>
  )
}
