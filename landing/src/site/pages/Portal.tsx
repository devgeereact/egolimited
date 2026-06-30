import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  Loader2,
  Mail,
  CheckCircle2,
  Wrench,
  Receipt,
  AlertCircle,
  FileText,
  FileDown,
  FileSignature,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { PageHero, Section } from "@/site/components/Bits"
import { img } from "@/site/images"
import Seo from "@/site/components/Seo"

interface PortalJob {
  id: number
  title: string
  status: string
  priority?: string
  scheduled_for: string | null
}
interface PortalQuote {
  id: number
  title: string
  status: string
  total_pence: number
  created_at: string
}
interface PortalInvoice {
  id: number
  number: string
  status: string
  subtotal_pence: number
  vat_pence: number
  total_pence: number
  due_date: string | null
  created_at: string
  items: { description: string; qty: number; unit_pence: number }[]
}
interface PortalData {
  client: { name: string }
  jobs: PortalJob[]
  quotes: PortalQuote[]
  invoices: PortalInvoice[]
  payee?: Record<string, string>
}

// The visible life of a job, in order. A cancelled job is shown apart.
const JOB_STAGES = ["booked", "en_route", "on_site", "done"] as const
const STAGE_LABEL: Record<string, string> = {
  booked: "Booked",
  en_route: "On the way",
  on_site: "On site",
  done: "Done",
}

const gbp = (p: number) =>
  "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const when = (iso: string | null) => {
  if (!iso) return "—"
  const d = new Date(iso.replace(" ", "T"))
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
const pill = (s: string) =>
  s === "paid" || s === "done"
    ? "bg-success-soft text-success"
    : s === "overdue" || s === "cancelled"
      ? "bg-destructive/15 text-destructive"
      : "bg-primary/15 text-primary"

