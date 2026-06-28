import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"

export type Role =
  | "super_admin"   // Founder
  | "manager"       // Manager
  | "editor"        // Employee (office staff)
  | "employee"      // Engineer (field)
  | "subcontractor" // Contractor
  | "client"        // Customer
  | "guest"         // internal: logged-out / unknown

export interface User {
  id: number
  name: string
  email: string
  role: Role
  must_change_password?: number
}

// Storage value → operational label shown in the UI. The DB enum keeps its
// original names (no risky data migration); the brief's 7 roles are surfaced
// here as friendly labels.
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Founder",
  manager: "Manager",
  editor: "Employee",
  employee: "Engineer",
  subcontractor: "Contractor",
  client: "Customer",
  guest: "Guest",
}

// Founder + Manager get the whole CMS. The lower roles are scoped by module.
// ("admin" is the retired legacy tier — treated as Manager-equivalent until the
// data migration remaps the last rows, so nobody is locked out mid-deploy.)
const FULL_ACCESS: Role[] = ["super_admin", "manager"]
const OFFICE: Role = "editor" // Employee (office staff)
const ENGINEER: Role = "employee" // field engineer
const SUB: Role = "subcontractor" // contractor

// Which lower roles may see each CMS module (by route slug; "" = Command
// Centre). Founder + Manager always pass (handled in canAccess). Field staff
// live in /app/me + /app/field and only see the operational handful.
const MODULE_ACCESS: Record<string, Role[]> = {
  "": [OFFICE], // Command Centre
  leads: [OFFICE],
  clients: [OFFICE],
  jobs: [OFFICE, ENGINEER],
  schedule: [OFFICE, ENGINEER],
  engineers: [OFFICE],
  quotes: [OFFICE],
  contracts: [OFFICE],
  invoicing: [OFFICE],
  parts: [OFFICE, ENGINEER],
  compliance: [], // Founder + Manager only
  comms: [], // Founder + Manager only
  content: [OFFICE],
  chat: [OFFICE, ENGINEER, SUB],
  me: [OFFICE, ENGINEER, SUB],
  copilot: [OFFICE, ENGINEER],
  analytics: [], // Founder + Manager only
  assets: [OFFICE],
  settings: [], // Founder + Manager only (company, integrations, team)
}

// Roles that get into the /app dashboard at all. Customers use the public
// portal; guests get nothing.
export function canAccessApp(role: Role): boolean {
  return role !== "client" && role !== "guest"
}

// Can this role open this app route slug? "account"/"field" special; "settings"
// is now admin-only (Founder + Manager) and resolves via MODULE_ACCESS.
export function canAccess(role: Role, slug: string): boolean {
  if (FULL_ACCESS.includes(role) || (role as string) === "admin") return true
  // "My Account" is everyone's own personal hub. (Admin "Settings" — company,
  // integrations, team — is Founder + Manager only, handled by MODULE_ACCESS.)
  if (slug === "account") return canAccessApp(role)
  if (slug === "field") return [OFFICE, ENGINEER, SUB].includes(role)
  const allowed = MODULE_ACCESS[slug]
  if (!allowed) return false // unknown / placeholder module → Founder + Manager only
  return allowed.includes(role)
}

// Where a freshly-authenticated role should land.
export function roleHome(role: Role): string {
  if (role === "client") return "/portal"
  if (role === "guest") return "/login"
  // Field staff (Engineer, Contractor) go straight to their day.
  if (role === "employee" || role === "subcontractor") return "/app/me"
  return "/app" // Founder, Manager, Employee
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

// Read the persisted user once, synchronously, so the very first render already
// knows who is signed in.
function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("ego_user")
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    localStorage.removeItem("ego_user")
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate from storage in the initial state (not an effect): no logged-out
  // flash on the public site after a reload, and no transient bounce to /login.
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const loading = false

  const login = (u: User, token: string) => {
    localStorage.setItem("ego_user", JSON.stringify(u))
    localStorage.setItem("ego_token", token)
    localStorage.removeItem("ego_locked") // a fresh sign-in is never locked
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem("ego_user")
    localStorage.removeItem("ego_token")
    localStorage.removeItem("ego_locked")
    setUser(null)
  }

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem("ego_user", JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

 
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
