import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { company as defaults } from "./content"
import { API_BASE } from "@/lib/api"

export type Company = typeof defaults

function merge(base: Company, data: Record<string, unknown>): Company {
  const pick = (key: string, fallback: string): string => {
    const v = typeof data[key] === "string" ? (data[key] as string).trim() : ""
    return v !== "" ? v : fallback
  }
  return {
    ...base,
    name: pick("company_name", base.name),
    email: pick("company_email", base.email),
    phone: pick("company_phone", base.phone),
    emergencyPhone: pick("emergency_phone", base.emergencyPhone),
    address: pick("company_address", base.address),
    hours: pick("working_hours", base.hours),
  }
}

const CompanyContext = createContext<Company>(defaults)
export function useCompany(): Company { return useContext(CompanyContext) }

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Company>(defaults)
  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/company.php`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && typeof data === "object") setValue((prev) => merge(prev, data as Record<string, unknown>))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}
