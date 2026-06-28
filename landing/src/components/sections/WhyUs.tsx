import FadeIn from "@/components/ui/FadeIn"
import { ShieldCheck, MapPin, Receipt, Clock, BadgeCheck, MessagesSquare } from "lucide-react"

const POINTS = [
  { icon: ShieldCheck, title: "Vetted & insured", desc: "Every engineer is background-checked and fully insured." },
  { icon: MapPin, title: "Live job tracking", desc: "A private link shows real-time progress, photos and updates." },
  { icon: Receipt, title: "Transparent pricing", desc: "Clear quotes and tidy invoices — you always know the cost." },
  { icon: Clock, title: "Fast response", desc: "Same-week appointments and quick turnaround on urgent work." },
  { icon: BadgeCheck, title: "Guaranteed work", desc: "We stand behind every job with a workmanship guarantee." },
  { icon: MessagesSquare, title: "Easy to reach", desc: "Message us from your tracking page and get a quick reply." },
]

export default function WhyUs() {
  return (
    <section id="why" className="py-24">
      <div className="container-custom">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Why EGO LIMITED</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Maintenance you can trust</h2>
          </div>
        </FadeIn>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map((p) => (
            <FadeIn key={p.title}>
              <div className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><p.icon className="size-5" /></span>
                <div>
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{p.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
