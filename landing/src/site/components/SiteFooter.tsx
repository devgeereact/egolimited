import { Link } from "react-router-dom"
import {
  ArrowUp,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Siren,
} from "lucide-react"
import { services, sectors } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { areas } from "@/site/areas"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Logo from "./Logo"

const trustBadges = [
  "Fully insured",
  "DBS-checked",
  "Fixed prices",
  "Gas Safe specialists arranged",
]

export default function SiteFooter() {
  const company = useCompany()
  const year = new Date().getFullYear()
  const { user } = useAuth()
  // Public footer points customers at the portal/track, never a login.
  // Admins (already signed in) get a quiet dashboard shortcut.
  const accountLink = user
    ? { to: "/app/", label: "My dashboard", external: true }
    : { to: "/track", label: "Track a job", external: false }

  return (
    <footer className="relative bg-primary text-primary-foreground">
      {/* Premium ember hairline along the top edge */}
      <div
        aria-hidden
        className="h-px w-full bg-gradient-to-r from-transparent via-accent/60 to-transparent"
      />
      {/* Pre-footer CTA strip */}
      <div className="border-b border-white/10">
        <div className="container flex flex-col items-start gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Ready when you are
            </div>
            <h3 className="mt-2 font-serif text-2xl font-bold tracking-tight md:text-3xl">
              One number for every job on the property.
            </h3>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/70">
              Tell us what needs doing. You get a clear price and a date we can keep.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90"
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
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <a href={`tel:${company.phone.replace(/\s/g, "")}`}>
                <Phone className="mr-1.5 h-4 w-4" />
                {company.phone}
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="container grid gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-5">
        {/* Brand + contact */}
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
            {company.intro}
          </p>
          <div className="mt-6 space-y-2.5 text-sm">
            <a
              href={`tel:${company.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2.5 text-primary-foreground/85 transition-colors hover:text-accent"
            >
              <Phone className="h-4 w-4 text-accent" />
              {company.phone}
            </a>
            <a
              href={`mailto:${company.email}`}
              className="flex items-center gap-2.5 text-primary-foreground/85 transition-colors hover:text-accent"
            >
              <Mail className="h-4 w-4 text-accent" />
              {company.email}
            </a>
            <div className="flex items-start gap-2.5 text-primary-foreground/85">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {company.address}
            </div>
            <div className="flex items-start gap-2.5 text-primary-foreground/85">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {company.hours}
            </div>
            <a
              href={`tel:${company.emergencyPhone.replace(/\s/g, "")}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <Siren className="h-4 w-4" />
              Emergency call-out
            </a>
          </div>
        </div>

        {/* Services */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Services
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  to={`/services/${s.slug}`}
                  className="text-primary-foreground/70 transition-colors hover:text-accent"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Who we help */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Who we help
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {sectors.map((s) => (
              <li key={s.name}>
                <Link
                  to="/sectors"
                  className="text-primary-foreground/70 transition-colors hover:text-accent"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>

          <h4 className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Areas we cover
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {areas.map((a) => (
              <li key={a.slug}>
                <Link
                  to={`/areas/${a.slug}`}
                  className="text-primary-foreground/70 transition-colors hover:text-accent"
                >
                  {a.region}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Company
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { to: "/about", label: "About us" },
              { to: "/accreditations", label: "Trust & insurance" },
              { to: "/contact", label: "Contact" },
              // accountLink = "Track a job" (logged out) or "My dashboard" (admin),
              // so we never list "Track a job" twice.
              accountLink,
            ].map((l) => (
              <li key={l.to}>
                {"external" in l && l.external ? (
                  <a
                    href={l.to}
                    className="text-primary-foreground/70 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    to={l.to}
                    className="text-primary-foreground/70 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trust badges row */}
      <div className="border-t border-white/10">
        <div className="container flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 text-xs font-medium text-primary-foreground/70">
          {trustBadges.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Legal bottom bar */}
      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-primary-foreground/60 sm:flex-row">
          <span>
            &copy; {year} {company.name}. {company.companyReg}
            {company.companiesHouseNo ? `, company no. ${company.companiesHouseNo}` : ""}.
            {company.vatNumber ? ` VAT ${company.vatNumber}.` : ""}
          </span>
          <div className="flex items-center gap-5">
            {[
              { to: "/privacy", label: "Privacy" },
              { to: "/terms", label: "Terms" },
              { to: "/cookies", label: "Cookies" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="transition-colors hover:text-accent"
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1 transition-colors hover:text-accent"
            >
              Back to top
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
