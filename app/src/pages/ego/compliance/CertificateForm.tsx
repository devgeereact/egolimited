import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, BadgeCheck, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { confirmDialog } from "@/components/ego/confirm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const NONE = "none"
const schema = z.object({
  title: z.string().min(2, "Title is required"),
  holder: z.string().optional(),
  engineer_id: z.string().optional(),
  type: z.string().optional(),
  reference: z.string().optional(),
  issued_date: z.string().optional(),
  expiry_date: z.string().optional(),
})
type Values = z.infer<typeof schema>
interface Opt { id: number; name: string }

export default function CertificateForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(true)
  const [engineers, setEngineers] = useState<Opt[]>([])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", holder: "", engineer_id: NONE, type: "", reference: "", issued_date: "", expiry_date: "" },
  })

  useEffect(() => {
    const loads: Promise<unknown>[] = [
      api<{ team: Opt[] }>("/team").then((r) => setEngineers(r.team ?? [])).catch(() => {}),
    ]
    if (id) {
      loads.push(api<{ certificate: Record<string, unknown> }>(`/certificates/get?id=${id}`)
        .then(({ certificate: c }) => form.reset({
          title: (c.title as string) ?? "", holder: (c.holder as string) ?? "",
          engineer_id: c.engineer_id != null ? String(c.engineer_id) : NONE,
          type: (c.type as string) ?? "", reference: (c.reference as string) ?? "",
          issued_date: (c.issued_date as string) ?? "", expiry_date: (c.expiry_date as string) ?? "",
        })).catch(() => toast.error("Certificate not found")))
    }
    Promise.all(loads).finally(() => setLoading(false))
  }, [id, form])

  async function onSubmit(v: Values) {
    const payload = { ...v, id: id ? Number(id) : undefined, engineer_id: v.engineer_id && v.engineer_id !== NONE ? Number(v.engineer_id) : "" }
    try {
      await api(editing ? "/certificates/update" : "/certificates", { method: "POST", body: payload })
      toast.success(editing ? "Certificate saved" : "Certificate added"); navigate("/ego/certificates")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") }
  }
  async function onDelete() {
    if (!id || !(await confirmDialog({ title: "Delete this certificate?", danger: true, confirmText: "Delete" }))) return
    try { await api("/certificates/delete", { method: "POST", body: { id: Number(id) } }); toast.success("Deleted"); navigate("/ego/certificates") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed") }
  }
  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground"><Link to="/ego/certificates"><ArrowLeft /> Certificates</Link></Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><BadgeCheck className="size-5" /></div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{editing ? "Edit certificate" : "New certificate"}</h1>
        </div>
      </div>
      <Card className="max-w-2xl"><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g. Gas Safe registration" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField control={form.control} name="engineer_id" render={({ field }) => (
              <FormItem><FormLabel>Engineer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value={NONE}>Not linked</SelectItem>{engineers.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                </Select></FormItem>
            )} />
            <FormField control={form.control} name="holder" render={({ field }) => (<FormItem><FormLabel>Holder (if not staff)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="e.g. Gas Safe, NICEIC" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference / number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField control={form.control} name="issued_date" render={({ field }) => (<FormItem><FormLabel>Issued</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="expiry_date" render={({ field }) => (<FormItem><FormLabel>Expiry</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>{editing && <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 /> Delete</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild><Link to="/ego/certificates">Cancel</Link></Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />}{editing ? "Save" : "Add"}</Button>
            </div>
          </div>
        </form></Form>
      </CardContent></Card>
    </div>
  )
}
