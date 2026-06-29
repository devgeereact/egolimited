import { useEffect, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import {
  Menu,
  ChevronDown,
  Phone,
  ArrowRight,
  LayoutDashboard,
  Mail,
  Clock,
  Siren,
  ShieldCheck,
  Wrench,
  Navigation,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { services } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { serviceIcon } from "./serviceIcons"
import Logo from "./Logo"

const primary = [
  { to: "/about", label: "About" },
  { to: "/sectors", label: "Who we help" },
  { to: "/areas", label: "Areas" },
  { to: "/accreditations", label: "Trust" },
  { to: "/resources", label: "Resources" },
]

// "Track a job" + "My account" merged into one seamless customer menu.
const customer = [
  {
    to: "/track",
    label: "Track a job",
    desc: "Live status from your job reference and surname. No login.",
    icon: Navigation,
  },
  {
    to: "/portal",
    label: "My account",
    desc: "A secure email link to your jobs, invoices and statements.",
    icon: ShieldCheck,
  },
]

// Shared treatment for top-level nav items: subtle text plus an ember underline
// that wipes in on hover and stays lit on the active route.
const navLink =
  "relative inline-flex items-center text-sm font-medium transition-colors hover:text-primary " +
  "after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-full after:origin-left " +
  "after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200"

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    navLink,
    "hover:after:scale-x-100",
    isActive ? "text-primary after:scale-x-100" : "text-foreground/80",
  )
}

