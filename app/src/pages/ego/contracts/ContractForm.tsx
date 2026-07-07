import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, FileSignature, Trash2, Loader2, Plus, ReceiptText, CalendarCheck } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { confirmDialog } from "@/components/ego/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const NONE = "none"
const STATUSES = ["active", "pending", "expired", "cancelled"] as const

const allocSchema = z.object({
  kind: z.enum(["employee", "subcontractor"]),
  person_name: z.string().min(1, "Required"),
  role: z.string().optional(),
  hours_per_week: z.string().optional(),
  rate: z.string().optional(),
  notes: z.string().optional(),
})
const schema = z.object({
  customer_id: z.string().optional(),
  title: z.string().min(2, "Title is required"),
  value: z.string().optional(),
  status: z.enum(STATUSES),
  start_date: z.string().optional(),
  renewal_date: z.string().optional(),
  sla_response_hours: z.string().optional(),
  sla_fix_hours: z.string().optional(),
  ppm_every_days: z.string().optional(),
  next_service: z.string().optional(),
  bill_every_days: z.string().optional(),
  next_bill_date: z.string().optional(),
  bill_amount: z.string().optional(),
  notes: z.string().optional(),
  allocations: z.array(allocSchema),
})
type Values = z.infer<typeof schema>
interface Opt { id: number; name: string }

