import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Boxes, Plus, Search, Loader2, CalendarClock } from "lucide-react"
import { useApi } from "@/lib/query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface AssetRow {
  id: number
  name: string
  asset_tag: string | null
  type: string | null
  location: string | null
  status: "ok" | "due" | "fault" | "retired"
  next_service_date: string | null
  customer_id: number | null
  customer_name: string | null
}

const STATUS_VARIANT: Record<AssetRow["status"], "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  due: "secondary",
  fault: "destructive",
  retired: "outline",
}

function dueSoon(date: string | null): boolean {
  if (!date) return false
  return new Date(date) <= new Date(new Date().toDateString())
}

export default function AssetsList() {
  const [q, setQ] = useState("")
  const [dueOnly, setDueOnly] = useState(false)
  const [query, setQuery] = useState({ q: "", dueOnly: false })

  useEffect(() => {
    const t = setTimeout(() => setQuery({ q, dueOnly }), 250)
    return () => clearTimeout(t)
  }, [q, dueOnly])

  const { data, isPending } = useApi<{ assets: AssetRow[] }>(
    `/assets?q=${encodeURIComponent(query.q)}${query.dueOnly ? "&due=1" : ""}`
  )
  const rows = useMemo(() => data?.assets ?? [], [data])
  const loading = isPending

  const pager = usePager(rows)
  const setPagerPage = pager.setPage // useState setter: stable identity, so listing it never re-runs the effect
  useEffect(() => { setPagerPage(1) }, [q, dueOnly, setPagerPage])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Assets</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} assets</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/assets/new"><Plus /> New asset</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, tag, serial, location…" className="pl-9" />
        </div>
        <Button variant={dueOnly ? "default" : "outline"} size="sm" onClick={() => setDueOnly((v) => !v)}>
          <CalendarClock /> Service due
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Next service</TableHead>
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
                    No assets yet. <Link to="/ego/assets/new" className="text-primary hover:underline">Add one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                pager.slice.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link to={`/ego/assets/edit?id=${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                      <div className="text-xs text-muted-foreground">
                        {a.asset_tag ? `${a.asset_tag} · ` : ""}{a.type || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.customer_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.location || "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {a.next_service_date ? (
                        <span className={dueSoon(a.next_service_date) ? "text-destructive" : "text-muted-foreground"}>
                          {a.next_service_date}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={STATUS_VARIANT[a.status]} className="capitalize">{a.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="assets" />
        </CardContent>
      </Card>
    </div>
  )
}
