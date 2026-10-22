import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Phone, Mail, MapPin, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PageHero, Section, Eyebrow } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { api } from "@/lib/api"
import { services } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"
import { img } from "@/site/images"

interface FormState {
  name: string
  email: string
  phone: string
  address: string
  service: string
  message: string
}

const empty: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  service: "",
  message: "",
}

export default function Contact() {
  const company = useCompany()
  const [form, setForm] = useState<FormState>(empty)
  const [sending, setSending] = useState(false)
  const [mapOn, setMapOn] = useState(false)

  const set = (k: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error("Please add your name, email, and a short message.")
      return
    }
    setSending(true)
    try {
      await api.post("/api/enquiry", { ...form, source: "website" })
      toast.success("Thanks. We have your enquiry and will be in touch shortly.")
      setForm(empty)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please call us instead.",
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Seo
        title="Contact EGO LTD — Free Maintenance Quote, London"
        description="Tell us the job and get a clear price and a date. Free quotes for maintenance across London. Call 07539 705576 or email hello@egolimited.com."
        path="/contact"
      />
      <PageHero
        eyebrow="Contact"
        title="Tell us the job"
        intro="Send a few details and we will come back with a price and a date we can keep. For anything urgent, call the line below."
        image={img.banner.contact}
      />
      <Section>
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Form */}
          <form
            onSubmit={onSubmit}
            className="lg:col-span-3 rounded-2xl border border-border bg-card p-7 shadow-sm"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Your name *</Label>
                <Input id="name" value={form.name} onChange={set("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={set("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Property address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Where is the work?"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="service">What do you need?</Label>
                <select
                  id="service"
                  value={form.service}
                  onChange={set("service")}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a service</option>
                  {services.map((s) => (
                    <option key={s.slug} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  <option value="Other">Something else</option>
                </select>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <Label htmlFor="message">Details *</Label>
              <Textarea
                id="message"
                rows={5}
                value={form.message}
                onChange={set("message")}
                placeholder="The problem, and when suits you. A photo helps us price it accurately, so send one over by email if you have one."
              />
            </div>
            {/* Just-in-time notice. The old line here said "we do not share your details with
                anyone", which the privacy policy itself contradicts: an enquiry reaches the
                engineer who does the work, the hosting provider, and the accountant. Say the
                true and useful thing instead, and link the policy from the point of collection. */}
            <p className="mt-3 text-xs text-muted-foreground">
              We will come back with a price and a date we can keep. We use these details to
              answer your enquiry and quote for the work, we never sell them, and we never pass
              them to anyone for their own marketing. See our{" "}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                privacy policy
              </Link>
              .
            </p>
            <Button type="submit" size="lg" className="mt-6" disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sending ? "Sending" : "Send enquiry"}
            </Button>
          </form>

          {/* Details */}
          <div className="lg:col-span-2 space-y-4">
            {[
              {
                icon: Phone,
                label: "Call us",
                value: company.phone,
                href: `tel:${company.phone.replace(/\s/g, "")}`,
              },
              {
                icon: Mail,
                label: "Email",
                value: company.email,
                href: `mailto:${company.email}`,
              },
              {
                icon: Clock,
                label: "Out-of-hours",
                value: `${company.emergencyPhone} (by arrangement)`,
                href: `tel:${company.emergencyPhone.replace(/\s/g, "")}`,
              },
            ].map((c) => (
              <a
                key={c.label}
                href={c.href}
                className="card-hover flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{c.label}</div>
                  <div className="font-semibold">{c.value}</div>
                </div>
              </a>
            ))}
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Where we work</div>
                <div className="font-semibold">{company.address}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {company.hours}
                </div>
              </div>
            </div>

            {/* Office map, loaded ONLY when the visitor asks for it.
                Embedding the iframe directly fired 17 requests to Google (maps.googleapis.com,
                maps.gstatic.com, google.com) the instant the page opened, handing a visitor's IP
                address and referring URL to Google before they had been shown anything or made
                any choice. Nobody comes to /contact for the map. So it stays a static panel until
                clicked, and the click is the choice. */}
            <div className="overflow-hidden rounded-xl border border-border shadow-sm">
              {mapOn ? (
                <iframe
                  title={`Map showing ${company.name}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(company.address)}&z=14&output=embed`}
                  className="h-56 w-full grayscale-[35%] contrast-[0.95]"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-3 bg-secondary/40 p-5 text-center">
                  <MapPin className="h-6 w-6 text-accent" />
                  <p className="text-sm font-medium">{company.address}</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    The map is a Google service. Loading it shares your IP address with Google,
                    so we do not load it until you ask.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMapOn(true)}>
                    Show the map
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* What happens next */}
      <Section muted>
        <div className="mb-10 max-w-2xl">
          <Eyebrow>What happens next</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-bold">
            From your message to the job done
          </h2>
          <p className="mt-3 text-muted-foreground">
            No call centres, no runaround. Here is exactly what to expect once you
            send us the details.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "We get back to you",
              body: "A real person reads your enquiry and replies, usually the same working day, to confirm the details or ask anything we need.",
            },
            {
              title: "You get a price and a date",
              body: "We send a fixed price or a clear estimate in writing, with a date we can keep. No surprises later.",
            },
            {
              title: "We turn up and do it",
              body: "We attend in the agreed window, do the work properly, tidy up, and send a simple, itemised invoice.",
            },
          ].map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-border bg-card p-7"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {i + 1}
              </span>
              <h3 className="mt-4 font-serif text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-accent" />
          {company.hours}
        </p>
      </Section>
    </>
  )
}
