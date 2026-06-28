import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, ClipboardList, Plus, Trash2, Loader2, PackageCheck, Ban } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
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

const itemSchema = z.object({
  part_id: z.string().optional(),
  description: z.string().min(1, "Required"),
  qty: z.string(),
  unit_cost: z.string(),
})
const schema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  status: z.enum(["draft", "ordered"]),
  order_date: z.string().optional(),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema),
})
type Values = z.infer<typeof schema>

interface Opt { id: number; name: string }
interface PartOpt extends Opt { sale_price?: number; cost_price?: number }

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

export default function PurchaseOrderForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Opt[]>([])
  const [parts, setParts] = useState<PartOpt[]>([])
  const [reference, setReference] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("draft")

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: "", status: "draft", order_date: "", expected_date: "", notes: "",
      items: [{ part_id: NONE, description: "", qty: "1", unit_cost: "0" }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const watched = form.watch("items")
  const subtotal = (watched ?? []).reduce(
    (sum, it) => sum + (parseFloat(it?.qty || "0") || 0) * (parseFloat(it?.unit_cost || "0") || 0), 0,
  )

  useEffect(() => {
    const loads: Promise<unknown>[] = [
      api<{ suppliers: Opt[] }>("/suppliers").then((r) => setSuppliers(r.suppliers)).catch(() => {}),
      api<{ parts: PartOpt[] }>("/parts").then((r) => setParts(r.parts)).catch(() => {}),
    ]
    if (id) {
      loads.push(
        api<{ purchase_order: Record<string, unknown> }>(`/purchase-orders/get?id=${id}`)
          .then(({ purchase_order: po }) => {
            setReference((po.reference as string) ?? null)
            setStatus((po.status as string) ?? "draft")
            const items = (po.items as Array<Record<string, unknown>>) ?? []
            form.reset({
              supplier_id: String(po.supplier_id ?? ""),
              status: (["draft", "ordered"].includes(po.status as string) ? po.status : "draft") as Values["status"],
              order_date: (po.order_date as string) ?? "",
              expected_date: (po.expected_date as string) ?? "",
              notes: (po.notes as string) ?? "",
              items: items.length
                ? items.map((it) => ({
                    part_id: it.part_id != null ? String(it.part_id) : NONE,
                    description: (it.description as string) ?? "",
                    qty: String(it.qty ?? 1),
                    unit_cost: String(it.unit_cost ?? 0),
                  }))
                : [{ part_id: NONE, description: "", qty: "1", unit_cost: "0" }],
            })
          })
          .catch(() => toast.error("Purchase order not found")),
      )
    }
    Promise.all(loads).finally(() => setLoading(false))
  }, [id, form])

  const locked = editing && !["draft", "ordered"].includes(status)

  function onPartPick(index: number, value: string) {
    form.setValue(`items.${index}.part_id`, value)
    if (value !== NONE) {
      const p = parts.find((x) => String(x.id) === value)
      if (p) {
        if (!form.getValues(`items.${index}.description`)) form.setValue(`items.${index}.description`, p.name)
        if (p.cost_price != null) form.setValue(`items.${index}.unit_cost`, String(p.cost_price))
      }
    }
  }

  async function onSubmit(v: Values) {
    const payload = {
      id: id ? Number(id) : undefined,
      supplier_id: Number(v.supplier_id),
      status: v.status,
      order_date: v.order_date,
      expected_date: v.expected_date,
      notes: v.notes,
      items: v.items.map((it) => ({
        part_id: it.part_id && it.part_id !== NONE ? Number(it.part_id) : "",
        description: it.description,
        qty: it.qty,
        unit_cost: it.unit_cost,
      })),
    }
    try {
      const path = editing ? "/purchase-orders/update" : "/purchase-orders"
      await api(path, { method: "POST", body: payload })
      toast.success(editing ? "Purchase order saved" : "Purchase order created")
      navigate("/ego/purchase-orders")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function onReceive() {
    if (!id || !confirm("Mark received? This adds the ordered quantities to stock.")) return
    try {
      await api("/purchase-orders/receive", { method: "POST", body: { id: Number(id) } })
      toast.success("Received — stock updated")
      navigate("/ego/purchase-orders")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Receive failed")
    }
  }

  async function onCancel() {
    if (!id || !confirm("Cancel this purchase order?")) return
    try {
      await api("/purchase-orders/cancel", { method: "POST", body: { id: Number(id) } })
      toast.success("Purchase order cancelled")
      navigate("/ego/purchase-orders")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed")
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/ego/purchase-orders"><ArrowLeft /> Purchase orders</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              {editing ? (reference || "Purchase order") : "New purchase order"}
            </h1>
            {editing && <Badge variant="outline" className="capitalize">{status}</Badge>}
          </div>
        </div>
        {editing && !locked && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onReceive}><PackageCheck /> Receive</Button>
            <Button type="button" variant="ghost" className="text-destructive" onClick={onCancel}><Ban /> Cancel PO</Button>
          </div>
        )}
      </div>

      {locked && (
        <Card><CardContent className="py-4 text-sm text-muted-foreground">
          This PO is <span className="font-medium capitalize">{status}</span> and can no longer be edited.
        </CardContent></Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="max-w-4xl">
            <CardHeader><CardTitle>Order</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="supplier_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={locked}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select supplier…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={locked}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="order_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order date</FormLabel>
                    <FormControl><Input type="date" disabled={locked} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="expected_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected date</FormLabel>
                    <FormControl><Input type="date" disabled={locked} {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="max-w-4xl">
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {fields.map((f, i) => {
                const line = (parseFloat(watched?.[i]?.qty || "0") || 0) * (parseFloat(watched?.[i]?.unit_cost || "0") || 0)
                return (
                  <div key={f.id} className="grid items-end gap-3 sm:grid-cols-[1.4fr_2fr_0.7fr_0.9fr_auto]">
                    <FormField control={form.control} name={`items.${i}.part_id`} render={({ field }) => (
                      <FormItem>
                        {i === 0 && <FormLabel>Part</FormLabel>}
                        <Select onValueChange={(v) => onPartPick(i, v)} value={field.value} disabled={locked}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Free text" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>Free text</SelectItem>
                            {parts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${i}.description`} render={({ field }) => (
                      <FormItem>
                        {i === 0 && <FormLabel>Description *</FormLabel>}
                        <FormControl><Input placeholder="Item description" disabled={locked} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${i}.qty`} render={({ field }) => (
                      <FormItem>
                        {i === 0 && <FormLabel>Qty</FormLabel>}
                        <FormControl><Input type="number" step="0.01" min="0" disabled={locked} {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${i}.unit_cost`} render={({ field }) => (
                      <FormItem>
                        {i === 0 && <FormLabel>Unit £</FormLabel>}
                        <FormControl><Input type="number" step="0.01" min="0" disabled={locked} {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="flex items-center gap-2 pb-1">
                      <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">{gbp(line)}</span>
                      {!locked && (
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground"
                          onClick={() => remove(i)} disabled={fields.length === 1}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              {!locked && (
                <Button type="button" variant="outline" size="sm"
                  onClick={() => append({ part_id: NONE, description: "", qty: "1", unit_cost: "0" })}>
                  <Plus /> Add line
                </Button>
              )}
              <div className="flex justify-end border-t pt-4">
                <div className="flex w-56 items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-semibold tabular-nums">{gbp(subtotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="max-w-4xl">
            <CardContent className="pt-6">
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Delivery instructions, terms…" disabled={locked} {...field} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {!locked && (
            <div className="flex max-w-4xl justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to="/ego/purchase-orders">Cancel</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                {editing ? "Save changes" : "Create PO"}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
