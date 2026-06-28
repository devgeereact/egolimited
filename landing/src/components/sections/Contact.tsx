import { useState } from "react"
import FadeIn from "@/components/ui/FadeIn"
import { Phone, Mail, MapPin, Clock, Loader2, CheckCircle2 } from "lucide-react"

export default function Contact() {
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !message.trim()) { setError("Please add your name and a short message."); return }
    setBusy(true)
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim(), message: message.trim() }),
      })
      if (!res.ok) throw new Error("Something went wrong")
      setDone(true)
    } catch {
      setError("Couldn't send right now — please call us on 0121 000 0000.")
    } finally { setBusy(false) }
  }

  return (
    <section id="contact" className="bg-slate-50 py-24">
      <div className="container-custom">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Details */}
          <FadeIn>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Get in touch</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Request a free quote</h2>
              <p className="mt-4 max-w-md text-slate-600">Tell us what you need. We'll get back to you quickly with a fair, no-obligation quote.</p>

              <div className="mt-8 space-y-4 text-sm">
                <a href="tel:+441210000000" className="flex items-center gap-3 text-slate-700 hover:text-blue-600"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Phone className="size-5" /></span> 0121 000 0000</a>
                <a href="mailto:office@egolimited.co.uk" className="flex items-center gap-3 text-slate-700 hover:text-blue-600"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Mail className="size-5" /></span> office@egolimited.co.uk</a>
                <p className="flex items-center gap-3 text-slate-700"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><MapPin className="size-5" /></span> Unit 4, Trade Park, Birmingham B6 7EU</p>
                <p className="flex items-center gap-3 text-slate-700"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Clock className="size-5" /></span> Mon–Sat, 8am–6pm</p>
              </div>
            </div>
          </FadeIn>

          {/* Form */}
          <FadeIn>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {done ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CheckCircle2 className="size-12 text-emerald-500" />
                  <h3 className="text-lg font-semibold text-slate-900">Thanks — we've got it</h3>
                  <p className="text-sm text-slate-600">A member of the team will be in touch shortly.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Your name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone or email</label>
                    <input value={contact} onChange={(e) => setContact(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="So we can reach you" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">What do you need?</label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Leaking kitchen tap, and a radiator that won't heat up." />
                  </div>
                  {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                  <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                    {busy && <Loader2 className="size-4 animate-spin" />} Send enquiry
                  </button>
                </form>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