export default function ContractForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Opt[]>([])
  const [reference, setReference] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: NONE, title: "", value: "0", status: "active", start_date: "", renewal_date: "",
      sla_response_hours: "", sla_fix_hours: "", ppm_every_days: "", next_service: "",
      bill_every_days: "", next_bill_date: "", bill_amount: "", notes: "", allocations: [],
    },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "allocations" })

  useEffect(() => {
    const loads: Promise<unknown>[] = [
      api<{ customers: Opt[] }>("/customers").then((r) => setCustomers(r.customers)).catch(() => {}),
    ]
    if (id) {
      loads.push(api<{ contract: Record<string, unknown> & { allocations: Array<Record<string, unknown>> } }>(`/contracts/get?id=${id}`)
        .then(({ contract: ct }) => {
          setReference((ct.reference as string) ?? null)
          const s = (k: string) => (ct[k] != null ? String(ct[k]) : "")
          form.reset({
            customer_id: ct.customer_id != null ? String(ct.customer_id) : NONE,
            title: (ct.title as string) ?? "",
            value: s("value") || "0",
            status: (STATUSES.includes(ct.status as Values["status"]) ? ct.status : "active") as Values["status"],
            start_date: (ct.start_date as string) ?? "", renewal_date: (ct.renewal_date as string) ?? "",
            sla_response_hours: s("sla_response_hours"), sla_fix_hours: s("sla_fix_hours"),
            ppm_every_days: s("ppm_every_days"), next_service: (ct.next_service as string) ?? "",
            bill_every_days: s("bill_every_days"), next_bill_date: (ct.next_bill_date as string) ?? "",
            bill_amount: s("bill_amount"), notes: (ct.notes as string) ?? "",
            allocations: (ct.allocations ?? []).map((a) => ({
              kind: (a.kind as "employee" | "subcontractor") ?? "employee",
              person_name: (a.person_name as string) ?? "",
              role: (a.role as string) ?? "",
              hours_per_week: a.hours_per_week != null ? String(a.hours_per_week) : "",
              rate: a.rate != null ? String(a.rate) : "",
              notes: (a.notes as string) ?? "",
            })),
          })
        })
        .catch(() => toast.error("Contract not found")))
    }
    Promise.all(loads).finally(() => setLoading(false))
  }, [id, form])

  async function onSubmit(v: Values) {
    const payload = { ...v, id: id ? Number(id) : undefined, customer_id: v.customer_id && v.customer_id !== NONE ? Number(v.customer_id) : "" }
    try {
      await api(editing ? "/contracts/update" : "/contracts", { method: "POST", body: payload })
      toast.success(editing ? "Contract saved" : "Contract created")
      navigate("/ego/contracts")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function action(path: string, msg: string) {
    if (!id) return
    try {
      await api(path, { method: "POST", body: { id: Number(id) } })
      toast.success(msg)
      navigate("/ego/contracts")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    }
  }

  async function onDelete() {
    if (!id || !(await confirmDialog({ title: "Delete this contract? (soft-delete — recoverable)", danger: true, confirmText: "Delete" }))) return
    await action("/contracts/delete", "Contract deleted")
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>

  const num = (n: string, label: string, ph = "") => (
    <FormField control={form.control} name={n as keyof Values as never} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type="number" step="any" placeholder={ph} {...field} /></FormControl></FormItem>
    )} />
  )
  const date = (n: string, label: string) => (
    <FormField control={form.control} name={n as keyof Values as never} render={({ field }) => (
      <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
    )} />
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/ego/contracts"><ArrowLeft /> Contracts</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileSignature className="size-5" /></div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">{editing ? (reference || "Contract") : "New contract"}</h1>
          </div>
        </div>
        {editing && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => action("/contracts/bill", "Billed — next bill scheduled")}><ReceiptText /> Bill now</Button>
            <Button type="button" variant="outline" onClick={() => action("/contracts/service-done", "PPM logged — next visit scheduled")}><CalendarCheck /> PPM done</Button>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="max-w-4xl">
            <CardHeader><CardTitle>Contract</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g. Annual boiler PPM" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="customer_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Unassigned</SelectItem>
                        {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <div className="grid gap-5 sm:grid-cols-4">
                {num("value", "Value (£)")}
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {date("start_date", "Start")}
                {date("renewal_date", "Renewal")}
              </div>
            </CardContent>
          </Card>

          <Card className="max-w-4xl">
            <CardHeader><CardTitle>SLA &amp; schedule</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              {num("sla_response_hours", "SLA response (h)")}
              {num("sla_fix_hours", "SLA fix (h)")}
              <div />
              {num("ppm_every_days", "PPM every (days)")}
              {date("next_service", "Next PPM visit")}
              <div />
              {num("bill_every_days", "Bill every (days)")}
              {num("bill_amount", "Bill amount (£)")}
              {date("next_bill_date", "Next bill date")}
            </CardContent>
          </Card>

          <Card className="max-w-4xl">
            <CardHeader><CardTitle>Resource allocations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && <p className="text-sm text-muted-foreground">No one allocated yet.</p>}
              {fields.map((f, i) => (
                <div key={f.id} className="grid items-end gap-3 sm:grid-cols-[0.9fr_1.3fr_1fr_0.7fr_0.7fr_auto]">
                  <FormField control={form.control} name={`allocations.${i}.kind`} render={({ field }) => (
                    <FormItem>{i === 0 && <FormLabel>Type</FormLabel>}
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="subcontractor">Subcontractor</SelectItem></SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`allocations.${i}.person_name`} render={({ field }) => (
                    <FormItem>{i === 0 && <FormLabel>Person *</FormLabel>}<FormControl><Input placeholder="Name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`allocations.${i}.role`} render={({ field }) => (
                    <FormItem>{i === 0 && <FormLabel>Role</FormLabel>}<FormControl><Input placeholder="Role" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`allocations.${i}.hours_per_week`} render={({ field }) => (
                    <FormItem>{i === 0 && <FormLabel>Hrs/wk</FormLabel>}<FormControl><Input type="number" step="0.5" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`allocations.${i}.rate`} render={({ field }) => (
                    <FormItem>{i === 0 && <FormLabel>Rate £</FormLabel>}<FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                  )} />
                  <div className="pb-1">
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => remove(i)} aria-label="Remove allocation"><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ kind: "employee", person_name: "", role: "", hours_per_week: "", rate: "", notes: "" })}>
                <Plus /> Add allocation
              </Button>
            </CardContent>
          </Card>

          <Card className="max-w-4xl">
            <CardContent className="pt-6">
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex max-w-4xl items-center justify-between gap-2">
            <div>{editing && <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 /> Delete</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild><Link to="/ego/contracts">Cancel</Link></Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}{editing ? "Save changes" : "Create contract"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
