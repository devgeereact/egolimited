import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Truck, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useApi, invalidate } from "@/lib/query"
import { confirmDialog } from "@/components/ego/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { AiButton } from "@/components/ego/AiButton"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  account_ref: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>

export default function SupplierForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", contact: "", phone: "", email: "",
      account_ref: "", category: "", address: "", notes: "", active: true,
    },
  })

  const { data, isLoading, error } = useApi<{ supplier: Record<string, unknown> }>(id ? `/suppliers/get?id=${id}` : null)
  const loading = isLoading

  useEffect(() => {
    if (!data) return
    const s = data.supplier
    form.reset({
      name: (s.name as string) ?? "",
      contact: (s.contact as string) ?? "",
      phone: (s.phone as string) ?? "",
      email: (s.email as string) ?? "",
      account_ref: (s.account_ref as string) ?? "",
      category: (s.category as string) ?? "",
      address: (s.address as string) ?? "",
      notes: (s.notes as string) ?? "",
      active: Boolean(s.active),
    })
  }, [data, form])

  useEffect(() => {
    if (error) toast.error("Supplier not found")
  }, [error])

  async function onSubmit(v: Values) {
    try {
      if (editing) {
        await api("/suppliers/update", { method: "POST", body: { id: Number(id), ...v, active: v.active ? 1 : 0 } })
        toast.success("Supplier updated")
      } else {
        await api<{ id: number }>("/suppliers", { method: "POST", body: { ...v, active: v.active ? 1 : 0 } })
        toast.success("Supplier created")
      }
      invalidate("/suppliers")
      navigate("/ego/suppliers")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function onDelete() {
    if (!id || !(await confirmDialog({ title: "Delete this supplier? (soft-delete — recoverable)", danger: true, confirmText: "Delete" }))) return
    try {
      await api("/suppliers/delete", { method: "POST", body: { id: Number(id) } })
      toast.success("Supplier deleted")
      invalidate("/suppliers")
      navigate("/ego/suppliers")
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
          <Link to="/ego/suppliers"><ArrowLeft /> Suppliers</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {editing ? "Edit supplier" : "New supplier"}
          </h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input placeholder="Supplier name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl><Input placeholder="e.g. Plumbing merchant" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="account_ref" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account ref</FormLabel>
                    <FormControl><Input placeholder="Trade account number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact name</FormLabel>
                    <FormControl><Input placeholder="Account manager" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+44 …" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="orders@supplier.co.uk" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input placeholder="Depot / billing address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Notes</FormLabel>
                    <AiButton
                      endpoint="/procurement/draft" title="Draft supplier notes"
                      extra={{ kind: "supplier", name: form.watch("name") }}
                      placeholder="e.g. trade plumbing merchant, next-day delivery, 30-day account"
                      onResult={(d: { text: string }) => form.setValue("notes", d.text)}
                    />
                  </div>
                  <FormControl><Textarea rows={3} placeholder="Lead times, delivery days, terms…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <p className="text-xs text-muted-foreground">Inactive suppliers are hidden from pickers.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
                    <Link to="/ego/suppliers">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                    {editing ? "Save changes" : "Create supplier"}
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