export default function Portal() {
  const [params] = useSearchParams()
  const token = params.get("t")

  // The access token rides in the URL (?t=…). Force a no-referrer policy while
  // this page is mounted so the token can't leak to third parties via the
  // Referer header on outbound links or externally-loaded resources.
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "referrer"
    meta.content = "no-referrer"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  // Request-link state
  const [email, setEmail] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [sent, setSent] = useState(false)

  // Account-view state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PortalData | null>(null)

  // Raise-a-request state
  const [reqMsg, setReqMsg] = useState("")
  const [reqSending, setReqSending] = useState(false)
  const [reqSent, setReqSent] = useState(false)

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!reqMsg.trim()) {
      toast.error("Describe what you need")
      return
    }
    setReqSending(true)
    try {
      await api.post("portal.php", { t: token, action: "request", message: reqMsg })
      setReqSent(true)
      setReqMsg("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your request")
    } finally {
      setReqSending(false)
    }
  }

  // Quote decision state — which quote is mid-request.
  const [quoting, setQuoting] = useState<number | null>(null)
  // Binding acceptance: which quote's accept form is open, plus the name + terms.
  const [acceptingId, setAcceptingId] = useState<number | null>(null)
  const [acceptName, setAcceptName] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)

  function resetAccept() {
    setAcceptingId(null)
    setAcceptName("")
    setAcceptTerms(false)
  }

  async function confirmApproval(q: PortalQuote) {
    if (!acceptName.trim() || !acceptTerms) return
    setQuoting(q.id)
    try {
      await api.post("portal.php", {
        t: token,
        action: "quote",
        quote_id: q.id,
        decision: "approved",
        accepted_by: acceptName.trim(),
        accepted_terms: true,
      })
      toast.success("Quote approved, thank you!")
      resetAccept()
      load(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the quote")
    } finally {
      setQuoting(null)
    }
  }

  function load(showSpinner = true) {
    if (!token) return
    if (showSpinner) setLoading(true)
    setError(null)
    api
      .get<PortalData>(`portal.php?t=${encodeURIComponent(token)}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your account"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function decideQuote(q: PortalQuote, decision: "approved" | "declined") {
    setQuoting(q.id)
    try {
      await api.post("portal.php", { t: token, action: "quote", quote_id: q.id, decision })
      toast.success(decision === "approved" ? "Quote approved, thank you!" : "Quote declined")
      load(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the quote")
    } finally {
      setQuoting(null)
    }
  }

  async function downloadInvoice(inv: PortalInvoice) {
    const { documentPdf, payeeFromSettings } = await import("@/app/lib/pdf")
    documentPdf({
      kind: "Invoice",
      number: inv.number,
      clientName: data?.client.name ?? "",
      date: inv.created_at,
      dueDate: inv.due_date,
      items: inv.items,
      subtotalPence: inv.subtotal_pence,
      vatPence: inv.vat_pence,
      totalPence: inv.total_pence,
      payee: payeeFromSettings(data?.payee),
    })
  }

  async function downloadStatement() {
    if (!data) return
    const { statementPdf, payeeFromSettings } = await import("@/app/lib/pdf")
    statementPdf({
      clientName: data.client.name,
      rows: data.invoices.map((i) => ({
        number: i.number,
        date: i.created_at,
        status: i.status,
        totalPence: i.total_pence,
      })),
      outstandingPence: data.invoices
        .filter((i) => i.status !== "paid")
        .reduce((s, i) => s + i.total_pence, 0),
      payee: payeeFromSettings(data.payee),
    })
  }

  async function requestLink(e: React.FormEvent) {
    e.preventDefault()
    setRequesting(true)
    try {
      await api.post("portal.php", { email })
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setRequesting(false)
    }
  }

  return (
    <>
      <Seo
        title="Your account · EGO LTD"
        description="View your EGO jobs, invoices and statements. Enter your email to get a secure link."
        path="/portal"
      />
      <PageHero
        eyebrow="Your account"
        title={data ? `Welcome back, ${data.client.name.split(" ")[0]}` : "Your EGO account"}
        intro={
          token
            ? "Your jobs and invoices with EGO."
            : "Enter your email and we'll send you a secure link to view your jobs, invoices and statements. No password needed."
        }
        image={img.banner.about}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          {/* Request a link */}
          {!token && (
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm">
              {sent ? (
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <h2 className="font-serif text-lg font-bold">Check your inbox</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    If that email is on our records, we've sent a secure link to view
                    your account. It works for 7 days.
                  </p>
                </div>
              ) : (
                <form onSubmit={requestLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={requesting}>
                    {requesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Send my secure link
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Account view */}
          {token && loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading your account…
            </div>
          )}
          {token && error && (
            <div className="mx-auto max-w-md rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-center text-sm text-destructive">
              <AlertCircle className="mx-auto mb-2 h-6 w-6" />
              {error}
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <a href="/portal">Request a new link</a>
                </Button>
              </div>
            </div>
          )}

          {token && data && (
            <div className="space-y-8">
              {/* At a glance */}
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Open jobs",
                    value: data.jobs.filter((j) => !["done", "invoiced", "cancelled"].includes(j.status)).length,
                  },
                  {
                    label: "Quotes to review",
                    value: data.quotes.filter((q) => q.status === "sent").length,
                  },
                  {
                    label: "Amount to pay",
                    value: gbp(
                      data.invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total_pence, 0),
                    ),
                  },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {c.label}
                    </div>
                    <div className="mt-1.5 font-serif text-[1.6rem] font-bold leading-none tracking-tight tabular-nums">
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI support assistant */}
              <SupportChat token={token} />

              {/* Raise a request */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-serif text-lg font-bold">Need something doing?</h2>
                {reqSent ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Thanks, we've got your request and will be in touch shortly.
                  </p>
                ) : (
                  <form onSubmit={submitRequest} className="mt-3 space-y-3">
                    <Textarea
                      rows={3}
                      placeholder="Tell us what needs doing and we'll come back with a price and a date."
                      value={reqMsg}
                      onChange={(e) => setReqMsg(e.target.value)}
                    />
                    <Button type="submit" disabled={reqSending}>
                      {reqSending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wrench className="mr-2 h-4 w-4" />
                      )}
                      Send request
                    </Button>
                  </form>
                )}
              </div>

              {/* Jobs */}
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-bold">
                  <Wrench className="h-5 w-5 text-primary" /> Your jobs
                </h2>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  {data.jobs.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">No jobs on record.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {data.jobs.map((j) => (
                        <li key={j.id} className="px-5 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{j.title}</div>
                              <div className="text-xs text-muted-foreground">{when(j.scheduled_for)}</div>
                            </div>
                            <span className={"shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize " + pill(j.status)}>
                              {j.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          {j.status !== "cancelled" && <JobTimeline status={j.status} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Quotes */}
              {data.quotes && data.quotes.length > 0 && (
                <div>
                  <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-bold">
                    <FileSignature className="h-5 w-5 text-primary" /> Your quotes
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <ul className="divide-y divide-border">
                      {data.quotes.map((q) => (
                        <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{q.title}</div>
                            <div className="text-xs text-muted-foreground">{when(q.created_at)}</div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-semibold tabular-nums">{gbp(q.total_pence)}</span>
                            {q.status === "sent" ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  disabled={quoting === q.id}
                                  onClick={() => {
                                    resetAccept()
                                    setAcceptingId(q.id)
                                  }}
                                >
                                  <ThumbsUp className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={quoting === q.id}
                                  onClick={() => decideQuote(q, "declined")}
                                >
                                  <ThumbsDown className="mr-1 h-4 w-4" />
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize " + pill(q.status)}>
                                {q.status}
                              </span>
                            )}
                          </div>
                          {acceptingId === q.id && (
                            <div className="w-full space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                              <div className="space-y-1.5">
                                <Label htmlFor={`accept-name-${q.id}`} className="text-sm">
                                  Type your full name to accept
                                </Label>
                                <Input
                                  id={`accept-name-${q.id}`}
                                  value={acceptName}
                                  onChange={(e) => setAcceptName(e.target.value)}
                                  placeholder="Your full name"
                                  className="h-10 max-w-sm"
                                />
                              </div>
                              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={acceptTerms}
                                  onChange={(e) => setAcceptTerms(e.target.checked)}
                                  className="mt-1 h-4 w-4 accent-primary"
                                />
                                <span>
                                  I confirm I'm authorised to accept this quote of {gbp(q.total_pence)} and I agree to the terms and conditions.
                                </span>
                              </label>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={!acceptName.trim() || !acceptTerms || quoting === q.id}
                                  onClick={() => confirmApproval(q)}
                                >
                                  {quoting === q.id ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  ) : (
                                    <ThumbsUp className="mr-1 h-4 w-4" />
                                  )}
                                  Confirm approval
                                </Button>
                                <Button size="sm" variant="ghost" disabled={quoting === q.id} onClick={resetAccept}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Invoices */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
                    <Receipt className="h-5 w-5 text-primary" /> Your invoices
                  </h2>
                  {data.invoices.length > 0 && (
                    <Button variant="outline" size="sm" onClick={downloadStatement}>
                      <FileText className="mr-1 h-4 w-4" /> Statement PDF
                    </Button>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  {data.invoices.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">No invoices on record.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {data.invoices.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <div className="truncate font-mono text-sm font-medium">{inv.number}</div>
                            <div className="text-xs text-muted-foreground">
                              {inv.due_date ? `Due ${when(inv.due_date)}` : when(inv.created_at)}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-semibold tabular-nums">{gbp(inv.total_pence)}</span>
                            <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize " + pill(inv.status)}>
                              {inv.status}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Download PDF"
                              onClick={() => downloadInvoice(inv)}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>
    </>
  )
}

// AI support assistant — answers from the customer's own account data via the
// token-scoped portal.php `support` action (server-side OpenRouter key).
interface ChatTurn {
  role: "user" | "assistant"
  content: string
}
function SupportChat({ token }: { token: string }) {
  const [msgs, setMsgs] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help with your jobs, quotes and invoices. Ask me anything, for example 'do I owe anything?' or 'what's the status of my boiler job?'",
    },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    const history = msgs.slice(1).map((m) => ({ role: m.role, content: m.content }))
    setMsgs((m) => [...m, { role: "user", content }])
    setInput("")
    setBusy(true)
    try {
      const res = await api.post<{ reply: string }>("portal.php", {
        t: token,
        action: "support",
        message: content,
        history,
      })
      setMsgs((m) => [...m, { role: "assistant", content: res.reply || "Sorry, I couldn't answer that." }])
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't answer just now. Email hello@egolimited.com and we'll help." },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-serif text-base font-bold">Ask EGO support assistant</h2>
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto px-5 py-4">
        {msgs.map((m, i) => (
          <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed " +
                (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">Thinking…</div>
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          placeholder="Type your question…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <Button size="icon" onClick={() => send()} disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// A compact stepper showing where a job is in its life. `invoiced` reads as
// past `done`, so the whole track is complete.
function JobTimeline({ status }: { status: string }) {
  const current = status === "invoiced" ? JOB_STAGES.length - 1 : JOB_STAGES.indexOf(status as (typeof JOB_STAGES)[number])
  const reached = current < 0 ? 0 : current
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {JOB_STAGES.map((stage, i) => {
        const active = i <= reached
        return (
          <div key={stage} className="flex flex-1 items-center gap-1.5">
            <span
              className={
                "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold " +
                (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
              }
            >
              {i + 1}
            </span>
            <span
              className={
                "hidden whitespace-nowrap text-[11px] sm:inline " +
                (i === reached ? "font-semibold text-foreground" : "text-muted-foreground")
              }
            >
              {STAGE_LABEL[stage]}
            </span>
            {i < JOB_STAGES.length - 1 && (
              <span className={"h-px flex-1 " + (i < reached ? "bg-primary" : "bg-border")} />
            )}
          </div>
        )
      })}
    </div>
  )
}
