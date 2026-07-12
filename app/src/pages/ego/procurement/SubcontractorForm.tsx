import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, HardHat, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useApi, invalidate } from "@/lib/query"
import { confirmDialog } from "@/components/ego/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AiButton } from "@/components/ego/AiButton"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  company: z.string().optional(),
  trades: z.string().optional(),
  coverage_areas: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  insurance_expiry: z.string().optional(),
  qualifications: z.string().optional(),
  day_rate: z.string().optional(),
  rating: z.string().optional(),
  status: z.enum(["active", "pending", "suspended"]),
  notes: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function SubcontractorForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", company: "", trades: "", coverage_areas: "", phone: "", email: "",
      insurance_expiry: "", qualifications: "", day_rate: "", rating: "", status: "active", notes: "",
    },
  })

  const { data, isLoading, error } = useApi<{ subcontractor: Record<string, unknown> }>(id ? `/subcontractors/get?id=${id}` : null)
  const loading = isLoading

  useEffect(() => {
    if (!data) return
    const s = data.subcontractor
    form.reset({
      name: (s.name as string) ?? "",
      company: (s.company as string) ?? "",
      trades: (s.trades as string) ?? "",
      coverage_areas: (s.coverage_areas as string) ?? "",
      phone: (s.phone as string) ?? "",
      email: (s.email as string) ?? "",
      insurance_expiry: (s.insurance_expiry as string) ?? "",
      qualifications: (s.qualifications as string) ?? "",
      day_rate: s.day_rate != null ? String(s.day_rate) : "",
      rating: s.rating != null ? String(s.rating) : "",
      status: (s.status as Values["status"]) ?? "active",
      notes: (s.notes as string) ?? "",
    })
  }, [data, form])

  useEffect(() => {
    if (error) toast.error("Subcontractor not found")
  }, [error])

  async function onSubmit(v: Values) {
    const payload = { ...v, id: id ? Number(id) : undefined }
    try {
      if (editing) {
        await api("/subcontractors/update", { method: "POST", body: payload })
        toast.success("Subcontractor updated")
      } else {
        await api<{ id: number }>("/subcontractors", { method: "POST", body: payload })
        toast.success("Subcontractor created")
      }
      invalidate("/subcontractors")
      navigate("/ego/subcontractors")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function onDelete() {
    if (!id || !(await confirmDialog({ title: "Delete this subcontractor? (soft-delete — recoverable)", danger: true, confirmText: "Delete" }))) return
    try {
      await api("/subcontractors/delete", { method: "POST", body: { id: Number(id) } })
      toast.success("Subcontractor deleted")
      invalidate("/subcontractors")
      navigate("/ego/subcontractors")
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
          <Link to="/ego/subcontractors"><ArrowLeft /> Subcontractors</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HardHat className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {editing ? "Edit subcontractor" : "New subcontractor"}
          </h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="Contact name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl><Input placeholder="Trading name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="trades" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trades</FormLabel>
                    <FormControl><Input placeholder="e.g. Electrical, Heating" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="coverage_areas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coverage areas</FormLabel>
                    <FormControl><Input placeholder="e.g. SE / SW London" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+44 …" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="name@company.co.uk" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <FormField control={form.control} name="insurance_expiry" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance expiry</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="day_rate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day rate (£)</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rating" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1–5)</FormLabel>
                    <FormControl><Input type="number" min="1" max="5" placeholder="—" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="qualifications" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualifications</FormLabel>
                    <FormControl><Input placeholder="e.g. NICEIC, Gas Safe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Notes</FormLabel>
                    <AiButton
                      endpoint="/procurement/draft" title="Draft subcontractor notes"
                      extra={{ kind: "subcontractor", name: form.watch("name") }}
                      placeholder="e.g. electrician, 18th edition, reliable, covers SE London"
                      onResult={(d: { text: string }) => form.setValue("notes", d.text)}
                    />
                  </div>
                  <FormControl><Textarea rows={3} placeholder="Reliability, preferred jobs, terms…" {...field} /></FormControl>
                  <FormMessage />
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
                    <Link to="/ego/subcontractors">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                    {editing ? "Save changes" : "Create subcontractor"}
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
