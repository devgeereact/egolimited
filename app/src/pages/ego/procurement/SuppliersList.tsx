import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Truck, Plus, Search, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface SupplierRow {
  id: number
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  account_ref: string | null
  category: string | null
  active: number
}

export default function SuppliersList() {
  const [rows, setRows] = useState<SupplierRow[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      api<{ suppliers: SupplierRow[] }>(`/suppliers?q=${encodeURIComponent(q)}`)
        .then((r) => setRows(r.suppliers))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Suppliers</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} suppliers</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/suppliers/new"><Plus /> New supplier</Link>
        </Button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search suppliers…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Account ref</TableHead>
                <TableHead className="text-right">Status</TableHead>
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
                    No suppliers yet. <Link to="/ego/suppliers/new" className="text-primary hover:underline">Add one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to={`/ego/suppliers/edit?id=${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.category || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.contact || r.phone || r.email || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{r.account_ref || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.active ? "default" : "secondary"}>
                        {r.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
