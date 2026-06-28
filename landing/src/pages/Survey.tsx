import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Star, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageHero, Section } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { api } from "@/lib/api"

export default function Survey() {
  const [params] = useSearchParams()
  const job = params.get("job") ?? params.get("ref") ?? ""
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { toast.error("Please pick a rating."); return }
    setSending(true)
    try {
      await api.post("survey.php", { job, rating, comment })
      setDone(true)
    } catch {
      // Degrade gracefully — still thank the customer; the office gets the gist via enquiry.
      try { await api.post("enquiry", { name: "Survey response", contact: job || "—", message: `Rating: ${rating}/5\n\n${comment}` }) } catch { /* noop */ }
      setDone(true)
    } finally { setSending(false) }
  }

  if (done) return (
    <>
      <Seo title="Thank you — EGO LTD" description="Thank you for your feedback." path="/survey" noindex />
      <Section>
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
          <h1 className="mt-4 font-serif text-2xl font-bold">Thank you</h1>
          <p className="mt-2 text-muted-foreground">We have your feedback. It genuinely helps us do better work — and if anything was not right, we will be in touch.</p>
        </div>
      </Section>
    </>
  )

  return (
    <>
      <Seo title="Rate your job — EGO LTD" description="Tell us how we did. Your feedback helps us keep our standards high." path="/survey" noindex />
      <PageHero eyebrow="Feedback" title="How did we do?" intro="A quick rating and a line or two is all it takes. We read every one." />
      <Section>
        <form onSubmit={submit} className="mx-auto max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm">
          <Label>Your rating</Label>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="p-1">
                <Star className={`h-8 w-8 transition-colors ${n <= (hover || rating) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-2"><Label htmlFor="comment">Anything you would like to add?</Label><Textarea id="comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well, or what we could do better." /></div>
          <Button type="submit" className="mt-5 w-full" disabled={sending}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{sending ? "Sending" : "Send feedback"}</Button>
        </form>
      </Section>
    </>
  )
}
