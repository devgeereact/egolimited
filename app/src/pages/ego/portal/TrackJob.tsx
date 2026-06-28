import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  Wrench, CheckCircle2, Truck, CalendarClock, Loader2, Send, Building2, BadgePoundSterling, AlertCircle, Star,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface Track {
  job: { reference: string; title: string; description: string | null; status: string; scheduled_start: string | null; scheduled_end: string | null; engineer_name: string | null; customer_name: string }
  company: { company_name: string; logo_url: string | null; phone: string | null; email: string | null }
  bank: { account_name: string; sort_code: string; account_number: string } | null
  invoice: { number: string | null; total: string; status: string; payment_reference: string; due_date: string | null } | null
  documents: { kind: string; number: string | null; total: string; status: string; payment_reference: string; issue_date: string | null; due_date: string | null }[]
  messages: { direction: "inbound" | "outbound"; from_name: string | null; body: string; acknowledged: number; created_at: string }[]
  step: number
  cancelled: boolean
  completed: boolean
  review: { rating: number; body: string | null; created_at: string } | null
}

const STEPS = ["Booked", "Scheduled", "On the way", "On site", "Completed", "Paid"]
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n)

export default function TrackJob() {
  const { token = "" } = useParams()
  const [t, setT] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewBody, setReviewBody] = useState("")
  const [savingReview, setSavingReview] = useState(false)

  function load() {
    return api<Track>(`/track?token=${encodeURIComponent(token)}`, { auth: false }).then(setT)
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "This link has expired — contact the office."))
      .finally(() => setLoading(false))
  }, [token])

  async function sendMessage() {
    if (!msg.trim()) return
    setSending(true)
    try {
      await api("/track/message", { method: "POST", body: { token, body: msg, name: t?.job.customer_name }, auth: false })
      toast.success("Message sent to the office")
      setMsg("")
      load().catch(() => {})   // pull the message back so it shows in the thread
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send") }
    finally { setSending(false) }
  }

  async function submitReview() {
    if (!rating) { toast.error("Pick a star rating"); return }
    setSavingReview(true)
    try {
      await api("/track/review", { method: "POST", body: { token, rating, body: reviewBody, name: t?.job.customer_name }, auth: false })
      toast.success("Thanks for your review!")
      setReviewBody("")
      load().catch(() => {})
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't submit") }
    finally { setSavingReview(false) }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
  if (error || !t) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertCircle className="size-10 text-muted-foreground" />
      <p className="text-lg font-medium">Link unavailable</p>
      <p className="text-sm text-muted-foreground">{error}</p>
    </div>
  )

  const onTheWay = t.job.status === "en_route" || t.job.status === "on_site"

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background p-4 sm:max-w-xl sm:p-6 lg:max-w-2xl">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2 pt-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          {t.company.logo_url ? <img src={t.company.logo_url} alt="" className="size-6" /> : <Wrench className="size-5" />}
        </div>
        <span className="font-semibold">{t.company.company_name}</span>
      </div>

      <Card className="mb-4">
        <CardContent className="p-5">
          <p className="font-mono text-xs text-muted-foreground">{t.job.reference}</p>
          <h1 className="text-xl font-semibold tracking-tight">{t.job.title}</h1>

          {/* Appointment */}
          {t.job.scheduled_start && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4" />
              {t.job.scheduled_start.slice(0, 16)}{t.job.scheduled_end ? `–${t.job.scheduled_end.slice(11, 16)}` : ""}
            </div>
          )}

          {/* Timeline */}
          {t.cancelled ? (
            <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm font-medium text-red-600">This job was cancelled.</p>
          ) : (
            <ol className="mt-5 space-y-3">
              {STEPS.map((s, i) => {
                const done = i < t.step, current = i === t.step
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs",
                      done ? "bg-emerald-500 text-white" : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {done ? <CheckCircle2 className="size-4" /> : i + 1}
                    </span>
                    <span className={cn("text-sm", current ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* On the way card */}
      {onTheWay && t.job.engineer_name && (
        <Card className="mb-4 border-amber-500/30">
          <CardContent className="flex items-center gap-3 p-4">
            <Truck className="size-5 text-amber-600" />
            <p className="text-sm"><span className="font-medium">{t.job.engineer_name}</span> {t.job.status === "on_site" ? "is on site." : "is on the way."}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice + pay */}
      {t.invoice && t.bank && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium"><BadgePoundSterling className="size-4" /> {t.invoice.status === "paid" ? "Paid" : "Amount due"}</span>
              <span className="font-mono text-lg font-semibold">{gbp(Number(t.invoice.total))}</span>
            </div>
            {t.invoice.status === "paid" ? (
              <p className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-center text-sm font-medium text-emerald-600">Paid — thank you!</p>
            ) : (
              <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">Pay by bank transfer</p>
                <p className="mt-1 text-muted-foreground">{t.bank.account_name} · Sort {t.bank.sort_code} · Acc {t.bank.account_number}</p>
                <p className="mt-1">Reference: <span className="font-mono font-semibold">{t.invoice.payment_reference}</span></p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quotes & invoices */}
      {t.documents.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <p className="mb-3 font-medium">Your quotes &amp; invoices</p>
            <div className="space-y-2">
              {t.documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{doc.kind} <span className="font-mono text-xs text-muted-foreground">{doc.number}</span></p>
                    <p className="text-xs capitalize text-muted-foreground">{doc.status}{doc.due_date ? ` · due ${doc.due_date}` : ""}</p>
                  </div>
                  <span className="font-mono font-semibold">{gbp(Number(doc.total))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave a review — only once the job is complete */}
      {t.completed && (
        <Card className="mb-4 border-amber-500/30">
          <CardContent className="p-5">
            <p className="mb-1 flex items-center gap-2 font-medium"><Star className="size-4 text-amber-500" /> {t.review ? "Your review" : "How did we do?"}</p>
            <p className="mb-3 text-sm text-muted-foreground">{t.review ? "Thanks for your feedback — you can update it any time." : "Your feedback helps us improve."}</p>
            <div className="mb-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (rating || t.review?.rating || 0) >= n
                return (
                  <button key={n} type="button" onClick={() => setRating(n)} className="transition-transform hover:scale-110" aria-label={`${n} star${n > 1 ? "s" : ""}`}>
                    <Star className={cn("size-8", active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                  </button>
                )
              })}
            </div>
            <Textarea rows={3} value={reviewBody || (rating ? "" : t.review?.body ?? "")} onChange={(e) => setReviewBody(e.target.value)} placeholder="Tell us about the work (optional)…" />
            <Button className="mt-2 w-full" onClick={submitReview} disabled={savingReview || !(rating || t.review?.rating)}>
              {savingReview ? <Loader2 className="animate-spin" /> : <Star className="size-4" />} {t.review ? "Update review" : "Submit review"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Message the office */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-2 flex items-center gap-2 font-medium"><Building2 className="size-4" /> Message the office</p>

          {/* Conversation history — kept so the customer always sees what they sent + replies */}
          {t.messages.length > 0 && (
            <div className="mb-3 space-y-2">
              {t.messages.map((m, i) => {
                const mine = m.direction === "inbound"
                return (
                  <div key={i} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground")}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={cn("mt-1 flex items-center gap-1 text-[11px]", mine ? "justify-end text-primary-foreground/70" : "text-muted-foreground")}>
                        {mine ? "You" : (m.from_name || t.company.company_name)} · {m.created_at?.slice(5, 16)}
                        {mine && (
                          <span title={m.acknowledged ? "Seen by the office" : "Delivered — awaiting the office"} className="ml-0.5">
                            {m.acknowledged ? "✓✓" : "✓"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ask a question or leave a note…" />
          <Button className="mt-2 w-full" onClick={sendMessage} disabled={sending || !msg.trim()}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />} Send
          </Button>
          {t.company.phone && <p className="mt-3 text-center text-xs text-muted-foreground">Or call {t.company.phone}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
