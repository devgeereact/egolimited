import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ShieldAlert, Plus, Search, Loader2 } from "lucide-react"
import { useApi } from "@/lib/query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Row {
  id: number; incident_date: string | null; type: string; severity: "low" | "medium" | "high" | "riddor"
  location: string | null; person: string | null; status: "open" | "investigating" | "closed"
}
type Variant = "default" | "secondary" | "destructive" | "outline"
const SEV: Record<Row["severity"], Variant> = { low: "secondary", medium: "default", high: "destructive", riddor: "destructive" }
const ST: Record<Row["status"], Variant> = { open: "destructive", investigating: "default", closed: "outline" }

export default function IncidentsList() {
  const [q, setQ] = useState("")
  const [qDebounced, setQDebounced] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250)
    return () => clearTimeout(t)
  }, [q])
  const { data, isPending } = useApi<{ incidents: Row[] }>(`/incidents?q=${encodeURIComponent(qDebounced)}`)
  const rows = useMemo(() => data?.incidents ?? [], [data])
  const loading = isPending
  const pager = usePager(rows)
  useEffect(() => { pager.setPage(1) }, [q])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldAlert className="size-5" /></div>
          <div><h1 className="text-2xl font-semibold leading-none tracking-tight">Incidents</h1><p className="mt-1 text-sm text-muted-foreground">{rows.length} reports</p></div>
        </div>
        <Button asChild><Link to="/ego/incidents/new"><Plus /> Report incident</Link></Button>
      </div>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search location, person…" className="pl-9" />
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead>Severity</TableHead><TableHead className="text-right">Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
          : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No incidents logged. <Link to="/ego/incidents/new" className="text-primary hover:underline">Report one</Link>.</TableCell></TableRow>
          : pager.slice.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="tabular-nums"><Link to={`/ego/incidents/edit?id=${r.id}`} className="font-medium hover:underline">{r.incident_date || "—"}</Link></TableCell>
              <TableCell className="capitalize text-muted-foreground">{r.type.replace("_", " ")}</TableCell>
              <TableCell className="text-muted-foreground">{r.location || "—"}</TableCell>
              <TableCell><Badge variant={SEV[r.severity]} className="uppercase">{r.severity}</Badge></TableCell>
              <TableCell className="text-right"><Badge variant={ST[r.status]} className="capitalize">{r.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table><Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="reports" /></CardContent></Card>
    </div>
  )
}
