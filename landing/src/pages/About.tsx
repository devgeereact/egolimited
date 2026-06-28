import { CheckCircle2, Clock, MessageSquare, Wrench, Sparkles, Check, X } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { PageHero, Section, Eyebrow, BannerCtas } from "@/site/components/Bits"
import { AboutSplit, Counter } from "@/site/components/Sections"
import Seo from "@/site/components/Seo"
import { trust } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { img } from "@/site/images"

const brandPillars = [
  { icon: Clock, title: "Reliable", body: "We turn up when we say we will, and we finish what we start." },
  { icon: MessageSquare, title: "Straight", body: "Clear prices, plain language, and no surprises on the invoice." },
  { icon: Wrench, title: "Capable", body: "Broad skills across trades, plus the sense to know when a specialist is needed." },
  { icon: Sparkles, title: "Tidy", body: "We leave a property cleaner than we found it. The finish is part of the job." },
]
const values = ["Turn up when we say we will", "Quote the price before we start", "Finish the job, then clear up after", "Be honest when a job needs a specialist"]
const statusQuo = ["Calls and emails that go unanswered for days", "No-shows, missed slots, and no word either way", "Vague prices, then a surprise on the invoice", "Five different trades for five small jobs", "Mess left behind for you to clear up"]
const egoWay = ["One number, answered, for every job", "We attend in the window we agreed, every time", "A fixed price or clear estimate, in writing first", "One dependable contact across the whole property", "We tidy up properly before we leave"]

export default function About() {
  const company = useCompany()
  return (
    <>
      <Seo title="About EGO LTD — London Maintenance, No Runaround" description="EGO LTD is a London maintenance company that turns up, prices fairly and finishes the job. Repairs, upkeep and small works for homes and commercial." path="/about" />
      <PageHero eyebrow="About EGO" title="Maintenance without the runaround" intro={company.intro} actions={<BannerCtas secondaryTo="/services" secondaryLabel="See what we do" />} image={img.banner.about} />
      <Section muted>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>Why we exist</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">Why we do things differently</h2>
          <p className="mt-3 text-muted-foreground">Getting an ordinary job done should not be hard. The usual way wastes your time and your money. We built EGO to do the opposite.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">The usual runaround</div>
            <ul className="mt-5 space-y-3.5">
              {statusQuo.map((t) => (<li key={t} className="flex items-start gap-3 text-sm text-muted-foreground"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><X className="h-3 w-3" strokeWidth={3} /></span><span>{t}</span></li>))}
            </ul>
          </div>
          <div className="rounded-2xl border border-accent/40 bg-card p-7 shadow-sm shadow-accent/10 ring-1 ring-accent/20">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">The EGO way</div>
            <ul className="mt-5 space-y-3.5">
              {egoWay.map((t) => (<li key={t} className="flex items-start gap-3 text-sm"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><Check className="h-3 w-3" strokeWidth={3} /></span><span>{t}</span></li>))}
            </ul>
          </div>
        </div>
      </Section>
      <AboutSplit eyebrow="Our story" title="Built to do the opposite of the runaround" badge={{ value: "One", label: "Firm, every job" }}
        body={<><p>{company.name} started from a simple frustration: how hard it is to get someone reliable to do the ordinary jobs. The big firms chase big contracts. The small jobs, the awkward jobs, the urgent-but-not-glamorous jobs, get left for weeks.</p><p>We built EGO to be the opposite. One company that turns up, does the work properly, and tidies up after itself. We cover homes and commercial property, we are fully insured, and we are honest about the limits of our trade. If a job needs a certified specialist, we say so and arrange it.</p><p>We are not the cheapest, and we do not try to be. We are the firm you call when you want it done right, once.</p></>}
        points={values} cta={{ to: "/services", label: "See what we do" }} />
      <Counter />
      <Section muted>
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center">
          <Eyebrow>Our promise</Eyebrow>
          <p className="mt-4 font-serif text-xl font-bold leading-snug md:text-2xl">{company.promise}</p>
          <p className="mt-4 text-sm text-muted-foreground">Most maintenance firms cherry-pick. They want the big installs and the easy wins, and they leave the awkward half-day jobs unbooked for weeks. That gap is our position.</p>
        </div>
      </Section>
      <Section>
        <div className="mb-10"><Eyebrow>How we show up</Eyebrow><h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Four things we hold to on every job</h2></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {brandPillars.map((p) => (<div key={p.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground"><p.icon className="h-5 w-5" /></div><h3 className="mt-4 font-serif text-lg font-bold">{p.title}</h3><p className="mt-1.5 text-sm text-muted-foreground">{p.body}</p></div>))}
        </div>
      </Section>
      <Section muted>
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <h2 className="font-serif text-2xl font-bold">Insured and honest</h2>
          <Button asChild variant="ghost"><Link to="/accreditations">Trust & insurance</Link></Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {trust.map((a) => (<div key={a.name} className="flex items-start gap-3 rounded-xl border border-border bg-card p-5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><div className="font-semibold">{a.name}</div><div className="mt-1 text-sm text-muted-foreground">{a.meaning}</div></div></div>))}
        </div>
      </Section>
    </>
  )
}
