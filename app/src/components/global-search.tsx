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
  Search, ChevronRight, Gauge, Briefcase, CalendarDays, Contact, KanbanSquare, FileText, ScrollText,
  CreditCard, Inbox, Send, Quote, Megaphone, Package, ClipboardList, Truck, HardHat, Boxes, FileSignature,
  ShieldAlert, FileCheck2, BadgeCheck, Users, Settings2, KeyRound, type LucideIcon,
} from "lucide-react"

type Item = { label: string; to: string; icon: LucideIcon; min?: Role; keywords?: string }
type Section = { heading: string; items: Item[] }

// Real EGO destinations (mirrors the sidebar). Each carries the minimum role that may see it.
const SECTIONS: Section[] = [
  { heading: "Overview", items: [{ label: "Dashboard", to: "/ego/dashboard", icon: Gauge }] },
  { heading: "Operations", items: [
    { label: "Jobs", to: "/ego/jobs", icon: Briefcase },
    { label: "Schedule", to: "/ego/schedule", icon: CalendarDays },
    { label: "Contacts", to: "/ego/contacts", icon: Contact, keywords: "customers team" },
    { label: "Task Board", to: "/ego/tasks", icon: KanbanSquare, keywords: "kanban" },
  ]},
  { heading: "Finance", items: [
    { label: "Invoices", to: "/ego/invoices", icon: FileText },
    { label: "Quotes", to: "/ego/quotes", icon: ScrollText },
    { label: "Payments", to: "/ego/payments", icon: CreditCard },
  ]},
  { heading: "Workspace", items: [
    { label: "Email", to: "/ego/inbox", icon: Inbox, keywords: "inbox mail" },
    { label: "Campaigns", to: "/ego/campaigns", icon: Send, min: "manager" },
    { label: "Reviews", to: "/ego/reviews", icon: Quote },
    { label: "Announcements", to: "/ego/announcements", icon: Megaphone, min: "manager" },
  ]},
  { heading: "Procurement", items: [
    { label: "Parts", to: "/ego/parts", icon: Package },
    { label: "Purchase Orders", to: "/ego/purchase-orders", icon: ClipboardList },
    { label: "Suppliers", to: "/ego/suppliers", icon: Truck },
    { label: "Subcontractors", to: "/ego/subcontractors", icon: HardHat },
  ]},
  { heading: "Assets & Compliance", items: [
    { label: "Assets", to: "/ego/assets", icon: Boxes },
    { label: "Contracts & PPM", to: "/ego/contracts", icon: FileSignature },
    { label: "Incidents", to: "/ego/incidents", icon: ShieldAlert },
    { label: "RAMS", to: "/ego/rams", icon: FileCheck2 },
    { label: "Certificates", to: "/ego/certificates", icon: BadgeCheck },
  ]},
  { heading: "Admin", items: [
    { label: "Team", to: "/ego/team", icon: Users, min: "manager" },
    { label: "Settings", to: "/ego/settings", icon: Settings2, min: "office" },
    { label: "Integrations", to: "/ego/integrations", icon: KeyRound, min: "founder" },
  ]},
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
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="h-10 w-10 rounded-full p-0 [&_svg]:size-5">
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
