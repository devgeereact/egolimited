import { createElement } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, ArrowRight, Info, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHero, Section, BannerCtas } from "@/site/components/Bits"
import Seo, { serviceLd, breadcrumbLd } from "@/site/components/Seo"
import { services, process, serviceSeo } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { serviceIcon } from "@/site/components/serviceIcons"
import { serviceImage } from "@/site/images"
import NotFound from "./NotFound"

export default function ServiceDetail() {
  const company = useCompany()
  const { slug } = useParams()
  const service = services.find((s) => s.slug === slug)
  if (!service) return <NotFound />
  const others = services.filter((s) => s.slug !== slug).slice(0, 3)
  const seo = serviceSeo[service.slug]
  const servicePath = `/services/${service.slug}`
  return (
    <>
      <Seo title={seo?.title ?? `${service.name} in London`} description={seo?.description ?? service.summary} path={servicePath}
        jsonLd={[serviceLd({ name: service.name, description: seo?.description ?? service.summary, path: servicePath }), breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: service.name, path: servicePath }])]} />
      <PageHero eyebrow="Service" title={service.name} intro={service.summary} actions={<BannerCtas secondaryTo="/services" secondaryLabel="All services" />} image={serviceImage[service.slug]} />
      <Section>
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2"><Link to="/services"><ArrowLeft className="mr-1 h-4 w-4" />All services</Link></Button>
            <div className="relative mb-8 overflow-hidden rounded-2xl border border-border shadow-sm">
              <img src={serviceImage[service.slug]} alt={service.name} className="aspect-[16/8] w-full object-cover" loading="lazy" />
              <div className="absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-xl bg-background/90 text-primary shadow-sm backdrop-blur">{createElement(serviceIcon(service.slug), { className: "h-6 w-6" })}</div>
            </div>
            <div className="space-y-4 text-muted-foreground">{service.body.map((p, i) => (<p key={i} className="text-base leading-relaxed">{p}</p>))}</div>
            {service.goodToKnow && (<div className="mt-6 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><strong>Good to know:</strong> {service.goodToKnow}</span></div>)}
            <div className="mt-10">
              <h2 className="font-serif text-xl font-bold">How it works</h2>
              <ol className="mt-4 grid gap-4 sm:grid-cols-2">{process.map((step) => (<li key={step.n} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="font-serif text-2xl font-bold text-accent">{step.n}</div><div className="mt-2 font-semibold">{step.title}</div><p className="mt-1 text-sm text-muted-foreground">{step.body}</p></li>))}</ol>
            </div>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-secondary/40 p-7">
              <h3 className="font-semibold">What you get</h3>
              <ul className="mt-4 space-y-3">{service.points.map((p) => (<li key={p} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{p}</span></li>))}</ul>
              <Button asChild className="mt-6 w-full"><Link to="/contact">Get a quote</Link></Button>
              <a href={`tel:${company.phone.replace(/\s/g, "")}`} className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary"><Phone className="h-4 w-4" />{company.phone}</a>
              <p className="mt-5 border-t border-border/70 pt-4 text-center text-sm text-muted-foreground">Covering <Link to="/areas" className="font-medium text-primary hover:underline">North, South &amp; East London</Link>.</p>
            </div>
          </aside>
        </div>
      </Section>
      <Section muted>
        <h2 className="mb-6 font-serif text-2xl font-bold">Other services</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {others.map((s) => (<Link key={s.slug} to={`/services/${s.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><img src={serviceImage[s.slug]} alt="" className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /><div className="p-6"><h3 className="font-semibold group-hover:text-primary">{s.name}</h3><p className="mt-2 text-sm text-muted-foreground line-clamp-2">{s.summary}</p><span className="mt-4 inline-flex items-center text-sm font-medium text-primary">Learn more<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></Link>))}
        </div>
      </Section>
    </>
  )
}
