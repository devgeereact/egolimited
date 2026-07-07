import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, ShieldAlert, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { confirmDialog } from "@/components/ego/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AiButton } from "@/components/ego/AiButton"

const schema = z.object({
  incident_date: z.string().optional(),
  type: z.enum(["accident", "near_miss", "injury", "property", "environmental", "other"]),
  severity: z.enum(["low", "medium", "high", "riddor"]),
  location: z.string().optional(),
  person: z.string().optional(),
  description: z.string().optional(),
  action_taken: z.string().optional(),
  reported_by: z.string().optional(),
  status: z.enum(["open", "investigating", "closed"]),
})
type Values = z.infer<typeof schema>

export default function IncidentForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(editing)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { incident_date: "", type: "near_miss", severity: "low", location: "", person: "", description: "", action_taken: "", reported_by: "", status: "open" },
  })

  useEffect(() => {
    if (!id) return
    api<{ incident: Record<string, unknown> }>(`/incidents/get?id=${id}`)
      .then(({ incident: i }) => form.reset({
        incident_date: (i.incident_date as string) ?? "", type: (i.type as Values["type"]) ?? "near_miss",
        severity: (i.severity as Values["severity"]) ?? "low", location: (i.location as string) ?? "",
        person: (i.person as string) ?? "", description: (i.description as string) ?? "",
        action_taken: (i.action_taken as string) ?? "", reported_by: (i.reported_by as string) ?? "",
        status: (i.status as Values["status"]) ?? "open",
      }))
      .catch(() => toast.error("Incident not found")).finally(() => setLoading(false))
  }, [id, form])

  async function onSubmit(v: Values) {
    try {
      await api(editing ? "/incidents/update" : "/incidents", { method: "POST", body: { ...v, id: id ? Number(id) : undefined } })
      toast.success(editing ? "Incident saved" : "Incident reported")
      navigate("/ego/incidents")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") }
  }
  async function onDelete() {
    if (!id || !(await confirmDialog({ title: "Delete this incident?", danger: true, confirmText: "Delete" }))) return
    try { await api("/incidents/delete", { method: "POST", body: { id: Number(id) } }); toast.success("Deleted"); navigate("/ego/incidents") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed") }
  }
  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground"><Link to="/ego/incidents"><ArrowLeft /> Incidents</Link></Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldAlert className="size-5" /></div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{editing ? "Edit incident" : "Report incident"}</h1>
        </div>
      </div>
      <Card className="max-w-2xl"><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField control={form.control} name="incident_date" render={({ field }) => (
              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{["accident","near_miss","injury","property","environmental","other"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select></FormItem>
            )} />
            <FormField control={form.control} name="severity" render={({ field }) => (
              <FormItem><FormLabel>Severity</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{["low","medium","high","riddor"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select></FormItem>
            )} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="person" render={({ field }) => (<FormItem><FormLabel>Person involved</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </div>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>What happened</FormLabel>
                <AiButton
                  endpoint="/incidents/polish" label="Polish with AI"
                  buildBody={() => { const t = (form.getValues("description") ?? "").trim(); return t ? { text: t, field: "incident description" } : null }}
                  onResult={(d: { text: string }) => form.setValue("description", d.text)}
                />
              </div>
              <FormControl><Textarea rows={3} {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="action_taken" render={({ field }) => (<FormItem><FormLabel>Action taken</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField control={form.control} name="reported_by" render={({ field }) => (<FormItem><FormLabel>Reported by</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem><FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{["open","investigating","closed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select></FormItem>
            )} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>{editing && <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 /> Delete</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild><Link to="/ego/incidents">Cancel</Link></Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />}{editing ? "Save" : "Report"}</Button>
            </div>
          </div>
        </form></Form>
      </CardContent></Card>
    </div>
  )
}
