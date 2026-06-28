import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Briefcase, Plus, Search, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import { PRIORITY_CLASS, PRIORITY_LABEL, gbp, type JobPriority } from "@/lib/mock/jobs"

interface JobRow {
  id: number
  reference: string
  title: string
  priority: JobPriority
  status: EgoStatus
  quoted_amount: string | null
  scheduled_start: string | null
  customer_name: string
  engineer_name: string | null
}

const FILTERS: { value: string; label: string; match: EgoStatus[] }[] = [
  { value: "all", label: "All", match: [] },
  { value: "open", label: "Open", match: ["new", "scheduled", "en_route", "on_site", "on_hold"] },
  { value: "completed", label: "Completed", match: ["completed"] },
  { value: "invoiced", label: "Invoiced", match: ["invoiced"] },
  { value: "paid", label: "Paid", match: ["paid", "closed"] },
  { value: "cancelled", label: "Cancelled", match: ["cancelled"] },
]

export default function JobsList() {
  const [all, setAll] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")

  useEffect(() => {
    api<{ jobs: JobRow[] }>("/jobs").then((r) => setAll(r.jobs)).finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.value === tab)!
    const s = q.trim().toLowerCase()
    return all.filter((j) => {
      const byStatus = f.match.length === 0 || f.match.includes(j.status)
      const byText = !s || [j.reference, j.title, j.customer_name, j.engineer_name ?? ""].join(" ").toLowerCase().includes(s)
      return byStatus && byText
    })
  }, [all, tab, q])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Jobs</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} of {all.length} jobs</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/jobs/new"><Plus /> New job</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, title, customer…" className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engineer</TableHead>
                <TableHead className="text-right">Quote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No jobs match. <Link to="/ego/jobs/new" className="text-primary hover:underline">Create a job</Link>.
                  </TableCell>
                </TableRow>
              ) : rows.map((j) => (
                <TableRow key={j.id} className="cursor-pointer">
                  <TableCell className="font-mono font-medium">
                    <Link to={`/ego/jobs/detail?id=${j.id}`} className="hover:underline">{j.reference}</Link>
                  </TableCell>
                  <TableCell className="max-w-[22ch] truncate">{j.title}</TableCell>
                  <TableCell>{j.customer_name}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", PRIORITY_CLASS[j.priority])}>
                      {PRIORITY_LABEL[j.priority]}
                    </span>
                  </TableCell>
                  <TableCell><StatusPill status={j.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{j.engineer_name ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{j.quoted_amount ? gbp(Number(j.quoted_amount)) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
