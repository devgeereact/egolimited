import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Loader2,
  Search,
  CalendarClock,
  HardHat,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRight,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { PageHero, Section, Eyebrow } from "@/site/components/Bits"
import { img } from "@/site/images"
import Seo from "@/site/components/Seo"
import { useCompany } from "@/site/CompanyProvider"

interface TrackResult {
  reference: string
  title: string
  status: string
  status_label: string
  step: number
  stages: string[]
  scheduled_for: string | null
  engineer: string | null
  updated_at: string | null
  cancelled: boolean
  portal_url: string
}

function fmt(dt: string | null): string {
  if (!dt) return "To be confirmed"
  const d = new Date(dt.replace(" ", "T"))
  if (isNaN(d.getTime())) return dt
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function Track() {
  const company = useCompany()
  const [reference, setReference] = useState("")
  const [surname, setSurname] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TrackResult | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const r = await api.post<TrackResult>("/api/track/lookup", {
        reference: reference.trim(),
        surname: surname.trim(),
      })
      setResult(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that job.")
    } finally {
      setBusy(false)
    }
  }

  // Server returns the canonical stage list + the current step index.
  const stages = result?.stages ?? []
  const currentIndex = result?.step ?? -1
  const cancelled = result?.cancelled ?? false

  return (
    <>
      <Seo
        title="Track a Job — EGO LTD Maintenance, London"
        description="Enter your job reference and surname to see live status on your EGO LTD maintenance job. Quick, and no login needed."
        path="/track"
      />
      <PageHero
        eyebrow="Track a job"
        title="Where's my job up to?"
        intro="Enter your job reference and the surname on the booking to see live status. No login needed."
        image={img.banner.contact}
      />
      <Section>
        <div className="mx-auto max-w-2xl">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reference">Job reference</Label>
                <Input
                  id="reference"
                  placeholder="e.g. EGO-AZYHE1"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname on the booking</Label>
                <Input
                  id="surname"
                  placeholder="e.g. Okafor"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" size="lg" className="mt-6" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {busy ? "Checking" : "Check status"}
            </Button>
          </form>

          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-muted/40 px-6 py-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {result.reference}
                </div>
                <h2 className="mt-1 font-serif text-xl font-bold">{result.title}</h2>
                <div className="mt-1 text-sm font-medium text-primary">
                  {result.status_label}
                </div>
              </div>

              <div className="px-6 py-6">
                {cancelled ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    This job has been cancelled. Please contact us if that's
                    unexpected.
                  </p>
                ) : (
                  <ol className="space-y-0">
                    {stages.map((label, i) => {
                      const done = i < currentIndex
                      const active = i === currentIndex
                      return (
                        <li key={label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : active ? (
                              <span className="relative flex h-5 w-5 items-center justify-center">
                                <span className="absolute h-5 w-5 animate-ping rounded-full bg-primary/40" />
                                <span className="relative h-3 w-3 rounded-full bg-primary" />
                              </span>
                            ) : (
                              <Circle className="h-5 w-5 text-border" />
                            )}
                            {i < stages.length - 1 && (
                              <span
                                className={
                                  "my-1 w-0.5 flex-1 " +
                                  (i < currentIndex ? "bg-primary" : "bg-border")
                                }
                              />
                            )}
                          </div>
                          <div className="pb-6">
                            <div
                              className={
                                "text-sm font-medium " +
                                (active || done
                                  ? "text-foreground"
                                  : "text-muted-foreground")
                              }
                            >
                              {label}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}

                <div className="mt-2 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Scheduled:</span>
                    <span className="font-medium">{fmt(result.scheduled_for)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <HardHat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Engineer:</span>
                    <span className="font-medium">
                      {result.engineer ?? "Being assigned"}
                    </span>
                  </div>
                </div>

                {/* Direct, one-tap route into the customer's own portal — full
                    detail, documents, invoices and a secure message thread. */}
                {result.portal_url && (
                  <div className="mt-5 flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      <div className="font-semibold">Open your customer portal</div>
                      <div className="text-muted-foreground">
                        See full detail, documents and invoices, and message us about this job.
                      </div>
                    </div>
                    <Button asChild size="sm" className="shrink-0">
                      <a href={result.portal_url}>
                        Go to my portal
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
                {result.updated_at && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last updated {fmt(result.updated_at)}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* What the statuses mean */}
          <div className="mt-14">
            <Eyebrow>What the statuses mean</Eyebrow>
            <h2 className="mt-3 font-serif text-2xl font-bold">
              Every stage of your job, explained
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Booked in", body: "We have your job logged and are preparing your quote." },
                { label: "Scheduled", body: "Your quote is approved and we have set an engineer and a slot." },
                { label: "En route", body: "Your engineer is on the way to the property within the agreed window." },
                { label: "On site", body: "We are at the property carrying out the work, and will flag anything unexpected before doing it." },
                { label: "Completed", body: "The work is done, the area is tidied, and we have confirmed you are happy with it." },
                { label: "Invoiced", body: "A clear, itemised invoice has been sent, with payment details and terms on it." },
                { label: "Paid", body: "Payment is settled and the job is closed. Thanks for choosing EGO." },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="flex gap-4 rounded-xl border border-border bg-card p-5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold">{s.label}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Help fallback */}
          <div className="mt-10 rounded-2xl border border-border bg-secondary/40 p-7 text-center">
            <h2 className="font-serif text-lg font-bold">Can't find your job?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Check the reference and the surname match your booking confirmation.
              If it still will not show, we are happy to look it up for you.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${company.phone.replace(/\s/g, "")}`}>
                  <Phone className="mr-1.5 h-4 w-4" />
                  {company.phone}
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
