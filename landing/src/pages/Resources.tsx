import { Link } from "react-router-dom"
import { ArrowRight, BookOpen, CalendarCheck, ShieldCheck, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHero, Section, Eyebrow } from "@/site/components/Bits"
import { img, articleImageFor } from "@/site/images"
import Seo from "@/site/components/Seo"
import { usePublicArticles } from "@/site/blog"

function formatDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) }

const topics = [
  { icon: CalendarCheck, label: "Planned maintenance", blurb: "Why scheduled upkeep costs less than waiting for things to break.", image: img.banner.services },
  { icon: ShieldCheck, label: "Compliance & safety", blurb: "Staying on the right side of the rules for let and managed property.", image: img.banner.trust },
  { icon: Wrench, label: "Repairs & upkeep", blurb: "Practical fixes and the small jobs that keep a property in order.", image: img.banner.about },
  { icon: BookOpen, label: "Landlord & agent guides", blurb: "Turnarounds, void days, and getting more from one contractor.", image: img.banner.sectors },
]

export default function Resources() {
  const posts = usePublicArticles().slice(0, 9)
  return (
    <>
      <Seo title="Maintenance Guides & Resources — EGO LTD" description="Practical maintenance advice for London landlords, agents and homeowners — checklists, planned-vs-reactive guidance and how to choose a contractor." path="/resources" />
      <PageHero eyebrow="Resources" title="Practical guides on keeping property in good order" intro="Short, useful reads for landlords, managing agents, and homeowners. Clear, honest advice from the people who do the work, with no filler and nothing to sell you that you do not need." image={img.banner.resources} />
      <Section>
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div className="max-w-2xl"><Eyebrow>What we write about</Eyebrow><h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">Advice worth keeping a property in good order for</h2></div></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{topics.map((t) => (<div key={t.label} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"><div className="relative overflow-hidden"><img src={t.image} alt="" className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /><div className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-lg bg-background/90 text-primary shadow-sm backdrop-blur"><t.icon className="h-4 w-4" /></div></div><div className="flex flex-1 flex-col p-5"><h3 className="font-serif text-base font-bold">{t.label}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.blurb}</p></div></div>))}</div>
      </Section>
      <Section muted>
        <Eyebrow>Latest guides</Eyebrow>
        <h2 className="mb-8 mt-3 font-serif text-3xl font-bold md:text-4xl">Fresh from the team</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{posts.map((a) => (<Link key={a.slug} to={`/resources/${a.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"><img src={a.image} alt="" className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { const el = e.currentTarget; const fb = articleImageFor(a.slug); if (!el.src.endsWith(fb)) el.src = fb }} /><div className="flex flex-1 flex-col p-7"><div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{formatDate(a.date)}</div><h3 className="mt-3 font-serif text-lg font-bold group-hover:text-primary">{a.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p><span className="mt-4 inline-flex items-center text-sm font-medium text-primary">Read article<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></Link>))}</div>
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-secondary/40 p-8 text-center"><Eyebrow className="justify-center">Need advice for your property?</Eyebrow><h2 className="mt-3 font-serif text-2xl font-bold">Not sure what your property needs next?</h2><p className="mx-auto mt-3 max-w-xl text-muted-foreground">Tell us about the building and we will tell you straight what is worth doing now, what can wait, and what it is likely to cost. No pressure, and no charge for the conversation.</p><Button asChild className="mt-6"><Link to="/contact">Ask us a question<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
      </Section>
    </>
  )
}
