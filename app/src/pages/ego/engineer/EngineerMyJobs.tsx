import { useMemo } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Loader2, ListChecks } from "lucide-react"

import { useApi } from "@/lib/query"
import { Card } from "@/components/ui/card"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"

interface MyJob {
  id: number
  reference: string
  title: string
  status: EgoStatus
  scheduled_start: string | null
  customer_name: string
  line1: string | null
  city: string | null
  postcode: string | null
}

function dayLabel(d: string | null) {
  if (!d) return "Unscheduled"
  return new Date(d.replace(" ", "T")).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })
}

export default function EngineerMyJobs() {
  const { data, isPending } = useApi<{ jobs: MyJob[] }>("/me/jobs")
  const jobs = useMemo(() => data?.jobs ?? [], [data])
  const loading = isPending

  const groups = useMemo(() => {
    const map = new Map<string, MyJob[]>()
    for (const j of jobs) {
      const key = j.scheduled_start ? j.scheduled_start.slice(0, 10) : "z-unscheduled"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(j)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [jobs])

  return (
    <div className="flex flex-col gap-5 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">My jobs</h1>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <ListChecks className="size-8 text-muted-foreground" />
          <p className="font-medium">No assigned jobs</p>
          <p className="text-sm text-muted-foreground">When the office assigns you work, it shows here.</p>
        </Card>
      ) : (
        groups.map(([key, list]) => (
          <div key={key} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {dayLabel(list[0].scheduled_start)}
            </p>
            <div className="grid gap-2 md:grid-cols-2">
            {list.map((j) => {
              const addr = [j.line1, j.city, j.postcode].filter(Boolean).join(", ")
              return (
                <Card key={j.id} className="p-0">
                  <Link to={`/ego/engineer/job?id=${j.id}`} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{j.reference}</span>
                        <StatusPill status={j.status} />
                      </div>
                      <p className="mt-0.5 truncate font-medium">{j.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{j.customer_name}{addr ? ` · ${addr}` : ""}</p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </Link>
                </Card>
              )
            })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
