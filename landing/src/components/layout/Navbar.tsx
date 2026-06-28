import { useEffect, useState } from "react"
import { Menu, X, Wrench, LogIn } from "lucide-react"

const APP_URL = "/app/"

const sections = [
  { id: "services", label: "Services" },
  { id: "how", label: "How it works" },
  { id: "why", label: "Why us" },
  { id: "contact", label: "Contact" },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
      sections.forEach((section) => {
        const el = document.getElementById(section.id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 150 && rect.bottom >= 150) setActive(section.id)
        }
      })
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-white/90 shadow-sm backdrop-blur" : "bg-transparent"}`}>
      <div className="container-custom flex items-center justify-between py-4">
        <a href="#hero" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Wrench className="size-5" /></span>
          <span className="text-lg font-bold tracking-tight text-slate-900">EGO LIMITED</span>
        </a>

        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          {sections.map((item) => (
            <a key={item.id} href={`#${item.id}`}
              className={`rounded-full px-4 py-2 transition ${active === item.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={APP_URL} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900">
            <LogIn className="size-4" /> Staff sign in
          </a>
          <a href="#contact" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
            Request a quote
          </a>
        </div>

        <button className="text-slate-900 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white lg:hidden">
          <div className="flex flex-col gap-3 p-6 text-sm font-medium">
            {sections.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={() => setMobileOpen(false)} className="text-slate-700 hover:text-slate-900">{item.label}</a>
            ))}
            <a href={APP_URL} className="inline-flex items-center gap-1.5 text-slate-700"><LogIn className="size-4" /> Staff sign in</a>
            <a href="#contact" onClick={() => setMobileOpen(false)} className="mt-2 rounded-lg bg-blue-600 px-5 py-2.5 text-center font-semibold text-white">Request a quote</a>
          </div>
        </div>
      )}
    </header>
  )
}
