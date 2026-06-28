import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, CheckCircle2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"

export default function Survey() {
  const [params] = useSearchParams()
  const jobId = params.get("job")
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  // Set only for promoters (9-10) when a Google review link is configured.
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)

  async function submit() {
    if (score === null) {
      toast.error("Pick a score from 0 to 10")
      return
    }
    setBusy(true)
    try {
      const res = await api.post<{ review_url?: string | null }>("survey.php", {
        job_id: jobId ? Number(jobId) : null,
        score,
        comment: comment || null,
      })
      setReviewUrl(res.review_url ?? null)
      setDone(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="container flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
        {reviewUrl ? (
          <>
            <div className="flex gap-1 text-accent">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="h-7 w-7 fill-current" />
              ))}
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold">Thank you, that means a lot</h1>
            <p className="mt-2 max-w-md text-muted-foreground">
              We're so glad we hit the mark. If you have a moment, a quick Google
              review helps other people find us, and it genuinely makes a difference.
            </p>
            <Button asChild size="lg" className="mt-6">
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer">
                <Star className="mr-2 h-4 w-4" /> Leave a Google review
              </a>
            </Button>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <h1 className="mt-4 font-serif text-2xl font-bold">Thank you</h1>
            <p className="mt-2 max-w-md text-muted-foreground">
              Your feedback helps us keep the work to a high standard. We appreciate you.
            </p>
          </>
        )}
      </section>
    )
  }

  return (
    <section className="container max-w-xl px-4 py-16">
      <h1 className="font-serif text-3xl font-bold tracking-tight">How did we do?</h1>
      <p className="mt-2 text-muted-foreground">
        How likely are you to recommend EGO LTD to a friend or colleague?
      </p>

      <div role="radiogroup" aria-label="How likely are you to recommend us, 0 to 10" className="mt-6 grid grid-cols-11 gap-1.5">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            role="radio"
            aria-checked={score === n}
            aria-label={`${n} out of 10`}
            onClick={() => setScore(n)}
            className={
              "aspect-square rounded-md border text-sm font-semibold transition-colors " +
              (score === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary")
            }
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>

      <div className="mt-6 space-y-2">
        <label className="text-sm font-medium">Anything you'd like to add? (optional)</label>
        <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      <Button onClick={submit} disabled={busy} className="mt-6">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit feedback
      </Button>
    </section>
  )
}