export default function SiteNav() {
  const company = useCompany()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setServicesOpen(false)
    setAccountOpen(false)
  }, [location.pathname])

  const accountActive =
    location.pathname.startsWith("/track") ||
    location.pathname.startsWith("/portal")

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Utility bar — hours, email, emergency. Hides once you scroll so the
          main bar can compact. */}
      <div
        className={cn(
          "hidden border-b border-primary/10 bg-primary text-primary-foreground transition-all duration-300 lg:block",
          scrolled ? "max-h-0 overflow-hidden border-transparent opacity-0" : "max-h-12 opacity-100",
        )}
      >
        <div className="container flex h-10 items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-6 text-primary-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent" />
              {company.hours}
            </span>
            <a
              href={`mailto:${company.email}`}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
            >
              <Mail className="h-3.5 w-3.5 text-accent" />
              {company.email}
            </a>
          </div>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5 text-primary-foreground/70">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Fully insured &middot; DBS-checked engineers
            </span>
            <a
              href={`tel:${company.emergencyPhone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
            >
              <Siren className="h-3.5 w-3.5" />
              Emergency call-out
            </a>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "w-full border-b transition-all",
          scrolled
            ? "border-border bg-background/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/65"
            : "border-border/60 bg-background",
        )}
      >
      <div className="container flex h-16 items-center gap-6 px-4 md:h-20">
        <Logo />

        <nav className="ml-4 hidden items-center gap-6 lg:flex">
          {/* Services dropdown — opens on hover (mouse) and on focus (keyboard). */}
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
            onFocus={() => setServicesOpen(true)}
            onBlur={(e) => {
              // Close only when focus leaves the whole dropdown.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setServicesOpen(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setServicesOpen(false)
            }}
          >
            <Link
              to="/services"
              aria-haspopup="true"
              aria-expanded={servicesOpen}
              className={cn(
                navLink,
                "gap-1",
                servicesOpen || location.pathname.startsWith("/services")
                  ? "text-primary after:scale-x-100"
                  : "text-foreground/80 hover:after:scale-x-100",
              )}
            >
              Services
              <ChevronDown className={cn("h-4 w-4 transition-transform", servicesOpen && "rotate-180")} />
            </Link>
            {servicesOpen && (
              <div className="absolute left-0 top-full z-50 w-[min(52rem,calc(100vw-2rem))] pt-3">
                <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-popover p-3 shadow-2xl ring-1 ring-black/5 animate-in fade-in-0 slide-in-from-top-2 duration-150">
                  <div className="col-span-2">
                    <div className="mb-1 flex items-center justify-between px-2 pt-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        What we do
                      </span>
                      <Link to="/services" className="text-xs font-medium text-primary hover:underline">
                        All services →
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      {services.map((s) => {
                        const Icon = serviceIcon(s.slug)
                        return (
                          <Link
                            key={s.slug}
                            to={`/services/${s.slug}`}
                            className="group/item flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-secondary"
                          >
                            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary transition-colors group-hover/item:bg-accent group-hover/item:text-accent-foreground">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-foreground">
                                {s.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
                                {s.summary}
                              </span>
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                  {/* Featured CTA panel */}
                  <Link
                    to="/contact"
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/25 blur-2xl"
                    />
                    <div className="relative">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent">
                        <Wrench className="h-3 w-3" />
                        One firm, every job
                      </span>
                      <h4 className="mt-3 font-serif text-lg font-bold leading-tight">
                        Not sure who to call?
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-primary-foreground/70">
                        Send us the list. You get one clear price and a date we
                        can keep, from a dripping tap to a whole portfolio.
                      </p>
                    </div>
                    <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                      Get a free quote
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {primary.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}

          {/* My account dropdown — Track a job + account, merged. */}
          <div
            className="relative"
            onMouseEnter={() => setAccountOpen(true)}
            onMouseLeave={() => setAccountOpen(false)}
            onFocus={() => setAccountOpen(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setAccountOpen(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setAccountOpen(false)
            }}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={accountOpen}
              className={cn(
                navLink,
                "gap-1",
                accountOpen || accountActive
                  ? "text-primary after:scale-x-100"
                  : "text-foreground/80 hover:after:scale-x-100",
              )}
            >
              My account
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  accountOpen && "rotate-180",
                )}
              />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full z-50 w-[22rem] pt-3">
                <div className="rounded-2xl border border-border bg-popover p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in-0 slide-in-from-top-2 duration-150">
                  <div className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Already a customer?
                  </div>
                  {customer.map((c) => (
                    <Link
                      key={c.to}
                      to={c.to}
                      className="group/item flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary transition-colors group-hover/item:bg-accent group-hover/item:text-accent-foreground">
                        <c.icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-foreground">
                          {c.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {c.desc}
                        </span>
                      </span>
                    </Link>
                  ))}
                  {/* New-customer nudge keeps the menu seamless for everyone. */}
                  <Link
                    to="/contact"
                    className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <span className="text-sm font-semibold">
                      New here? Get a quote
                    </span>
                    <ArrowRight className="h-4 w-4 text-accent" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto hidden items-center gap-4 lg:flex">
          <a
            href={`tel:${company.phone.replace(/\s/g, "")}`}
            className="group flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-primary"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Phone className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Call us
              </span>
              <span className="block text-sm font-semibold text-foreground">
                {company.phone}
              </span>
            </span>
          </a>

          <span aria-hidden className="h-8 w-px bg-border" />

          {user && (
            <Button asChild variant="ghost" size="sm">
              <a href="/app/">
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Dashboard
              </a>
            </Button>
          )}
          <Button asChild size="sm" className="shadow-sm shadow-accent/20">
            <Link to="/contact">
              Get a quote
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="ml-auto lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88%] max-w-sm overflow-y-auto">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mb-6">
                <Logo />
              </div>
              <nav className="flex flex-col gap-1">
                <Link
                  to="/services"
                  className="rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
                >
                  All services
                </Link>
                <Accordion type="single" collapsible>
                  <AccordionItem value="services" className="border-none">
                    <AccordionTrigger className="px-3 py-2 text-sm text-muted-foreground hover:no-underline">
                      Service areas
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col">
                        {services.map((s) => (
                          <Link
                            key={s.slug}
                            to={`/services/${s.slug}`}
                            className="rounded-md px-5 py-2 text-sm hover:bg-accent"
                          >
                            {s.name}
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                {primary.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
                  >
                    {l.label}
                  </Link>
                ))}

                {/* My account — Track a job + account, merged. */}
                <div className="mt-2 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  My account
                </div>
                {customer.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
                  >
                    <c.icon className="h-4 w-4 text-primary" />
                    {c.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
                <a
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {company.phone}
                </a>
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  {company.email}
                </a>
                <a
                  href={`tel:${company.emergencyPhone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-danger"
                >
                  <Siren className="h-4 w-4" />
                  Emergency call-out
                </a>
                {user && (
                  <Button asChild variant="outline">
                    <a href="/app/">
                      <LayoutDashboard className="mr-1.5 h-4 w-4" />
                      Go to dashboard
                    </a>
                  </Button>
                )}
                <Button asChild>
                  <Link to="/contact">Get a quote</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </div>
    </header>
  )
}
