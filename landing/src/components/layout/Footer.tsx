import { Wrench, Phone, Mail, LogIn } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-slate-900 py-14 text-slate-300">
      <div className="container-custom">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Wrench className="size-5" /></span>
              <span className="text-lg font-bold text-white">EGO LIMITED</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-slate-400">Trusted maintenance for homes and businesses — plumbing, electrical, heating, cleaning, gardening and repairs.</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Services</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Plumbing</li><li>Electrical</li><li>Gas & Heating</li><li>Cleaning & Gardening</li><li>General Repairs</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a href="tel:+441210000000" className="inline-flex items-center gap-2 hover:text-white"><Phone className="size-4" /> 0121 000 0000</a></li>
              <li><a href="mailto:office@egolimited.co.uk" className="inline-flex items-center gap-2 hover:text-white"><Mail className="size-4" /> office@egolimited.co.uk</a></li>
              <li><a href="/app/" className="inline-flex items-center gap-2 hover:text-white"><LogIn className="size-4" /> Staff sign in</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} EGO LIMITED · Field service for homes & commercial
        </div>
      </div>
    </footer>
  )
}
