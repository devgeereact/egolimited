import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { company as defaults } from "./content"
import { API_BASE } from "@/lib/api"

// Live company info for the public site. The values in content.ts are the
// build-time DEFAULTS (and the source for SSR/crawlers/JSON-LD); at runtime we
// fetch the public company.php endpoint and merge the live, CMS-edited contact
// details over them. Editing the company profile in the CMS therefore updates
// every landing automatically — nobody touches the landing files.
export type Company = typeof defaults

// Public endpoint keys (snake_case) → content.ts company shape. Only non-empty
// live values override, so a blank setting never wipes a good default and the
// site still works if the fetch fails or hasn't returned yet.
function merge(base: Company, data: Record<string, unknown>): Company {
  const pick = (key: string, fallback: string): string => {
    const v = typeof data[key] === "string" ? (data[key] as string).trim() : ""
    return v !== "" ? v : fallback
  }
  return {
    ...base,
    name: pick("company_name", base.name),
    tagline: pick("tagline", base.tagline),
    email: pick("company_email", base.email),
    phone: pick("company_phone", base.phone),
    emergencyPhone: pick("emergency_phone", base.emergencyPhone),
    address: pick("company_address", base.address),
    hours: pick("working_hours", base.hours),
  }
}

const CompanyContext = createContext<Company>(defaults)

/** Live, CMS-driven company info (falls back to content.ts defaults). */
export function useCompany(): Company {
  return useContext(CompanyContext)
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Company>(defaults)

  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/company.php`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && typeof data === "object") {
          setValue((prev) => merge(prev, data as Record<string, unknown>))
        }
      })
      .catch(() => {
        /* keep static defaults — the site must never depend on this fetch */
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  )
}
