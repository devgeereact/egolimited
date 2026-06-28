import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, Info, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PageHero, Section, Reveal, Eyebrow, BannerCtas } from "@/site/components/Bits"
import { Counter } from "@/site/components/Sections"
import Seo, { breadcrumbLd } from "@/site/components/Seo"
import { services, packages, pricing, faqs } from "@/site/content"
import { serviceIcon } from "@/site/components/serviceIcons"
import { img, serviceImage } from "@/site/images"

export default function Services() {
  return (
    <>
      <Seo title="Maintenance Services in London — EGO LTD" description="Carpentry, plumbing, painting, tiling and planned upkeep for homes and commercial property across London. One firm, clear prices, work done properly." path="/services" jsonLd={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }])} />
      <PageHero eyebrow="Services & capabilities" title="One firm for the whole property" intro="Repairs, planned upkeep, and the small jobs other firms turn down. Whether you look after one home or a hundred units, you get a single dependable contact and work that is finished and tidied properly." actions={<BannerCtas secondaryTo="/sectors" secondaryLabel="Who we help" />} image={img.banner.services} />
      <Section>
        <div className="mb-10 max-w-2xl"><Eyebrow>What we cover</Eyebrow><h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">The full picture of what we take off your hands</h2></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => { const Icon = serviceIcon(s.slug); return (
            <Reveal key={s.slug} delay={i * 0.04}>
              <Link to={`/services/${s.slug}`} className="group block h-full">
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-md">
                  <div className="relative overflow-hidden">
                    <img src={serviceImage[s.slug]} alt="" className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    <div className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-lg bg-background/90 text-primary shadow-sm backdrop-blur transition-colors group-hover:bg-accent group-hover:text-accent-foreground"><Icon className="h-5 w-5" /></div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-serif text-lg font-bold group-hover:text-primary">{s.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
                    {s.goodToKnow && (<div className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-foreground"><Info className="h-3.5 w-3.5 text-accent-foreground" />{s.goodToKnow}</div>)}
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">Learn more<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </div>
              </Link>
            </Reveal>
          )})}
        </div>
        <p className="mt-8 max-w-3xl rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"><strong>Regulated trades:</strong> gas work is carried out only by Gas Safe registered engineers, and notifiable electrical work only by qualified electricians. Where a job needs a certified specialist, we arrange or recommend one rather than cut corners.</p>
      </Section>
      <Counter />
      <Section muted>
        <div className="mb-10 max-w-2xl"><Eyebrow>Service packages</Eyebrow><h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Pay as you go, or put us on a schedule</h2></div>
        <div className="grid gap-6 lg:grid-cols-3">
          {packages.map((p) => { const featured = Boolean(p.badge); return (
            <div key={p.name} className={"relative flex h-full flex-col rounded-2xl border p-7 " + (featured ? "border-accent bg-card shadow-lg shadow-accent/10 ring-1 ring-accent/30" : "border-border bg-card")}>
              {featured && (<span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-sm">{p.badge}</span>)}
              <h3 className="font-serif text-xl font-bold">{p.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
              <ul className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">{p.features.map((f) => (<li key={f} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{f}</span></li>))}</ul>
              <div className="flex-1" />
              <Button asChild variant={featured ? "default" : "outline"} className="mt-7 w-full"><Link to="/contact">Get a quote</Link></Button>
            </div>
          )})}
        </div>
        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><TrendingDown className="h-5 w-5" /></div>
          <div><h3 className="font-semibold">Why planned beats reactive</h3><p className="mt-1.5 text-sm text-muted-foreground">Unplanned emergency repairs typically cost several times more than the same work done on a planned schedule, once you add call-out premiums, rushed parts, and the knock-on damage of a failure. Planned upkeep is the cheapest maintenance there is.</p></div>
        </div>
      </Section>
      <Section>
        <div className="mb-10 max-w-2xl"><Eyebrow>How we price</Eyebrow><h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Honest and simple</h2><p className="mt-3 text-muted-foreground">We quote per job wherever we can, so you know the cost before we start. For open-ended work we charge by the hour or half-day at the rates below. These are indicative starting points; your actual quote depends on the job, the property, and the area.</p></div>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Basis</th><th className="px-5 py-3 font-semibold">Indicative rate</th><th className="hidden px-5 py-3 font-semibold sm:table-cell">Notes</th></tr></thead>
            <tbody className="divide-y divide-border">{pricing.map((r) => (<tr key={r.basis} className="bg-card"><td className="px-5 py-4 font-medium">{r.basis}</td><td className="px-5 py-4 font-mono text-primary">{r.rate}</td><td className="hidden px-5 py-4 text-muted-foreground sm:table-cell">{r.notes}</td></tr>))}</tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Indicative figures shown; replaced with EGO's own rates. Materials are itemised on the invoice with receipts available.</p>
      </Section>
      <Section muted>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center"><Eyebrow>Common questions</Eyebrow><h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Everything else you might be wondering</h2></div>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((f, i) => (<AccordionItem key={f.q} value={`faq-${i}`} className="rounded-2xl border border-border bg-card px-5 shadow-sm"><AccordionTrigger className="text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger><AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent></AccordionItem>))}
          </Accordion>
        </div>
      </Section>
    </>
  )
}
