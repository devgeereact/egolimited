import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useInView, useReducedMotion, animate as animateValue } from "framer-motion"
import { ArrowRight, BellRing, CalendarCheck, CheckCircle2, Phone, Quote, ShieldCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { counters, testimonials, team } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { img } from "@/site/images"
import { Eyebrow, Reveal } from "./Bits"

export function ImageHero({ children, image = img.hero.main }: { children: ReactNode; image?: string }) {
  return (
    <section className="relative overflow-hidden bg-[hsl(60_2%_9%)] text-white">
      <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${image}')` }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[hsl(60_2%_7%)] via-[hsl(60_2%_8%)]/90 to-[hsl(60_2%_9%)]/45" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[hsl(60_2%_7%)]/85 via-transparent to-[hsl(60_2%_8%)]/30" />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "linear-gradient(hsl(33 92% 54% / 0.10) 1px, transparent 1px), linear-gradient(90deg, hsl(33 92% 54% / 0.10) 1px, transparent 1px)",
        backgroundSize: "54px 54px",
        maskImage: "radial-gradient(ellipse 70% 60% at 30% 10%, black, transparent 78%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 30% 10%, black, transparent 78%)",
      }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-40 h-[40rem] w-[40rem] rounded-full bg-accent/20 blur-[130px]" />
      <div className="container relative px-4">{children}</div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
    </section>
  )
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduce) { setDisplay(value); return }
    const controls = animateValue(0, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(Math.round(v)) })
    return () => controls.stop()
  }, [inView, value, reduce])
  return <span ref={ref}>{display}{suffix}</span>
}

