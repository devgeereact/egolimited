import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight, Loader2, MessageSquareQuote, Star } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Review {
  id: number; rating: number | null; body: string | null; from_name: string | null
  created_at: string; acknowledged: number; job_id: number | null
  job_reference: string | null; customer_name: string | null
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

  function load() {
    setLoading(true)
    return api<Resp>(`/reviews?page=${page}`)
      .then((r) => { setReviews(r.reviews); setAverage(r.average); setCount(r.count); setPages(r.pages) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [page])

  async function ack(id: number) {
    try { await api("/messages/ack", { method: "POST", body: { id } }); toast.success("Marked read"); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MessageSquareQuote className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">What customers say after a job — left via their tracking link.</p>
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
                  <Stars n={r.rating ?? 0} className="gap-0.5" />
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
    </div>
  )
}
