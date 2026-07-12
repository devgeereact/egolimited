import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BadgeCheck, Plus, Search, Loader2 } from "lucide-react"
import { useApi } from "@/lib/query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Row {
  id: number; title: string; holder: string | null; type: string | null; reference: string | null
  issued_date: string | null; expiry_date: string | null; engineer: string | null; status: "valid" | "expiring" | "expired"
}
const ST: Record<Row["status"], "default" | "secondary" | "destructive"> = { valid: "default", expiring: "secondary", expired: "destructive" }

export default function CertificatesList() {
  const [q, setQ] = useState("")
  const [qDebounced, setQDebounced] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250)
    return () => clearTimeout(t)
  }, [q])
  const { data, isPending } = useApi<{ certificates: Row[] }>(`/certificates?q=${encodeURIComponent(qDebounced)}`)
  const rows = useMemo(() => data?.certificates ?? [], [data])
  const loading = isPending
  const pager = usePager(rows)
  useEffect(() => { pager.setPage(1) }, [q])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><BadgeCheck className="size-5" /></div>
          <div><h1 className="text-2xl font-semibold leading-none tracking-tight">Certificates</h1><p className="mt-1 text-sm text-muted-foreground">{rows.length} certificates</p></div>
        </div>
        <Button asChild><Link to="/ego/certificates/new"><Plus /> New certificate</Link></Button>
      </div>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, holder, type…" className="pl-9" />
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Certificate</TableHead><TableHead>Holder</TableHead><TableHead>Type</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
          : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No certificates yet. <Link to="/ego/certificates/new" className="text-primary hover:underline">Add one</Link>.</TableCell></TableRow>
          : pager.slice.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link to={`/ego/certificates/edit?id=${r.id}`} className="font-medium hover:underline">{r.title}</Link>{r.reference && <div className="text-xs text-muted-foreground tabular-nums">{r.reference}</div>}</TableCell>
              <TableCell className="text-muted-foreground">{r.holder || r.engineer || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{r.type || "—"}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{r.expiry_date || "—"}</TableCell>
              <TableCell className="text-right"><Badge variant={ST[r.status]} className="capitalize">{r.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table><Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="certificates" /></CardContent></Card>
    </div>
  )
}