export function Counter() {
  return (
    <section className="relative overflow-hidden bg-[hsl(60_2%_11%)] text-white">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/15 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "linear-gradient(hsl(33 92% 54% / 0.07) 1px, transparent 1px), linear-gradient(90deg, hsl(33 92% 54% / 0.07) 1px, transparent 1px)",
        backgroundSize: "46px 46px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 0%, black, transparent 82%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 0%, black, transparent 82%)",
      }} />
      <div className="container relative grid grid-cols-2 gap-y-10 px-4 py-16 lg:grid-cols-4">
        {counters.map((c) => (
          <Reveal key={c.label}>
            <div className="px-4 text-center">
              <div className="font-serif text-4xl font-bold tracking-tight text-accent sm:text-5xl"><AnimatedNumber value={c.value} suffix={c.suffix} /></div>
              <div className="mx-auto mt-3 max-w-[12rem] text-sm leading-snug text-white/65">{c.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export function AboutSplit({
  eyebrow = "About EGO", title, body, points, badge, cta, image = img.about.primary, inset = img.about.inset,
}: { eyebrow?: string; title: ReactNode; body: ReactNode; points: string[]; badge?: { value: string; label: string }; cta?: { to: string; label: string }; image?: string; inset?: string }) {
  return (
    <section className="bg-background">
      <div className="container grid items-center gap-12 px-4 py-16 md:py-20 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="overflow-hidden rounded-3xl border border-border shadow-lg">
              <img src={image} alt="" className="h-[20rem] w-full object-cover sm:h-[24rem] lg:h-[27rem]" loading="lazy" />
            </div>
            <div className="absolute -bottom-5 -right-4 hidden w-28 overflow-hidden rounded-xl border-4 border-background shadow-xl sm:block">
              <img src={inset} alt="" className="aspect-square w-full object-cover" loading="lazy" />
            </div>
            {badge && (
              <div className="absolute -left-3 -top-4 rounded-xl bg-accent px-4 py-2.5 text-[hsl(60_2%_14%)] shadow-lg">
                <div className="font-serif text-2xl font-bold leading-none">{badge.value}</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{badge.label}</div>
              </div>
            )}
          </div>
        </Reveal>
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
          <div className="mt-4 space-y-3 text-muted-foreground">{body}</div>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{p}</span></li>
            ))}
          </ul>
          {cta && <Button asChild className="mt-8"><Link to={cta.to}>{cta.label}<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>}
        </div>
      </div>
    </section>
  )
}

interface ApiReview { name: string; quote: string; score?: number; role?: string; avatar?: string | null; date?: string | null }
interface ReviewsResponse { source: string; rating: number | null; count: number; reviews: ApiReview[] }

export function Testimonials() {
  const { data } = useQuery({
    queryKey: ["public-reviews"], queryFn: () => api.get<ReviewsResponse>("reviews.php"),
    staleTime: 1000 * 60 * 30, retry: false, throwOnError: false,
  })
  const live = data?.reviews?.length ? data.reviews : null
  const items: ApiReview[] = live ?? testimonials.map((t) => ({ name: t.name, quote: t.quote, role: t.role, avatar: t.avatar, score: 5 }))
  const rating = live ? data?.rating ?? null : null
  const count = live ? data?.count ?? 0 : 0
  return (
    <section className="bg-secondary/30">
      <div className="container grid items-center gap-10 px-4 py-16 md:py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow>What people say</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight md:text-4xl">The contractor people call back</h2>
          <p className="mt-4 text-muted-foreground">The work speaks for itself, but it helps to hear it from the people we look after. Here is what homeowners, landlords and facilities teams tell us.</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-1 text-accent">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-5 w-5", rating && i + 1 > Math.round(rating) ? "text-accent/30" : "fill-accent")} />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground/70">
              {rating ? `${rating.toFixed(1)} from ${count} review${count === 1 ? "" : "s"}` : "Rated for turning up"}
            </span>
          </div>
        </div>
        <div className="lg:col-span-8">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-4">
              {items.map((t, i) => (
                <CarouselItem key={t.name + i} className="pl-4 sm:basis-1/2">
                  <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Quote className="h-7 w-7 text-accent/70" />
                      {t.score ? (
                        <div className="flex items-center gap-0.5 text-accent">
                          {Array.from({ length: t.score }).map((_, s) => (<Star key={s} className="h-3.5 w-3.5 fill-accent" />))}
                        </div>
                      ) : null}
                    </div>
                    <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/85">{t.quote}</blockquote>
                    <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent/15 text-sm font-bold text-accent">
                        {t.avatar ? <img src={t.avatar} alt="" className="h-full w-full object-cover" /> : t.name.charAt(0)}
                      </span>
                      <span className="text-sm">
                        <span className="block font-semibold">{t.name}</span>
                        <span className="block text-muted-foreground">{t.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center gap-2">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  )
}

export function TeamRow() {
  return (
    <section className="bg-background">
      <div className="container px-4 py-16 md:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow className="justify-center">Who you deal with</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight md:text-4xl">The people who turn up</h2>
          <p className="mt-3 text-muted-foreground">No call centres and no runaround. A small team that knows your property and takes responsibility for the work, start to finish.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m, i) => (
            <Reveal key={m.role} delay={i * 0.06}>
              <div className="group h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative overflow-hidden">
                  <img src={m.photo} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(60_2%_9%)]/85 to-transparent p-4">
                    <div className="font-serif text-lg font-bold text-white">{m.name}</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-accent">{m.role}</div>
                  </div>
                </div>
                <p className="p-5 text-sm leading-relaxed text-muted-foreground">{m.line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function NewsletterBand({
  title = "Keep your property one step ahead",
  blurb = "Join our upkeep list for seasonal maintenance reminders and the occasional practical tip from the people who do the work. No selling, no clutter.",
}: { title?: string; blurb?: string }) {
  const company = useCompany()
  const [email, setEmail] = useState("")
  const [joining, setJoining] = useState(false)
  async function onJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setJoining(true)
    try {
      await api.post("enquiry", { name: "Newsletter signup", contact: email.trim(), message: "Newsletter / upkeep-list signup from the website." })
      toast.success("You're on the list. We'll be in touch with seasonal upkeep tips.")
      setEmail("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign you up — please try again.")
    } finally { setJoining(false) }
  }
  const perks = [
    { icon: CalendarCheck, title: "Seasonal reminders", body: "A nudge before winter and summer so small jobs never become big bills." },
    { icon: BellRing, title: "Useful, not noisy", body: "A few emails a year, only when there is something genuinely worth knowing." },
    { icon: ShieldCheck, title: "Your details stay yours", body: "We never share or sell your email. Unsubscribe in one click, any time." },
  ]
  return (
    <section className="px-4 py-16">
      <div className="container relative overflow-hidden rounded-3xl bg-[hsl(60_2%_10%)] text-white shadow-lg">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{
          backgroundImage: "linear-gradient(hsl(33 92% 54% / 0.10) 1px, transparent 1px), linear-gradient(90deg, hsl(33 92% 54% / 0.10) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 80% at 15% 0%, black, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 15% 0%, black, transparent 80%)",
        }} />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <div className="relative grid gap-10 px-6 py-12 md:px-12 md:py-14 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <Eyebrow tone="dark">Stay ahead of the repairs</Eyebrow>
            <h2 className="mt-3 font-serif text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
            <p className="mt-3 max-w-xl text-white/70">{blurb}</p>
            <ul className="mt-7 grid gap-4 sm:grid-cols-3">
              {perks.map((p) => (
                <li key={p.title}>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent"><p.icon className="h-5 w-5" /></div>
                  <div className="mt-2.5 text-sm font-semibold">{p.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur">
              <label htmlFor="newsletter-email" className="text-sm font-semibold">Get upkeep reminders</label>
              <p className="mt-1 text-xs text-white/55">Free. Pop your email in and we will do the remembering.</p>
              <form className="mt-4 flex flex-col gap-3" onSubmit={onJoin}>
                <input id="newsletter-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email address"
                  className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none" />
                <Button type="submit" size="lg" disabled={joining} className="h-12 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {joining ? "Joining…" : "Join the upkeep list"}<ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </form>
              <p className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-4 text-xs text-white/55">
                <Phone className="h-3.5 w-3.5 text-accent" />Prefer to talk? Call {company.phone}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FeatureCards3({ items }: { items: { icon: ReactNode; title: string; body: string; to?: string }[] }) {
  return (
    <section className="relative z-10 -mt-12 px-4 md:-mt-16">
      <div className="container grid gap-5 md:grid-cols-3">
        {items.map((it, i) => {
          const inner = (
            <div className={cn("group flex h-full flex-col rounded-2xl border border-border bg-card p-7 shadow-lg transition-all", it.to && "hover:-translate-y-1 hover:shadow-xl")}>
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm">{it.icon}</div>
              <h3 className="mt-5 font-serif text-xl font-bold">{it.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
              {it.to && <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">Learn more<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>}
            </div>
          )
          return <Reveal key={it.title} delay={i * 0.08}>{it.to ? <Link to={it.to} className="block h-full">{inner}</Link> : inner}</Reveal>
        })}
      </div>
    </section>
  )
}
