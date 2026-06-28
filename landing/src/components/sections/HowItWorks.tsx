import FadeIn from "@/components/ui/FadeIn"
import { MessageSquare, FileText, CalendarCheck, CheckCircle2 } from "lucide-react"

const STEPS = [
  { icon: MessageSquare, title: "Tell us the job", desc: "Call or send an enquiry. We'll ask a few quick questions." },
  { icon: FileText, title: "Get a clear quote", desc: "A fair, itemised price up front — no surprises." },
  { icon: CalendarCheck, title: "We schedule a visit", desc: "Pick a slot. You get a live tracking link for the job." },
  { icon: CheckCircle2, title: "Job done & invoiced", desc: "Work completed, signed off, and invoiced cleanly." },
]

export default function HowItWorks() {
  return (
    <section id="how" className="bg-slate-50 py-24">
      <div className="container-custom">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Simple, from start to finish</h2>
            <p className="mt-4 text-slate-600">You're kept in the loop the whole way — including a private link to track your job live.</p>
          </div>
        </FadeIn>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <FadeIn key={s.title}>
              <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-6">
                <span className="absolute right-5 top-5 text-4xl font-bold text-slate-100">{i + 1}</span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white"><s.icon className="size-5" /></span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
