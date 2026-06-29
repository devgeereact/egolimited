import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  Phone,
  ShieldCheck,
  ListChecks,
  Wrench,
  CalendarCheck,
  CheckCircle2,
  MapPin,
  Siren,
  Navigation,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  services,
  sectors,
  pillars,
  process,
  proofPoints,
  faqs,
  packages,
} from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { img, serviceImage, sectorImage } from "@/site/images"
import { Section, Reveal, Eyebrow } from "@/site/components/Bits"
import {
  ImageHero,
  FeatureCards3,
  AboutSplit,
  Counter,
  Testimonials,
  NewsletterBand,
} from "@/site/components/Sections"
import { serviceIcon } from "@/site/components/serviceIcons"
import Seo, { faqLd } from "@/site/components/Seo"

const pillarIcons = [Wrench, CalendarCheck, ListChecks]

export default function Home() {
  const company = useCompany()
  const tel = company.phone.replace(/\s/g, "")
  const reduce = useReducedMotion()
  return (
    <>
      <Seo
        title="General Maintenance in London — EGO LTD"
        description="Repairs, planned upkeep and the small jobs other firms turn down — for homes and commercial property across London. Fair prices. Call 07539 705576."
        path="/"
        jsonLd={faqLd(faqs)}
      />

      {/* Hero — full-bleed tradesperson photo, warm scrim, ember treatment */}
      <ImageHero>
        <div className="grid items-center gap-10 py-24 md:py-32 lg:min-h-[42rem] lg:grid-cols-12">
          <motion.div
            className="lg:col-span-7"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <MapPin className="h-3.5 w-3.5 text-accent" />
              Homes &amp; commercial across South East London
            </div>

            <h1 className="font-serif text-[2.9rem] font-bold leading-[0.98] tracking-tight text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-6xl md:text-7xl">
              The jobs that need doing,{" "}
              <span className="text-accent">done properly.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 text-pretty [text-shadow:0_1px_8px_rgb(0_0_0/0.55)]">
              {company.shortName} is a general maintenance company for homes and
              commercial property. Reactive repairs, planned upkeep, and the
              small jobs other firms turn down. One number to call, a fair price
              up front, and the work done when we say it will be.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                asChild
                size="lg"
                className="w-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 hover:bg-accent/90 sm:w-auto"
              >
                <Link to="/contact">
                  Get a free quote
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <a href={`tel:${tel}`}>
                  <Phone className="mr-1 h-4 w-4" />
                  {company.phone}
                </a>
              </Button>
              <a
                href={`tel:${company.emergencyPhone.replace(/\s/g, "")}`}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/15 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-destructive/25 sm:w-auto sm:py-2"
              >
                <Siren className="h-4 w-4 text-red-300" />
                Emergency call-out
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-medium text-white/80">
              {[
                "Fully insured",
                "Fair, fixed prices",
                "We turn up when we say",
                "One number for every job",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 [text-shadow:0_1px_3px_rgb(0_0_0/0.4)]">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </ImageHero>

      {/* Three pillars as overlapping feature banners */}
      <FeatureCards3
        items={pillars.map((p, i) => {
          const Icon = pillarIcons[i] ?? Wrench
          return {
            icon: <Icon className="h-6 w-6" />,
            title: p.title,
            body: p.body,
            to: "/services",
          }
        })}
      />

      {/* About EGO — image-led split with experience badge + checklist */}
      <AboutSplit
        title="The firm you call for everything else"
        badge={{ value: "1", label: "Number to call" }}
        body={
          <>
            <p>
              Most maintenance firms cherry-pick the big, easy installs and leave
              the awkward jobs unbooked for weeks. That gap is exactly where we
              work.
            </p>
            <p>
              You get one dependable contact, a clear price before we start, and
              work that is finished and tidied properly. We are not the cheapest,
              and we do not try to be. We are the firm you call when you want it
              done right, once.
            </p>
          </>
        }
        points={[
          "Reactive repairs, booked fast",
          "Planned upkeep that prevents bills",
          "The small jobs nobody else will take",
          "One record kept per property",
        ]}
        cta={{ to: "/about", label: "About EGO" }}
      />

      {/* Services catalogue — image-topped cards */}
      <Section muted>
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Eyebrow>Our services</Eyebrow>
            <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
              One firm for the whole property
            </h2>
            <p className="mt-3 text-muted-foreground">
              From a dripping tap to a full planned-maintenance schedule across a
              portfolio, EGO handles the lot. Here is what we take off your
              hands.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/services">
              All services
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => {
            const Icon = serviceIcon(s.slug)
            return (
              <Reveal key={s.slug} delay={i * 0.04}>
                <Link to={`/services/${s.slug}`} className="group block h-full">
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-md">
                    <div className="relative overflow-hidden">
                      <img
                        src={serviceImage[s.slug]}
                        alt={`${s.name} in London — EGO LTD`}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-lg bg-background/90 text-primary shadow-sm backdrop-blur">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-serif text-lg font-bold group-hover:text-primary">
                        {s.name}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {s.summary}
                      </p>
                      <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                        Learn more
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
        <p className="mt-8 max-w-3xl rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <strong>Regulated work:</strong> gas and mains electrical work is
          carried out by certified specialists. Where a job needs one, we arrange
          it rather than cut corners.
        </p>
      </Section>

      {/* Animated counters */}
      <Counter />

      {/* Sectors — image cards */}
      <Section>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>Who we help</Eyebrow>
          <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
            Built around the people who run property
          </h2>
          <p className="mt-3 text-muted-foreground">
            Homeowners, landlords, agents and facilities teams all need something
            slightly different. We lead with what matters to each.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sectors.map((s, i) => (
            <Reveal key={s.name} delay={i * 0.05}>
              <div className="group h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative overflow-hidden">
                  <img
                    src={sectorImage[s.name]}
                    alt=""
                    className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(60_2%_9%)]/85 to-transparent p-4">
                    <h3 className="font-serif text-lg font-bold text-white">
                      {s.name}
                    </h3>
                  </div>
                </div>
                <p className="p-5 text-sm leading-relaxed text-muted-foreground">
                  {s.blurb}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Button asChild variant="ghost" className="mt-8">
          <Link to="/sectors">
            More on who we help
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Section>

      {/* What customers say */}
      <Testimonials />

      {/* Ways to work with us — service plans */}
      <Section>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>Ways to work with us</Eyebrow>
          <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
            Pick the arrangement that suits the property
          </h2>
          <p className="mt-3 text-muted-foreground">
            One-off repairs with no commitment, a simple care plan for landlords,
            or a tailored schedule for commercial sites. Every option comes with a
            price agreed up front.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {packages.map((pkg, i) => {
            const featured = Boolean(pkg.badge)
            return (
              <Reveal key={pkg.name} delay={i * 0.08}>
                <div
                  className={
                    "relative flex h-full flex-col rounded-2xl border p-7 " +
                    (featured
                      ? "border-accent bg-card shadow-lg shadow-accent/10 ring-1 ring-accent/30"
                      : "border-border bg-card")
                  }
                >
                  {featured && (
                    <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-sm">
                      {pkg.badge}
                    </span>
                  )}
                  <h3 className="font-serif text-xl font-bold">{pkg.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pkg.blurb}
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={featured ? "default" : "outline"}
                    className="mt-7 w-full"
                  >
                    <Link to="/contact">
                      Enquire
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* How it works */}
      <Section muted>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
            Simple, clear, and no runaround
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {process.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.06}>
              <div className="relative h-full rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="font-serif text-3xl font-bold text-accent">
                  {step.n}
                </div>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Promises */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="justify-center">Our promise</Eyebrow>
          <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
            The promises we make, and keep
          </h2>
          <p className="mt-3 text-muted-foreground">
            These are the things we say on every job, and the things we hold to on
            every job. If we ever fall short, tell us and we will put it right.
          </p>
        </div>
        <ul className="mx-auto mt-9 grid max-w-4xl gap-3 sm:grid-cols-2">
          {proofPoints.map((p, i) => {
            // Keep rows full: an odd final item spans both columns.
            const spanLast =
              i === proofPoints.length - 1 && proofPoints.length % 2 === 1
            return (
              <li
                key={p}
                className={
                  "flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm " +
                  (spanLast ? "sm:col-span-2" : "")
                }
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span>{p}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link to="/accreditations">
              Read our full guarantee
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* FAQ — heading + photo on the left, carded accordion on the right */}
      <Section muted>
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left — intro + supporting image with a contact nudge */}
          <div className="lg:sticky lg:top-24">
            <Eyebrow>Common questions</Eyebrow>
            <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
              Straight answers, before you ask
            </h2>
            <p className="mt-3 text-muted-foreground">
              No jargon and no runaround. If your question is not here, call us
              and we will give you a straight answer, the same as we would on the
              job.
            </p>
            <div className="relative mt-7 overflow-hidden rounded-3xl border border-border shadow-lg">
              <img
                src={img.banner.contact}
                alt=""
                className="h-64 w-full object-cover sm:h-72"
                loading="lazy"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-[hsl(60_2%_9%)]/85 via-transparent to-transparent"
              />
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[hsl(60_2%_9%)]/80 p-4 text-white backdrop-blur">
                <div>
                  <div className="text-sm font-semibold">
                    Still have a question?
                  </div>
                  <div className="text-xs text-white/70">
                    We are happy to talk it through, no obligation.
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <a href={`tel:${tel}`}>
                    <Phone className="mr-1.5 h-4 w-4" />
                    Call us
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Right — carded accordion */}
          <div>
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-border bg-card px-5 shadow-sm"
                >
                  <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/services">
                See pricing and full services
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* Existing-customer self-serve */}
      <Section>
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">Quotes &amp; your account</Eyebrow>
            <h2 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
              New here, or picking up where you left off
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start a quote, follow a live job, or open your account. It takes
              seconds, and there is no password to remember.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {[
              {
                to: "/contact",
                icon: FileText,
                title: "Get a quote",
                body: "New to EGO? Tell us the job and get a clear price and a date back, in writing.",
                cta: "Start a quote",
              },
              {
                to: "/track",
                icon: Navigation,
                title: "Track a job",
                body: "Enter your job reference and surname to see live status, no login needed.",
                cta: "Track now",
              },
              {
                to: "/track",
                icon: ShieldCheck,
                title: "My account",
                body: "Look up your job, then open your secure portal for full detail, invoices and updates.",
                cta: "Open my portal",
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 0.06}>
                <Link
                  to={c.to}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm">
                    <c.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-serif text-lg font-bold">
                    {c.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {c.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {c.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* Newsletter capture band */}
      <NewsletterBand />
    </>
  )
}
