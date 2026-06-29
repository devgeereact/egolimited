import { Link } from "react-router-dom"
import {
  AlertCircle,
  CheckCircle2,
  Home,
  Building,
  Building2,
  Briefcase,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHero, Section, Eyebrow, BannerCtas } from "@/site/components/Bits"
import { Reviews } from "@/site/components/Sections"
import Seo from "@/site/components/Seo"
import { sectors, process } from "@/site/content"
import { img, sectorImage } from "@/site/images"

// One clean icon per audience, in the same order as the sectors data.
const sectorIcons = [Home, Building, Briefcase, Building2]

export default function Sectors() {
  return (
    <>
      <Seo
        title="Maintenance for Landlords, Agents & More — EGO LTD"
        description="Reliable maintenance for homeowners, landlords, letting agents and commercial sites across London. One dependable contact for the whole property."
        path="/sectors"
      />
      <PageHero
        eyebrow="Who we help"
        title="One contractor for the people who run property"
        intro="Homeowners, landlords, letting and managing agents, and commercial and facilities teams. The work is held to the same standard whoever holds the keys. Here is what each one tends to worry about, and what we lead with."
        actions={<BannerCtas secondaryTo="/services" secondaryLabel="What we cover" />}
        image={img.banner.sectors}
      />

      {/* Audience cards */}
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {sectors.map((s, i) => {
            const Icon = sectorIcons[i] ?? Home
            return (
              <div
                key={s.name}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={sectorImage[s.name]}
                    alt=""
                    className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-[hsl(60_2%_9%)]/90 to-transparent p-5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-serif text-xl font-bold text-white">
                      {s.name}
                    </h2>
                  </div>
                </div>

                <div className="mx-7 mt-5 rounded-xl border border-warning/20 bg-warning-soft/50 p-4 text-sm">
                  <div className="flex items-start gap-2 text-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>
                      <span className="font-semibold">What they worry about:</span>{" "}
                      <span className="text-muted-foreground">{s.worry}</span>
                    </span>
                  </div>
                </div>

                <p className="mt-4 px-7 text-sm leading-relaxed text-muted-foreground">
                  {s.blurb}
                </p>

                <ul className="mx-7 mb-7 mt-5 grid gap-2.5 border-t border-border pt-5 text-sm">
                  {s.provides.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-muted-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </Section>

      {/* How working with us looks */}
      <Section muted>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            The same simple process, whatever you manage
          </h2>
          <p className="mt-3 text-muted-foreground">
            One property or a hundred, the steps are the same: tell us what needs
            doing, get a clear price and a date, and we turn up and do it
            properly.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {process.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="font-serif text-3xl font-bold text-accent">
                {step.n}
              </div>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Portfolio reassurance */}
      <Section>
        <div className="grid items-center gap-10 rounded-3xl border border-border bg-secondary/40 p-8 md:grid-cols-2 md:p-12">
          <div>
            <Eyebrow>Across a portfolio</Eyebrow>
            <h2 className="mt-3 font-serif text-2xl font-bold md:text-3xl">
              One contact for every property you hold
            </h2>
            <p className="mt-4 text-muted-foreground">
              For landlords, agents, and facilities teams we keep a clear record
              of the work at each address, handle reactive repairs at a preferred
              rate between scheduled visits, and report back so you always know
              what was done and why.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/contact">
                  Talk to us about your portfolio
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/services">See what we cover</Link>
              </Button>
            </div>
          </div>
          <ul className="grid gap-3">
            {[
              "A planned schedule built around each building",
              "Reactive repairs at a preferred rate",
              "A clear record of work kept per property",
              "Clear reporting for owners and facilities teams",
            ].map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-sm"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Reviews />
    </>
  )
}
