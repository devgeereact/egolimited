import { Link } from "react-router-dom"
import { ArrowRight, Home, Wrench, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import Seo from "@/site/components/Seo"
import { useCompany } from "@/site/CompanyProvider"

const quickLinks = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/services", icon: Wrench, label: "Our services" },
  { to: "/contact", icon: Phone, label: "Contact us" },
]

export default function NotFound() {
  const company = useCompany()
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-background">
      {/* Blueprint grid — the brand motif, faded toward the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.045) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.045) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 60% 70% at 50% 40%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 70% at 50% 40%, black, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/15 blur-[120px]"
      />

      <div className="container relative flex flex-col items-center px-4 py-24 text-center">
        <Seo
          title="Page not found"
          description="The page you are after has moved or never existed."
          path="/404"
          noindex
        />
        <div className="bg-gradient-to-br from-[hsl(36_92%_60%)] via-accent to-[hsl(26_88%_44%)] bg-clip-text font-serif text-8xl font-bold tracking-tight text-transparent md:text-9xl">
          404
        </div>
        <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight md:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground text-pretty">
          The page you are after has moved or never existed. Let us point you
          back to something useful.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="shadow-sm shadow-accent/20">
            <Link to="/">
              Back to home
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={`tel:${company.phone.replace(/\s/g, "")}`}>
              <Phone className="mr-1.5 h-4 w-4" />
              {company.phone}
            </a>
          </Button>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {quickLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-accent/50 hover:text-primary"
            >
              <l.icon className="h-4 w-4 text-accent" />
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
