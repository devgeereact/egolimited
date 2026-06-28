import FadeIn from "@/components/ui/FadeIn"
import { Droplets, Zap, Flame, Sparkles, Trees, Hammer } from "lucide-react"

const SERVICES = [
  { icon: Droplets, title: "Plumbing", desc: "Leaks, taps, toilets, bathrooms and full installations." },
  { icon: Zap, title: "Electrical", desc: "Sockets, lighting, fault-finding, fuse boards and rewires." },
  { icon: Flame, title: "Gas & Heating", desc: "Boiler service & repair, radiators, and CP12 safety checks." },
  { icon: Sparkles, title: "Cleaning", desc: "End-of-tenancy, deep cleans and regular commercial cleaning." },
  { icon: Trees, title: "Gardening", desc: "Maintenance, clearance, hedges, lawns and tidy-ups." },
  { icon: Hammer, title: "General Repairs", desc: "Carpentry, doors, fixings and the odd-jobs list, sorted." },
]

export default function Services() {
  return (
    <section id="services" className="py-24">
      <div className="container-custom">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">What we do</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">One team for every job</h2>
            <p className="mt-4 text-slate-600">From a dripping tap to a full refit — homes and commercial premises, covered by one trusted team.</p>
          </div>
        </FadeIn>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <FadeIn key={s.title}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <s.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
