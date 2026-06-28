import { Fragment } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHero, Section, CtaBand } from "@/site/components/Bits"
import Seo, { localBusinessLd, serviceLd, breadcrumbLd } from "@/site/components/Seo"
import { process } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { areas, areaBySlug } from "@/site/areas"
import { img } from "@/site/images"
import NotFound from "./NotFound"

export default function AreaDetail() {
  const company = useCompany()
  const tel = company.phone.replace(/\s/g, "")
  const { slug } = useParams()
  const area = areaBySlug(slug)
  if (!area) return <NotFound />
  const path = `/areas/${area.slug}`
  const others = areas.filter((a) => a.slug !== area.slug)
  return (
    <>
      <Seo title={area.seoTitle} description={area.seoDescription} path={path}
        jsonLd={[localBusinessLd({ name: `EGO LTD — ${area.region}`, description: area.seoDescription, path, areaServed: [area.region, ...area.boroughs] }),
          serviceLd({ name: `Property maintenance in ${area.region}`, description: area.seoDescription, path, areaServed: area.region }),
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "Areas", path: "/areas" }, { name: area.region, path }])]} />
      <PageHero eyebrow="Service area" title={`Maintenance across ${area.region}, done properly`} intro={area.intro}
        actions={<>
          <Button asChild size="lg" className="w-full bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 sm:w-auto"><Link to="/contact">Get a free quote<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          <Button asChild size="lg" variant="outline" className="w-full border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white sm:w-auto"><a href={`tel:${tel}`}><Phone className="mr-1.5 h-4 w-4" />{company.phone}</a></Button>
        </>} image={img.banner.sectors} />
      <Section>
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2"><Link to="/areas"><ArrowLeft className="mr-1 h-4 w-4" />All areas</Link></Button>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="space-y-12 lg:col-span-2">
            <div>
              <h2 className="font-serif text-2xl font-bold">What we do across {area.region}</h2>
              <ul className="mt-5 space-y-4">{area.services.map((s, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" /><p className="text-sm leading-relaxed text-muted-foreground">{s.links.map((l, j) => (<Fragment key={l.to}>{j > 0 && " and "}<Link to={l.to} className="font-semibold text-foreground hover:text-primary">{l.label}</Link></Fragment>))} — {s.text}</p></li>))}</ul>
            </div>
            <div><h2 className="font-serif text-2xl font-bold">Areas we cover</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{area.coverageIntro} {area.coverageCta.pre}<Link to="/contact" className="font-medium text-primary hover:underline">{area.coverageCta.linkLabel}</Link>{area.coverageCta.post}</p></div>
            <div><h2 className="font-serif text-2xl font-bold">{area.builtHeading}</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{area.builtBody}</p>{area.insuredLink && (<p className="mt-3 text-sm"><Link to="/accreditations" className="font-medium text-primary hover:underline">See our cover and accreditations</Link></p>)}</div>
            <div><h2 className="font-serif text-2xl font-bold">How it works</h2><ol className="mt-4 grid gap-4 sm:grid-cols-2">{process.map((step) => (<li key={step.n} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="font-serif text-2xl font-bold text-accent">{step.n}</div><div className="mt-2 font-semibold">{step.title}</div><p className="mt-1 text-sm text-muted-foreground">{step.body}</p></li>))}</ol></div>
            <div><h2 className="font-serif text-2xl font-bold">Who we help in {area.region}</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground"><Link to="/sectors" className="font-medium text-foreground hover:text-primary">Homeowners</Link>, landlords, <Link to="/sectors" className="font-medium text-foreground hover:text-primary">letting and managing agents</Link>, and {area.whoSuffix}</p></div>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-secondary/40 p-7">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary"><MapPin className="h-4 w-4 text-accent" />{area.region}</div>
              <h3 className="mt-3 font-serif text-lg font-bold">Need something fixed in {area.region}?</h3>
              <p className="mt-2 text-sm text-muted-foreground">Call, email, or send a few details and photos. You get a clear price and a date we can keep.</p>
              <Button asChild className="mt-5 w-full"><Link to="/contact">Get a free quote</Link></Button>
              <a href={`tel:${tel}`} className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary"><Phone className="h-4 w-4" />{company.phone}</a>
              <a href={`mailto:${company.email}`} className="mt-2 block text-center text-sm text-muted-foreground hover:text-primary">{company.email}</a>
            </div>
          </aside>
        </div>
      </Section>
      <Section muted>
        <h2 className="mb-6 font-serif text-2xl font-bold">Other areas we cover</h2>
        <div className="grid gap-5 md:grid-cols-3">{others.map((a) => (<Link key={a.slug} to={`/areas/${a.slug}`} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"><div className="flex items-center gap-2 text-sm font-semibold text-primary"><MapPin className="h-4 w-4 text-accent" />{a.region}</div><p className="mt-2 text-sm text-muted-foreground line-clamp-3">{a.cardBlurb}</p><span className="mt-4 inline-flex items-center text-sm font-medium text-primary">Maintenance in {a.region}<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>))}</div>
      </Section>
      <CtaBand />
    </>
  )
}
