import { NavLink, Outlet } from "react-router-dom"
import { UserRound, ShieldCheck, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/ego/account/profile", label: "Profile", icon: UserRound },
  { to: "/ego/account/security", label: "Security & 2FA", icon: ShieldCheck },
]

/** Account area chrome: a clean left sub-nav + content outlet, per design system. */
export default function AccountLayout() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your profile and sign-in security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
