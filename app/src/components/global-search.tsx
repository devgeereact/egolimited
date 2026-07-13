"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/store/auth.store"
import { atLeast, type Role } from "@/lib/roles"
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command"
import {
  Search, ChevronRight, Gauge, BarChart3, Briefcase, CalendarDays, Contact, KanbanSquare, FileText, ScrollText,
  CreditCard, Inbox, Send, Quote, Megaphone, HardHat, Boxes, FileSignature,
  ShieldAlert, FileCheck2, BadgeCheck, Users, Settings2, KeyRound, type LucideIcon,
} from "lucide-react"

type Item = { label: string; to: string; icon: LucideIcon; min?: Role; keywords?: string }
type Section = { heading: string; items: Item[] }

// Real EGO destinations (mirrors the sidebar). Each carries the minimum role that may see it.
const SECTIONS: Section[] = [
  { heading: "Overview", items: [
    { label: "Today", to: "/ego/dashboard", icon: Gauge, keywords: "dashboard home" },
    { label: "Analytics", to: "/ego/analytics", icon: BarChart3, keywords: "reports export revenue charts kpi" },
  ]},
  { heading: "Operations", items: [
    { label: "Jobs", to: "/ego/jobs", icon: Briefcase },
    { label: "Task board", to: "/ego/tasks", icon: KanbanSquare, keywords: "kanban tasks" },
    { label: "Schedule", to: "/ego/schedule", icon: CalendarDays, keywords: "calendar diary" },
    { label: "Customers", to: "/ego/customers", icon: Contact, keywords: "contacts clients" },
  ]},
  { heading: "Money", items: [
    { label: "Invoices & quotes", to: "/ego/invoices", icon: FileText, keywords: "billing" },
    { label: "Quotes", to: "/ego/invoices?kind=quote", icon: ScrollText, keywords: "estimate" },
    { label: "Payments", to: "/ego/payments", icon: CreditCard, keywords: "paid bank transfer" },
  ]},
  { heading: "Workspace", items: [
    { label: "Inbox", to: "/ego/inbox", icon: Inbox, keywords: "email mail" },
    { label: "Reviews", to: "/ego/reviews", icon: Quote },
    { label: "Campaigns", to: "/ego/campaigns", icon: Send, min: "manager" },
  ]},
  { heading: "Service delivery", items: [
    { label: "Contracts & PPM", to: "/ego/contracts", icon: FileSignature, keywords: "planned maintenance" },
    { label: "Assets", to: "/ego/assets", icon: Boxes, keywords: "equipment plant" },
    { label: "RAMS", to: "/ego/rams", icon: FileCheck2, keywords: "risk assessment method statement compliance" },
    { label: "Certificates", to: "/ego/certificates", icon: BadgeCheck, keywords: "compliance qualification" },
    { label: "Incidents", to: "/ego/incidents", icon: ShieldAlert, keywords: "accident compliance" },
    { label: "Subcontractors", to: "/ego/subcontractors", icon: HardHat, keywords: "insurance compliance" },
  ]},
  { heading: "Admin", items: [
    { label: "Team", to: "/ego/team", icon: Users, min: "manager", keywords: "people staff" },
    { label: "Settings", to: "/ego/settings", icon: Settings2, min: "office", keywords: "company security" },
    { label: "Announcements", to: "/ego/announcements", icon: Megaphone, min: "manager" },
    { label: "Integrations", to: "/ego/integrations", icon: KeyRound, min: "founder", keywords: "smtp imap api keys" },
  ]},
]

// Quick create/jump actions — surfaced at the top of the palette.
const ACTIONS: Item[] = [
  { label: "New job", to: "/ego/jobs/new", icon: Briefcase, keywords: "create add raise" },
  { label: "New customer", to: "/ego/customers/new", icon: Contact, keywords: "create add" },
  { label: "Schedule a job", to: "/ego/schedule", icon: CalendarDays, keywords: "book slot assign" },
  { label: "Export reports", to: "/ego/analytics", icon: BarChart3, keywords: "csv download analytics" },
]

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((p) => !p) }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (to: string) => { setOpen(false); navigate(to) }
  const visible = SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => atLeast(user?.role, i.min ?? "office")) }))
    .filter((s) => s.items.length > 0)

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="h-10 w-10 rounded-full p-0 [&_svg]:size-5" aria-label="Search">
        <Search />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="border-b">
          <CommandInput placeholder="Search jobs, invoices, pages…" className="h-12" />
        </div>
        <CommandList className="max-h-[420px] overflow-y-auto">
          <CommandEmpty>
            <div className="py-10 text-center text-sm text-muted-foreground">No results found.</div>
          </CommandEmpty>
          <CommandGroup heading="Quick actions">
            {ACTIONS.map((a) => (
              <CommandItem key={`act-${a.to}-${a.label}`} value={`${a.label} ${a.keywords ?? ""}`} onSelect={() => runCommand(a.to)} className="group cursor-pointer">
                <a.icon className="mr-3 h-4 w-4 text-primary" />
                <span>{a.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          {visible.map((s, si) => (
            <React.Fragment key={s.heading}>
              {si > 0 && <CommandSeparator />}
              <CommandGroup heading={s.heading}>
                {s.items.map((i) => (
                  <CommandItem key={i.to} value={`${i.label} ${i.keywords ?? ""}`} onSelect={() => runCommand(i.to)} className="group cursor-pointer">
                    <i.icon className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span>{i.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
