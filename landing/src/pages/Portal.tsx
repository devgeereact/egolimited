import { ExternalLink, MessageSquare, Camera, ClipboardCheck, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { PageHero, Section, Eyebrow } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { APP_URL } from "@/site/components/SiteNav"

const features = [
  { icon: ClipboardCheck, title: "See the status", body: "Know exactly where your job is — booked, on the way, on site, or complete — without chasing." },
  { icon: Camera, title: "Photos of the work", body: "Before-and-after photos from the engineer, so you can see what was done even if you were not there." },
  { icon: MessageSquare, title: "Message the office", body: "Ask a question or send a detail straight from the portal. You will see when we have read it." },
]

export default function Portal() {
  return (
    <>
      <Seo title="Customer Portal — EGO LTD" description="Your EGO LTD customer portal: job status, photos, invoices and messages in one secure place. Open it from the link in your confirmation." path="/portal" noindex />
      <PageHero eyebrow="Customer portal" title="Everything about your job, in one place" intro="When we book your work you get a secure link. No password to remember — the link is your way in. Open it any time to follow the job." actions={<Button asChild size="lg" className="bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90"><a href={APP_URL}>Open the portal<ExternalLink className="ml-1.5 h-4 w-4" /></a></Button>} />
      <Section>
        <div className="mb-10 max-w-2xl"><Eyebrow>What you get</Eyebrow><h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">A clear view, start to finish</h2></div>
        <div className="grid gap-6 md:grid-cols-3">{features.map((f) => (<div key={f.title} className="rounded-2xl border border-border bg-card p-7"><div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground"><f.icon className="h-5 w-5" /></div><h3 className="mt-4 font-serif text-lg font-bold">{f.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p></div>))}</div>
      </Section>
      <Section muted>
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-serif text-2xl font-bold">Have a tracking reference?</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Enter it on the tracking page and we will open your job for you.</p>
          <Button asChild className="mt-6"><Link to="/track">Track my job<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
      </Section>
    </>
  )
}
