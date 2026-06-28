import { ShieldCheck, FileText, BadgeCheck, Scale, CheckCircle2, Flame, Zap, HardHat, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { PageHero, Section, Eyebrow, BannerCtas } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { trust, proofPoints } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { img } from "@/site/images"

const regulated = [
  { icon: Flame, title: "Gas work", body: "Anything touching the gas supply is carried out only by a Gas Safe registered engineer. We arrange or recommend one rather than touch it ourselves." },
  { icon: Zap, title: "Notifiable electrical work", body: "Notifiable electrical work is done by a qualified, registered electrician who can certify it. We handle minor, non-notifiable jobs ourselves." },
  { icon: HardHat, title: "Specialist trades", body: "Where a job needs a roofer, a structural specialist, or another certified trade, we tell you straight and point you to the right people." },
]

export default function Accreditations() {
  const company = useCompany()
  return (
    <>
      <Seo title="Insurance & Accreditations — EGO LTD, London" description="Properly insured, fully accountable maintenance across London. See EGO LTD's cover, standards and the commitments you can hold us to." path="/accreditations" />
      <PageHero eyebrow="Trust & insurance" title="Honest about the work, and honest about its limits" intro="Maintenance carries real duties. We are clear about what we cover, what we insure, and where we bring in a certified specialist. We would rather tell you straight than overpromise." actions={<BannerCtas secondaryTo="/contact" secondaryLabel="Request our certificate" />} image={img.banner.trust} />
      <Section>
        <div className="mb-10 max-w-2xl"><Eyebrow>What you can rely on</Eyebrow><h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">Four things that sit behind every job</h2></div>
        <div className="grid gap-6 md:grid-cols-2">{trust.map((a, i) => { const Icon = [ShieldCheck, FileText, BadgeCheck, Scale][i] ?? ShieldCheck; return (<div key={a.name} className="rounded-2xl border border-border bg-card p-7"><div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></div><h2 className="mt-4 font-serif text-xl font-bold">{a.name}</h2><p className="mt-2 leading-relaxed text-muted-foreground">{a.meaning}</p></div>) })}</div>
      </Section>
      <Section muted>
        <div className="grid items-center gap-10 rounded-3xl border border-border bg-card p-8 md:grid-cols-2 md:p-12">
          <div><Eyebrow>Insurance</Eyebrow><h2 className="mt-3 font-serif text-2xl font-bold md:text-3xl">Public liability cover, in place on every job</h2><p className="mt-4 leading-relaxed text-muted-foreground">We carry public liability insurance that is active on every job we attend, covering the work we do at your property. We are happy to send the current certificate before we start, so you have it on record.</p><Button asChild className="mt-6"><Link to="/contact">Request our certificate<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
          <ul className="grid gap-3">{["Public liability cover active on every job", "Current certificate available on request", "Clear, written prices before we start", "A record kept of the work at each property"].map((p) => (<li key={p} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-5 text-sm"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><span>{p}</span></li>))}</ul>
        </div>
      </Section>
      <Section>
        <div className="mb-10 max-w-2xl"><Eyebrow>Regulated work</Eyebrow><h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">Where we bring in a certified specialist</h2><p className="mt-3 text-muted-foreground">Some work must, by law, be done by a registered professional. We do not cut corners on it. Here is exactly what we hand over, and to whom.</p></div>
        <div className="grid gap-6 md:grid-cols-3">{regulated.map((r) => (<div key={r.title} className="rounded-2xl border border-border bg-card p-7"><div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground"><r.icon className="h-5 w-5" /></div><h3 className="mt-4 font-serif text-lg font-bold">{r.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p></div>))}</div>
      </Section>
      <Section muted>
        <div className="mx-auto max-w-3xl">
          <Eyebrow>What you can hold us to</Eyebrow>
          <h2 className="mt-3 font-serif text-2xl font-bold">The promises we make, and keep, on every job</h2>
          <p className="mt-2 text-muted-foreground">Plain commitments, not marketing. If we ever fall short, tell us and we will put it right.</p>
          <ul className="mt-6 grid gap-3">{proofPoints.map((p) => (<li key={p} className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-sm"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><span>{p}</span></li>))}</ul>
          <div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link to="/contact">Get a quote</Link></Button><Button asChild variant="outline"><Link to="/services">See what we cover</Link></Button></div>
          <p className="mt-6 text-sm text-muted-foreground">Questions about our cover or qualifications? Email <a href={`mailto:${company.email}`} className="font-medium text-primary hover:text-accent">{company.email}</a> and we will send what you need.</p>
        </div>
      </Section>
    </>
  )
}
