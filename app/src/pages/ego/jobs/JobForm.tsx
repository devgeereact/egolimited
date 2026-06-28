import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, FilePlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const schema = z.object({
  customer_id: z.string().min(1, "Pick a customer"),
  title: z.string().min(3, "Give the job a short title"),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "urgent"]),
  quotedAmount: z.string().optional().refine((v) => !v || !Number.isNaN(Number(v)), "Enter a valid amount"),
  line1: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function JobForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preCustomer = params.get("customer") ?? ""
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { customer_id: preCustomer, title: "", description: "", priority: "normal", quotedAmount: "", line1: "", city: "", postcode: "" },
  })

  useEffect(() => {
    api<{ customers: { id: number; name: string }[] }>("/customers").then((r) => setCustomers(r.customers))
  }, [])

  async function onSubmit(v: Values) {
    try {
      const res = await api<{ id: number; reference: string }>("/jobs", {
        method: "POST",
        body: {
          customer_id: Number(v.customer_id),
          title: v.title,
          description: v.description,
          priority: v.priority,
          quoted_amount: v.quotedAmount ? Number(v.quotedAmount) : undefined,
          address: { line1: v.line1, city: v.city, postcode: v.postcode },
        },
      })
      toast.success(`${res.reference} created`)
      navigate(`/ego/jobs/detail?id=${res.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create job")
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/ego/jobs"><ArrowLeft /> Jobs</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FilePlus className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">New job</h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Job details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="customer_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a customer…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Button type="button" variant="outline" asChild><Link to="/ego/jobs">Cancel</Link></Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Create job
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
