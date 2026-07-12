import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, FilePlus, Pencil, Loader2, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useApi, invalidate } from "@/lib/query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const schema = z.object({
  customer_id: z.string().optional(),
  title: z.string().min(3, "Give the job a short title"),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "urgent"]),
  quotedAmount: z.string().optional().refine((v) => !v || !Number.isNaN(Number(v)), "Enter a valid amount"),
  line1: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
})
type Values = z.infer<typeof schema>

/** What GET /jobs/get returns. Only the fields this form actually reads. */
interface JobRecord {
  customer_id: number | null
  customer_name: string | null
  title: string | null
  description: string | null
  priority: string | null
  quoted_amount: string | number | null
  address?: { line1?: string | null; city?: string | null; postcode?: string | null } | null
}

export default function JobForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const preCustomer = params.get("customer") ?? ""

  // Create mode: choose an existing customer OR create one inline with the job.
  const [newCust, setNewCust] = useState(false)
  const [cust, setCust] = useState({ name: "", phone: "", email: "" })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { customer_id: preCustomer, title: "", description: "", priority: "normal", quotedAmount: "", line1: "", city: "", postcode: "" },
  })

  const { data: customersData } = useApi<{ customers: { id: number; name: string }[] }>(!editing ? "/customers" : null)
  const customers = useMemo(() => customersData?.customers ?? [], [customersData])

  const { data: jobData, isLoading, error } = useApi<{ job: JobRecord }>(id ? `/jobs/get?id=${id}` : null)
  const loading = isLoading
  const customerName = jobData?.job?.customer_name ?? "" // shown read-only when editing

  useEffect(() => {
    if (!jobData) return
    const job = jobData.job
    const a = job.address ?? {}
    form.reset({
      customer_id: String(job.customer_id ?? ""),
      title: job.title ?? "",
      description: job.description ?? "",
      priority: (["low", "normal", "urgent"].includes(job.priority ?? "") ? job.priority : "normal") as Values["priority"],
      quotedAmount: job.quoted_amount != null ? String(job.quoted_amount) : "",
      line1: a.line1 ?? "", city: a.city ?? "", postcode: a.postcode ?? "",
    })
  }, [jobData, form])

  useEffect(() => {
    if (error) toast.error("Job not found")
  }, [error])

  async function onSubmit(v: Values) {
    const address = { line1: v.line1, city: v.city, postcode: v.postcode }
    const core = {
      title: v.title,
      description: v.description,
      priority: v.priority,
      quoted_amount: v.quotedAmount ? Number(v.quotedAmount) : undefined,
      address,
    }
    try {
      if (editing) {
        await api("/jobs/update", { method: "POST", body: { id: Number(id), ...core } })
        toast.success("Job updated")
        invalidate("/jobs", "/dashboard")
        navigate(`/ego/jobs/detail?id=${id}`)
        return
      }
      // Create: attach either an existing customer id or a new inline customer.
      const body: Record<string, unknown> = { ...core }
      if (newCust) {
        if (cust.name.trim().length < 2) { toast.error("Customer name is required"); return }
        body.customer = { name: cust.name.trim(), phone: cust.phone.trim(), email: cust.email.trim() }
      } else {
        if (!v.customer_id) { form.setError("customer_id", { message: "Pick a customer or add a new one" }); return }
        body.customer_id = Number(v.customer_id)
      }
      const res = await api<{ id: number; reference: string }>("/jobs", { method: "POST", body })
      toast.success(`${res.reference} created`)
      invalidate("/jobs", "/dashboard")
      navigate(`/ego/jobs/detail?id=${res.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : editing ? "Couldn't update job" : "Couldn't create job")
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to={editing ? `/ego/jobs/detail?id=${id}` : "/ego/jobs"}><ArrowLeft /> {editing ? "Job" : "Jobs"}</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {editing ? <Pencil className="size-5" /> : <FilePlus className="size-5" />}
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{editing ? "Edit job" : "New job"}</h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Job details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Customer — fixed on edit; on create pick existing OR add a new one inline */}
              {editing ? (
                <div className="space-y-1.5">
                  <Label>Customer</Label>
                  <Input value={customerName} readOnly disabled className="opacity-80" />
                  <p className="text-xs text-muted-foreground">The customer can't be changed here — edit them in Contacts.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Customer *</Label>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant={newCust ? "outline" : "default"} onClick={() => setNewCust(false)}>
                        <Users className="size-4" /> Existing
                      </Button>
                      <Button type="button" size="sm" variant={newCust ? "default" : "outline"} onClick={() => setNewCust(true)}>
                        <UserPlus className="size-4" /> New
                      </Button>
                    </div>
                  </div>
                  {newCust ? (
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="space-y-1.5"><Label>Name *</Label><Input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} placeholder="Customer name" /></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5"><Label>Phone</Label><Input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} placeholder="+44 …" /></div>
                        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} placeholder="name@example.com" /></div>
                      </div>
                      <p className="text-xs text-muted-foreground">A new customer will be created and linked to this job.</p>
                    </div>
                  ) : (
                    <FormField control={form.control} name="customer_id" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a customer…" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              )}

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input placeholder="e.g. Boiler not firing" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="What's the problem / scope?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="line1" render={({ field }) => (
                <FormItem>
                  <FormLabel>Site address</FormLabel>
                  <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="postcode" render={({ field }) => (
                  <FormItem><FormLabel>Postcode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quotedAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quoted amount (£)</FormLabel>
                    <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" asChild><Link to={editing ? `/ego/jobs/detail?id=${id}` : "/ego/jobs"}>Cancel</Link></Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className={cn("animate-spin")} />} {editing ? "Save changes" : "Create job"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
