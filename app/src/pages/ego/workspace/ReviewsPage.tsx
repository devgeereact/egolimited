import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight, Loader2, MessageSquareQuote, Star, Plus, DownloadCloud } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Review {
  id: number; rating: number | null; body: string | null; from_name: string | null
  created_at: string; acknowledged: number; job_id: number | null
  job_reference: string | null; customer_name: string | null; source?: string | null
}

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-4", i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </span>
  )
}

interface Resp { reviews: Review[]; count: number; average: number | null; pages: number; page: number }

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [g, setG] = useState({ name: "", rating: "5", body: "" })
  const [savingG, setSavingG] = useState(false)

  function load() {
    setLoading(true)
    return api<Resp>(`/reviews?page=${page}`)
      .then((r) => { setReviews(r.reviews); setAverage(r.average); setCount(r.count); setPages(r.pages) })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't load reviews"))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [page])

  async function ack(id: number) {
    try { await api("/messages/ack", { method: "POST", body: { id } }); toast.success("Marked read"); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  async function importGoogle() {
    setImporting(true)
    try {
      const r = await api<{ imported: number }>("/reviews/import-google", { method: "POST" })
      toast.success(r.imported ? `Imported ${r.imported} Google review(s)` : "No new Google reviews")
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Import failed") }
    finally { setImporting(false) }
  }
  async function addGoogle() {
    if (!g.body.trim()) return toast.error("Enter the review text")
    setSavingG(true)
    try {
      await api("/reviews/add", { method: "POST", body: { ...g, rating: Number(g.rating), source: "google" } })
      toast.success("Google review added"); setAddOpen(false); setG({ name: "", rating: "5", body: "" }); load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setSavingG(false) }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MessageSquareQuote className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customer + Google reviews in one place. 4★ reviews auto-publish to the website.</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={importGoogle} disabled={importing}>
            {importing ? <Loader2 className="animate-spin" /> : <DownloadCloud />} Import Google
          </Button>
          <Button onClick={() => setAddOpen(true)}><Plus /> Add Google review</Button>
        </div>
      </div>

      {/* Average */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold">{average?.toFixed(1) ?? "—"}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
          <Stars n={Math.round(average ?? 0)} className="gap-0.5" />
          <span className="text-sm text-muted-foreground">{count} review{count === 1 ? "" : "s"}</span>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No reviews yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <Card key={r.id} className={cn(!r.acknowledged && "ring-1 ring-amber-500/40")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars n={r.rating ?? 0} className="gap-0.5" />
                    {r.source === "google" && <Badge variant="secondary" className="text-[10px]">Google</Badge>}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{r.created_at?.slice(0, 16)}</span>
                </div>
                {r.body ? <p className="text-sm">{r.body}</p> : <p className="text-sm italic text-muted-foreground">No comment left.</p>}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                  <span>
                    {r.from_name || r.customer_name || "Customer"}
                    {r.job_reference && (
                      <> · <Link to={`/ego/jobs/detail?id=${r.job_id}`} className="font-mono text-primary hover:underline">{r.job_reference}</Link></>
                    )}
                  </span>
                  {r.acknowledged ? (
                    <span className="text-emerald-600">✓ Read</span>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => ack(r.id)}>Mark read</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={loading || page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a Google review</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Paste a Google review to show it on the website alongside app reviews. Or set a Google Places key in Integrations and use <strong>Import Google</strong>.</p>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Input placeholder="Reviewer name" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
              <Select value={g.rating} onValueChange={(v) => setG({ ...g, rating: v })}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea rows={4} placeholder="Review text…" value={g.body} onChange={(e) => setG({ ...g, body: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addGoogle} disabled={savingG}>{savingG ? <Loader2 className="animate-spin" /> : null} Add review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
