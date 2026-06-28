import FadeIn from "@/components/ui/FadeIn"
import { ArrowRight, Phone, ShieldCheck, Star, Clock } from "lucide-react"

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pb-24 pt-36">
      <div className="absolute -left-32 -top-32 -z-10 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[120px]" />
      <div className="absolute -bottom-32 -right-32 -z-10 h-[500px] w-[500px] rounded-full bg-sky-400/15 blur-[120px]" />

      <div className="container-custom text-center">
        <FadeIn>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <ShieldCheck className="size-4" /> Vetted, fully-insured engineers
          </span>
        </FadeIn>

        <FadeIn>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Reliable maintenance for your <span className="text-blue-600">home & business</span>
          </h1>
        </FadeIn>

        <FadeIn>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Plumbing, electrical, heating, cleaning, gardening and general repairs — booked fast,
            done right, and tracked live from quote to completion.
          </p>
        </FadeIn>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#contact" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700">
            Request a free quote <ArrowRight className="size-5" />
          </a>
          <a href="tel:+441210000000" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-7 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50">
            <Phone className="size-5" /> Call us
          </a>
        </div>

        <FadeIn>
          <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-amber-400 text-amber-400" /> 4.9 average rating</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-blue-600" /> Same-week appointments</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-emerald-600" /> Guaranteed workmanship</span>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
