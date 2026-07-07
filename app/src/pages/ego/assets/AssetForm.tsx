import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Boxes, Trash2, Loader2, Wrench, Plus } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { confirmDialog } from "@/components/ego/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const NONE = "none"
const STATUSES = ["ok", "due", "fault", "retired"] as const

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  asset_tag: z.string().optional(),
  customer_id: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  status: z.enum(STATUSES),
  install_date: z.string().optional(),
  next_service_date: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<typeof schema>

interface Opt { id: number; name: string }
interface Service {
  id: number
  service_date: string
  outcome: "ok" | "repaired" | "fault"
  notes: string | null
  next_due: string | null
  engineer: string | null
}

const OUTCOME_VARIANT: Record<Service["outcome"], "default" | "secondary" | "destructive"> = {
  ok: "default", repaired: "secondary", fault: "destructive",
}

export default function AssetForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Opt[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [svc, setSvc] = useState({ service_date: "", outcome: "ok", notes: "", next_due: "" })
  const [savingSvc, setSavingSvc] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", asset_tag: "", customer_id: NONE, location: "", type: "", make: "", model: "",
      serial: "", status: "ok", install_date: "", next_service_date: "", notes: "",
    },
  })

  const loadAsset = useCallback(() => {
    if (!id) return Promise.resolve()
    return api<{ asset: Record<string, unknown> & { services: Service[] } }>(`/assets/get?id=${id}`)
      .then(({ asset: a }) => {
        setServices(a.services ?? [])
        form.reset({
          name: (a.name as string) ?? "",
          asset_tag: (a.asset_tag as string) ?? "",
          customer_id: a.customer_id != null ? String(a.customer_id) : NONE,
          location: (a.location as string) ?? "",
          type: (a.type as string) ?? "",
          make: (a.make as string) ?? "",
          model: (a.model as string) ?? "",
          serial: (a.serial as string) ?? "",
          status: (STATUSES.includes(a.status as Values["status"]) ? a.status : "ok") as Values["status"],
          install_date: (a.install_date as string) ?? "",
          next_service_date: (a.next_service_date as string) ?? "",
          notes: (a.notes as string) ?? "",
        })
      })
      .catch(() => toast.error("Asset not found"))
  }, [id, form])

  useEffect(() => {
    Promise.all([
      api<{ customers: Opt[] }>("/customers").then((r) => setCustomers(r.customers)).catch(() => {}),
      loadAsset(),
    ]).finally(() => setLoading(false))
  }, [loadAsset])

  async function onSubmit(v: Values) {
    const payload = { ...v, id: id ? Number(id) : undefined, customer_id: v.customer_id && v.customer_id !== NONE ? Number(v.customer_id) : "" }
    try {
      if (editing) {
        await api("/assets/update", { method: "POST", body: payload })
        toast.success("Asset saved")
      } else {
        await api<{ id: number }>("/assets", { method: "POST", body: payload })
        toast.success("Asset created")
      }
      navigate("/ego/assets")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function onDelete() {
    if (!id || !(await confirmDialog({ title: "Delete this asset? (soft-delete — recoverable)", danger: true, confirmText: "Delete" }))) return
    try {
      await api("/assets/delete", { method: "POST", body: { id: Number(id) } })
      toast.success("Asset deleted")
      navigate("/ego/assets")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
    }
  }

  async function logService() {
    if (!id) return
    setSavingSvc(true)
    try {
      await api("/assets/service", { method: "POST", body: { asset_id: Number(id), ...svc } })
      toast.success("Service logged")
      setSvc({ service_date: "", outcome: "ok", notes: "", next_due: "" })
      await loadAsset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log service")
    } finally {
      setSavingSvc(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/ego/assets"><ArrowLeft /> Assets</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {editing ? "Edit asset" : "New asset"}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl><Input placeholder="e.g. Worcester boiler" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="asset_tag" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset tag</FormLabel>
                        <FormControl><Input placeholder="EGO-A-001" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="customer_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer / site</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>Unassigned</SelectItem>
                            {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl><Input placeholder="e.g. Plant room, 2nd floor" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="Boiler" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="make" render={({ field }) => (
                      <FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="serial" render={({ field }) => (
                      <FormItem><FormLabel>Serial</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="install_date" render={({ field }) => (
                      <FormItem><FormLabel>Install date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="next_service_date" render={({ field }) => (
                      <FormItem><FormLabel>Next service</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Textarea rows={3} {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <div>
                      {editing && (
                        <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}>
                          <Trash2 /> Delete
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" asChild><Link to="/ego/assets">Cancel</Link></Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                        {editing ? "Save changes" : "Create asset"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="size-4" /> Service history</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!editing ? (
                <p className="text-sm text-muted-foreground">Save the asset first to log services.</p>
              ) : (
                <>
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={svc.service_date}
                        onChange={(e) => setSvc({ ...svc, service_date: e.target.value })} />
                      <Select value={svc.outcome} onValueChange={(v) => setSvc({ ...svc, outcome: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ok">OK</SelectItem>
                          <SelectItem value="repaired">Repaired</SelectItem>
                          <SelectItem value="fault">Fault</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input placeholder="Notes" value={svc.notes} onChange={(e) => setSvc({ ...svc, notes: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <Input type="date" value={svc.next_due} title="Next due"
                        onChange={(e) => setSvc({ ...svc, next_due: e.target.value })} />
                      <Button type="button" size="sm" onClick={logService} disabled={savingSvc}>
                        {savingSvc ? <Loader2 className="animate-spin" /> : <Plus />} Log
                      </Button>
                    </div>
                  </div>

                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services logged yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {services.map((s) => (
                        <li key={s.id} className="border-b pb-3 text-sm last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium tabular-nums">{s.service_date}</span>
                            <Badge variant={OUTCOME_VARIANT[s.outcome]} className="capitalize">{s.outcome}</Badge>
                          </div>
                          {s.notes && <p className="mt-1 text-muted-foreground">{s.notes}</p>}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {s.engineer ? `${s.engineer} · ` : ""}{s.next_due ? `next due ${s.next_due}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
