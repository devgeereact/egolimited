"use client"

import {
  Gauge,
  BarChart3,
  Settings2,
  Briefcase,
  CalendarDays,
  FileText,
  CreditCard,
  Smartphone,
  Globe,
  KeyRound,
  Inbox,
  Contact,
  Quote,
  Megaphone,
  Send,
  FileSignature,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react"

import { NavMain, type NavSection } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/store/auth.store"
import { atLeast, type Role } from "@/lib/roles"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ScrollArea } from "./ui/scroll-area"

// Each item/section carries the minimum role that may see it. The SERVER still
// enforces every request — this only keeps the nav honest per role.
type EgoItem = { title: string; url: string; icon?: LucideIcon; min?: Role; items?: EgoItem[] }
type EgoSection = { label?: string; min?: Role; items: EgoItem[] }

/**
 * NAVIGATION — 21 items became 13, grouped by how often the office actually touches them.
 *
 * The old sidebar gave a rarely-opened compliance document locker the same visual weight as Jobs.
 * Nine sections and twenty-one destinations for a team of about twenty people is not a menu, it's
 * an inventory. What changed and why:
 *
 *   Quotes + Invoices  → ONE item. They were two nav entries pointing at the SAME component
 *                        behind two routes, differing by a prop. Now one screen, kind in the URL.
 *   Contacts           → GONE. It was a third implementation of Customers, plus a duplicate Team
 *                        tab. Both already exist as real pages; the route now redirects there.
 *   Task Board         → a child of Jobs. It's a view of work, not a separate department.
 *   Subcontractors     → moved under Compliance, which is what it's actually for: insurance and
 *                        certification expiry on the people we send to site.
 *   Assets, Contracts  → one "Contracts & assets" group. Assets only exist to be maintained
 *                        under a contract.
 *   RAMS/Certs/Incidents → collapsed into one Compliance group instead of three top-level items.
 *   Announcements      → under Admin. It's a thing managers publish, not a thing anyone reads
 *                        from the sidebar (the notification bell already surfaces them).
 *
 * Everything is still reachable — this is about weight and grouping, not removal. The only page
 * actually deleted is Contacts, because it was a duplicate.
 */
const NAV: EgoSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Today", url: "ego/dashboard", icon: Gauge },
      { title: "Analytics", url: "ego/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Jobs",
        url: "ego/jobs",
        icon: Briefcase,
        items: [
          { title: "All jobs", url: "ego/jobs" },
          { title: "Task board", url: "ego/tasks" },
        ],
      },
      { title: "Schedule", url: "ego/schedule", icon: CalendarDays },
      { title: "Customers", url: "ego/customers", icon: Contact },
    ],
  },
  {
    label: "Money",
    items: [
      { title: "Invoices & quotes", url: "ego/invoices", icon: FileText },
      { title: "Payments", url: "ego/payments", icon: CreditCard },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Inbox", url: "ego/inbox", icon: Inbox },
      { title: "Reviews", url: "ego/reviews", icon: Quote },
      {
        // Campaigns/Leads/Automation were three fragments of ONE process: turning a stranger into
        // a paying job. Sequences are a TOOL you apply to contacts, not a place you go.
        title: "Pipeline",
        url: "ego/pipeline",
        icon: Send,
        min: "manager",
        items: [
          { title: "Pipeline", url: "ego/pipeline" },
          { title: "Sequences", url: "ego/campaigns" },
        ],
      },
    ],
  },
  {
    label: "Service delivery",
    items: [
      {
        title: "Contracts & assets",
        url: "ego/contracts",
        icon: FileSignature,
        items: [
          { title: "Contracts & PPM", url: "ego/contracts" },
          { title: "Assets", url: "ego/assets" },
        ],
      },
      {
        title: "Compliance",
        url: "ego/rams",
        icon: BadgeCheck,
        items: [
          { title: "RAMS", url: "ego/rams" },
          { title: "Certificates", url: "ego/certificates" },
          { title: "Incidents", url: "ego/incidents" },
          { title: "Subcontractors", url: "ego/subcontractors" },
        ],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Settings", url: "ego/settings", icon: Settings2, min: "office" },
      { title: "Announcements", url: "ego/announcements", icon: Megaphone, min: "manager" },
      { title: "Integrations", url: "ego/integrations", icon: KeyRound, min: "founder" },
    ],
  },
  {
    label: "Surfaces",
    min: "founder", // backstage preview of the engineer/portal surfaces — owner only
    items: [
      {
        title: "Engineer App",
        url: "#",
        icon: Smartphone,
        items: [
          { title: "Today", url: "ego/engineer/today" },
          { title: "My Jobs", url: "ego/engineer/jobs" },
          { title: "Job (Field)", url: "ego/engineer/job" },
          { title: "Profile", url: "ego/engineer/profile" },
        ],
      },
      {
        title: "Customer Portal",
        url: "#",
        icon: Globe,
        items: [
          { title: "Track Job", url: "ego/portal/track" },
          { title: "Contact", url: "ego/portal/contact" },
        ],
      },
    ],
  },
]

// Drop anything the current role may not see; hide a section once it's empty.
function visibleNav(role: Role | null | undefined): NavSection[] {
  const allow = (min?: Role) => atLeast(role, min ?? "office")
  return NAV
    .filter((s) => allow(s.min))
    .map((s) => ({ label: s.label, items: s.items.filter((i) => allow(i.min)) }))
    .filter((s) => s.items.length > 0)
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  onHoverChange?: (value: boolean) => void
}

export function AppSidebar({ onHoverChange, ...props }: AppSidebarProps) {
  const { user } = useAuth()
  const sections = visibleNav(user?.role)
  return (
    <div
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <Sidebar collapsible="icon" {...props} className="h-screen z-50">
        <SidebarHeader className="border-b h-16">
          <SidebarMenuButton size="lg" asChild className="px-2 py-3">
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center mx-auto rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Gauge className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">EGO LIMITED</span>
                  <span className="truncate text-xs">Field Service</span>
                </div>
              </a>
            </SidebarMenuButton>
        </SidebarHeader>

        <SidebarContent className="overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex min-h-full flex-col">
             <NavMain sections={sections} />
            </div>
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="sticky bottom-0 z-10 h-16 justify-center border-t bg-sidebar">
          <NavUser user={{ name: user?.name ?? "Admin", email: user?.email ?? "" }} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </div>
  )
}
