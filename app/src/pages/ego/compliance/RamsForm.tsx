import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, FileCheck2, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  trade: z.string().optional(),
  reference: z.string().optional(),
  review_date: z.string().optional(),
  content: z.string().optional(),
})
type Values = z.infer<typeof schema>

export default function RamsForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(editing)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", trade: "", reference: "", review_date: "", content: "" } })

  useEffect(() => {
    if (!id) return
    api<{ rams: Record<string, unknown> }>(`/rams/get?id=${id}`)
      .then(({ rams: r }) => form.reset({
        title: (r.title as string) ?? "", trade: (r.trade as string) ?? "", reference: (r.reference as string) ?? "",
        review_date: (r.review_date as string) ?? "", content: (r.content as string) ?? "",
      })).catch(() => toast.error("RAMS not found")).finally(() => setLoading(false))
  }, [id, form])

  async function onSubmit(v: Values) {
    try {
      await api(editing ? "/rams/update" : "/rams", { method: "POST", body: { ...v, id: id ? Number(id) : undefined } })
      toast.success(editing ? "RAMS saved" : "RAMS created"); navigate("/ego/rams")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") }
  }
  async function onDelete() {
    if (!id || !confirm("Delete this RAMS document?")) return
    try { await api("/rams/delete", { method: "POST", body: { id: Number(id) } }); toast.success("Deleted"); navigate("/ego/rams") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed") }
  }
  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground"><Link to="/ego/rams"><ArrowLeft /> RAMS</Link></Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileCheck2 className="size-5" /></div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{editing ? "Edit RAMS" : "New RAMS"}</h1>
        </div>
      </div>
      <Card className="max-w-2xl"><CardHeader><CardTitle>Risk assessment &amp; method statement</CardTitle></CardHeader><CardContent>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g. Working at height" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField control={form.control} name="trade" render={({ field }) => (<FormItem><FormLabel>Trade</FormLabel><FormControl><Input placeholder="e.g. Roofing" {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="review_date" render={({ field }) => (<FormItem><FormLabel>Review date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
          </div>
          <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Content</FormLabel><FormControl><Textarea rows={8} placeholder="Hazards, controls, method…" {...field} /></FormControl></FormItem>)} />
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>{editing && <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 /> Delete</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild><Link to="/ego/rams">Cancel</Link></Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />}{editing ? "Save" : "Create"}</Button>
            </div>
          </div>
        </form></Form>
      </CardContent></Card>
    </div>
  )
}
