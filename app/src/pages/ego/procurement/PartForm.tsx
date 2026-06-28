import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Package, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const NONE = "none"

const schema = z.object({
  sku: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  supplier_id: z.string().optional(),
  unit: z.string().optional(),
  cost_price: z.string().optional(),
  sale_price: z.string().optional(),
  stock_qty: z.string().optional(),
  reorder_level: z.string().optional(),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>

interface SupplierOpt { id: number; name: string }

export default function PartForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: "", name: "", description: "", category: "", supplier_id: NONE,
      unit: "each", cost_price: "0", sale_price: "0", stock_qty: "0", reorder_level: "0", active: true,
    },
  })

  useEffect(() => {
    const loadSuppliers = api<{ suppliers: SupplierOpt[] }>("/suppliers")
      .then((r) => setSuppliers(r.suppliers))
      .catch(() => {})
    const loadPart = id
      ? api<{ part: Record<string, unknown> }>(`/parts/get?id=${id}`).then(({ part: p }) => {
          form.reset({
            sku: (p.sku as string) ?? "",
            name: (p.name as string) ?? "",
            description: (p.description as string) ?? "",
            category: (p.category as string) ?? "",
            supplier_id: p.supplier_id != null ? String(p.supplier_id) : NONE,
            unit: (p.unit as string) ?? "each",
            cost_price: String(p.cost_price ?? 0),
            sale_price: String(p.sale_price ?? 0),
            stock_qty: String(p.stock_qty ?? 0),
            reorder_level: String(p.reorder_level ?? 0),
            active: Boolean(p.active),
          })
        }).catch(() => toast.error("Part not found"))
      : Promise.resolve()
    Promise.all([loadSuppliers, loadPart]).finally(() => setLoading(false))
  }, [id, form])

  async function onSubmit(v: Values) {
    const payload = {
      ...v,
      id: id ? Number(id) : undefined,
      supplier_id: v.supplier_id && v.supplier_id !== NONE ? Number(v.supplier_id) : "",
      active: v.active ? 1 : 0,
    }
    try {
      if (editing) {
        await api("/parts/update", { method: "POST", body: payload })
        toast.success("Part updated")
      } else {
        await api<{ id: number }>("/parts", { method: "POST", body: payload })
        toast.success("Part created")
      }
      navigate("/ego/parts")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function onDelete() {
    if (!id || !confirm("Delete this part? (soft-delete — recoverable)")) return
    try {
      await api("/parts/delete", { method: "POST", body: { id: Number(id) } })
      toast.success("Part deleted")
      navigate("/ego/parts")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/ego/parts"><ArrowLeft /> Parts</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {editing ? "Edit part" : "New part"}
          </h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl><Input placeholder="ABC-123" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="Part name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl><Input placeholder="e.g. Boiler parts" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="supplier_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="No supplier" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>No supplier</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <FormField control={form.control} name="cost_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (£)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sale_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale (£)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stock_qty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>In stock</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reorder_level" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder at</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl><Input placeholder="each / m / box" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <p className="text-xs text-muted-foreground">Inactive parts are hidden from pickers.</p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
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
                  <Button type="button" variant="outline" asChild>
                    <Link to="/ego/parts">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                    {editing ? "Save changes" : "Create part"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
