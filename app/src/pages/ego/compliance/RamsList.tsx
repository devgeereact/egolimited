import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { FileCheck2, Plus, Search, Loader2, AlertTriangle } from "lucide-react"
import { useApi } from "@/lib/query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { usePager, Pager } from "@/components/ego/Pager"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Row { id: number; title: string; trade: string | null; reference: string | null; review_date: string | null }
const overdue = (d: string | null) => !!d && new Date(d) < new Date(new Date().toDateString())

export default function RamsList() {
  const [q, setQ] = useState("")
  const [qDebounced, setQDebounced] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250)
    return () => clearTimeout(t)
  }, [q])
  const { data, isPending } = useApi<{ rams: Row[] }>(`/rams?q=${encodeURIComponent(qDebounced)}`)
  const rows = useMemo(() => data?.rams ?? [], [data])
  const loading = isPending
  const pager = usePager(rows)
  const setPagerPage = pager.setPage // useState setter: stable identity, so listing it never re-runs the effect
  useEffect(() => { setPagerPage(1) }, [q, setPagerPage])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileCheck2 className="size-5" /></div>
          <div><h1 className="text-2xl font-semibold leading-none tracking-tight">RAMS</h1><p className="mt-1 text-sm text-muted-foreground">{rows.length} documents</p></div>
        </div>
        <Button asChild><Link to="/ego/rams/new"><Plus /> New RAMS</Link></Button>
      </div>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, trade, ref…" className="pl-9" />
      </div>
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Trade</TableHead><TableHead>Reference</TableHead><TableHead>Review due</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
          : rows.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No RAMS yet. <Link to="/ego/rams/new" className="text-primary hover:underline">Create one</Link>.</TableCell></TableRow>
          : pager.slice.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link to={`/ego/rams/edit?id=${r.id}`} className="font-medium hover:underline">{r.title}</Link></TableCell>
              <TableCell className="text-muted-foreground">{r.trade || "—"}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{r.reference || "—"}</TableCell>
              <TableCell className="tabular-nums">{r.review_date ? <span className={overdue(r.review_date) ? "inline-flex items-center gap-1 text-destructive" : "text-muted-foreground"}>{overdue(r.review_date) && <AlertTriangle className="size-3.5" />}{r.review_date}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table><Pager page={pager.page} pages={pager.pages} total={pager.total} onPage={pager.setPage} noun="documents" /></CardContent></Card>
    </div>
  )
}
