import { Link } from "react-router-dom"
import { ArrowRight, MapPin } from "lucide-react"
import { PageHero, Section, Reveal, Eyebrow, CtaBand } from "@/site/components/Bits"
import Seo, { breadcrumbLd } from "@/site/components/Seo"
import { areas } from "@/site/areas"
import { img } from "@/site/images"

export default function Areas() {
  return (
    <>
      <Seo title="Areas We Cover — Maintenance Across London — EGO LTD" description="EGO LTD covers maintenance, repairs and small works across North, South and East London. Find your area for one dependable contact and fair, fixed prices." path="/areas" jsonLd={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Areas", path: "/areas" }])} />
      <PageHero eyebrow="Where we work" title="Maintenance across London, by area" intro="One dependable contact for repairs, planned upkeep and the small jobs other firms turn down — wherever your property sits. Pick your area to see what we cover and how we work." image={img.banner.sectors} />
      <Section>
        <div className="mb-10 max-w-2xl"><Eyebrow>Service areas</Eyebrow><h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Find your part of London</h2><p className="mt-3 text-muted-foreground">Each area has its own mix of property — period terraces, conversions, new-builds and managed blocks — and we maintain all of them. More boroughs are being added; if yours isn't listed yet, just ask.</p></div>
        <div className="grid gap-6 md:grid-cols-3">
          {areas.map((a, i) => (
            <Reveal key={a.slug} delay={i * 0.05}>
              <Link to={`/areas/${a.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary"><span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground"><MapPin className="h-4 w-4" /></span>{a.region}</div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{a.cardBlurb}</p>
                <span className="mt-5 inline-flex items-center text-sm font-medium text-primary">Maintenance in {a.region}<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  )
}
