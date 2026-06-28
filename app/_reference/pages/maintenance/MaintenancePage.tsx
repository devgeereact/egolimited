import { useEffect, useState } from "react"
import { Repeat, Plus, Trash2, Play, Loader2, CalendarClock } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Plan {
  id: number; customer_id: number; customer_name: string; title: string
  priority: string; interval_unit: string; interval_count: number; next_due: string; is_due: number
}

const today = () => new Date().toISOString().slice(0, 10)

export default function MaintenancePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ customer_id: "", title: "", description: "", priority: "normal", quoted_amount: "", interval_count: "12", interval_unit: "month", next_due: today() })

  function load() { return api<{ plans: Plan[] }>("/recurring").then((r) => setPlans(r.plans)) }
  useEffect(() => {
    Promise.all([load(), api<{ customers: { id: number; name: string }[] }>("/customers").then((r) => setCustomers(r.customers))]).finally(() => setLoading(false))
  }, [])

  async function create() {
    if (!form.customer_id || !form.title) { toast.error("Customer + title required"); return }
    try {
      await api("/recurring", { method: "POST", body: { ...form, customer_id: Number(form.customer_id), interval_count: Number(form.interval_count) } })
      toast.success("Plan created")
      setForm((f) => ({ ...f, title: "", description: "", quoted_amount: "" }))
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  async function generate() {
    setGenerating(true)
    try {
      const r = await api<{ count: number; created: string[] }>("/recurring/generate", { method: "POST" })
      toast.success(r.count ? `Created ${r.count} job${r.count > 1 ? "s" : ""}: ${r.created.join(", ")}` : "Nothing due")
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setGenerating(false) }
  }
  async function del(id: number) {
    if (!confirm("Remove this recurring plan?")) return
    await api("/recurring/delete", { method: "POST", body: { id } })
    toast.success("Removed"); load()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Repeat className="size-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Recurring & Maintenance</h1>
            <p className="mt-1 text-sm text-muted-foreground">Repeat jobs (e.g. annual CP12) auto-create when due.</p>
          </div>
        </div>
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="animate-spin" /> : <Play />} Generate due now
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create plan */}
        <Card>
          <CardHeader><CardTitle>New recurring plan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm((f) => ({ ...f, customer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pick a customer…" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual gas safety check (CP12)" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Every</Label>
                <div className="flex gap-2">
                  <Input type="number" min={1} value={form.interval_count} onChange={(e) => setForm((f) => ({ ...f, interval_count: e.target.value }))} className="w-20" />
                  <Select value={form.interval_unit} onValueChange={(v) => setForm((f) => ({ ...f, interval_unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="day">days</SelectItem><SelectItem value="week">weeks</SelectItem><SelectItem value="month">months</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>First due</Label><Input type="date" value={form.next_due} onChange={(e) => setForm((f) => ({ ...f, next_due: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Quote (£)</Label><Input type="number" step="0.01" value={form.quoted_amount} onChange={(e) => setForm((f) => ({ ...f, quoted_amount: e.target.value }))} placeholder="0.00" /></div>
            </div>
            <div className="flex justify-end"><Button onClick={create}><Plus /> Add plan</Button></div>
          </CardContent>
        </Card>

        {/* Plans list */}
        <Card>
          <CardHeader><CardTitle>Active plans ({plans.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
              : plans.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No recurring plans yet.</p>
              : plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.customer_name} · every {p.interval_count} {p.interval_unit}{p.interval_count > 1 ? "s" : ""}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs">
                      <CalendarClock className="size-3" /> Next: {p.next_due}
                      {p.is_due ? <span className="ml-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600">due</span> : null}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => del(p.id)}><Trash2 className="size-4" /></Button>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
