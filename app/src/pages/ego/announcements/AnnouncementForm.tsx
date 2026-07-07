import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Megaphone, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { confirmDialog } from "@/components/ego/confirm"
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
import { AiButton } from "@/components/ego/AiButton"

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  body: z.string().optional(),
  audience: z.enum(["all", "engineers", "office"]),
  pinned: z.boolean(),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>

export default function AnnouncementForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = params.get("id")
  const editing = Boolean(id)
  const [loading, setLoading] = useState(editing)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "", audience: "all", pinned: false, active: true },
  })

  useEffect(() => {
    if (!id) return
    api<{ announcement: Record<string, unknown> }>(`/announcements/get?id=${id}`)
      .then(({ announcement: a }) => {
        form.reset({
          title: (a.title as string) ?? "",
          body: (a.body as string) ?? "",
          audience: (a.audience as Values["audience"]) ?? "all",
          pinned: Boolean(a.pinned),
          active: Boolean(a.active),
        })
      })
      .catch(() => toast.error("Announcement not found"))
      .finally(() => setLoading(false))
  }, [id, form])

  async function onSubmit(v: Values) {
    const payload = { ...v, id: id ? Number(id) : undefined, pinned: v.pinned ? 1 : 0, active: v.active ? 1 : 0 }
    try {
      if (editing) {
        await api("/announcements/update", { method: "POST", body: payload })
        toast.success("Announcement saved")
      } else {
        await api<{ id: number }>("/announcements", { method: "POST", body: payload })
        toast.success("Announcement posted")
      }
      navigate("/ego/announcements")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  async function onDelete() {
    if (!id || !(await confirmDialog({ title: "Delete this announcement?", danger: true, confirmText: "Delete" }))) return
    try {
      await api("/announcements/delete", { method: "POST", body: { id: Number(id) } })
      toast.success("Announcement deleted")
      navigate("/ego/announcements")
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
          <Link to="/ego/announcements"><ArrowLeft /> Announcements</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {editing ? "Edit announcement" : "New announcement"}
          </h1>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Message</CardTitle>
          <AiButton
            endpoint="/announcements/draft"
            extra={{ audience: form.watch("audience") }}
            title="Draft an announcement"
            placeholder="e.g. depot closed Friday for stocktake, vans back Monday"
            onResult={(d: { title?: string; body?: string }) => {
              if (d.title) form.setValue("title", d.title, { shouldValidate: true })
              form.setValue("body", d.body ?? "")
            }}
          />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input placeholder="e.g. Depot closed Friday" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl><Textarea rows={5} placeholder="What the team needs to know…" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="audience" render={({ field }) => (
                <FormItem>
                  <FormLabel>Audience</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="engineers">Engineers</SelectItem>
                      <SelectItem value="office">Office &amp; up</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="pinned" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Pinned</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Live</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <div>
                  {editing && (
                    <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete}>
                      <Trash2 /> Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" asChild><Link to="/ego/announcements">Cancel</Link></Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                    {editing ? "Save changes" : "Post announcement"}
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
