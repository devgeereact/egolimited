import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Phone } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCompany } from "@/site/CompanyProvider"

export function BannerCtas({
  secondaryTo, secondaryLabel, primaryLabel = "Get a free quote",
}: { secondaryTo?: string; secondaryLabel?: string; primaryLabel?: string }) {
  const company = useCompany()
  return (
    <>
      <Button asChild size="lg" className="w-full bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 sm:w-auto">
        <Link to="/contact">{primaryLabel}<ArrowRight className="ml-1 h-4 w-4" /></Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="w-full border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white sm:w-auto">
        {secondaryTo ? (
          <Link to={secondaryTo}>{secondaryLabel}</Link>
        ) : (
          <a href={`tel:${company.phone.replace(/\s/g, "")}`}><Phone className="mr-1.5 h-4 w-4" />{company.phone}</a>
        )}
      </Button>
    </>
  )
}

export function Eyebrow({ children, className, tone = "light" }: { children: ReactNode; className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em]", tone === "dark" ? "text-white/85" : "text-primary", className)}>
      <span aria-hidden className="h-px w-7 rounded-full bg-accent" />
      {children}
    </div>
  )
}

export function PageHero({
  eyebrow, title, intro, actions, image,
}: { eyebrow?: string; title: ReactNode; intro?: string; actions?: ReactNode; image?: string }) {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden bg-[hsl(60_2%_11%)] text-white">
      {image && (
        <>
          <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${image}')` }} />
          <div aria-hidden className="absolute inset-0 bg-[hsl(60_2%_9%)]/80" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[hsl(60_2%_8%)] via-[hsl(60_2%_9%)]/85 to-[hsl(60_2%_9%)]/25" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[hsl(60_2%_9%)]/40 via-transparent to-[hsl(60_2%_9%)]/70" />
        </>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "linear-gradient(hsl(33 92% 54% / 0.10) 1px, transparent 1px), linear-gradient(90deg, hsl(33 92% 54% / 0.10) 1px, transparent 1px)",
        backgroundSize: "54px 54px",
        maskImage: "radial-gradient(ellipse 72% 72% at 28% 0%, black, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse 72% 72% at 28% 0%, black, transparent 80%)",
      }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-[34rem] w-[34rem] rounded-full bg-accent/20 blur-[130px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[130px]" />
      <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
        className="container relative flex min-h-[20rem] flex-col justify-center px-4 py-20 md:min-h-[24rem] md:py-24">
        {eyebrow && <Eyebrow tone="dark" className="mb-5">{eyebrow}</Eyebrow>}
        <h1 className="max-w-3xl font-serif text-[2.4rem] font-bold leading-[1.04] tracking-tight text-balance text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] md:text-5xl lg:text-[3.4rem]">
          {title}
        </h1>
        {intro && <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85 text-pretty [text-shadow:0_1px_8px_rgb(0_0_0/0.5)] md:text-lg">{intro}</p>}
        {actions && <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div>}
      </motion.div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
    </section>
  )
}

export function Section({ children, className, muted = false }: { children: ReactNode; className?: string; muted?: boolean }) {
  return (
    <section className={cn(muted && "bg-secondary/30")}>
      <div className={cn("container px-4 py-16 md:py-20", className)}>{children}</div>
    </section>
  )
}

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <div>{children}</div>
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay }}>
      {children}
    </motion.div>
  )
}

export function MediaPanel({ icon: Icon, className, children }: { icon?: LucideIcon; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-[hsl(60_2%_11%)] text-white", className)}>
      <div aria-hidden className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(hsl(33 92% 54% / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(33 92% 54% / 0.12) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
      {Icon && !children && <div className="absolute inset-0 grid place-items-center"><Icon className="h-16 w-16 text-accent/70" /></div>}
      {children && <div className="relative h-full">{children}</div>}
    </div>
  )
}

export function CtaBand() {
  const company = useCompany()
  return (
    <section className="px-4 py-16">
      <div className="container relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(36_92%_64%)] via-[hsl(33_92%_54%)] to-[hsl(26_88%_44%)] px-8 py-14 text-center text-[hsl(60_2%_14%)] shadow-lg md:px-12 md:py-16">
        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-balance md:text-4xl">Ready to stop chasing contractors?</h2>
          <p className="mx-auto mt-3 max-w-xl text-[hsl(60_2%_14%)]/80 text-pretty md:text-lg">
            Tell us the job. You get one clear price, a date we can keep, and work that is finished and tidied properly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-[hsl(60_2%_14%)] text-[hsl(46_24%_93%)] shadow-md hover:bg-[hsl(60_2%_14%)]/90">
              <Link to="/contact">Request your free quote<ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[hsl(60_2%_14%)]/30 bg-transparent text-[hsl(60_2%_14%)] hover:bg-[hsl(60_2%_14%)]/10">
              <a href={`tel:${company.phone.replace(/\s/g, "")}`}><Phone className="mr-1.5 h-4 w-4" />Speak to an expert</a>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
      </div>
    </section>
  )
}
