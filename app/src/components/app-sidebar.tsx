"use client"

import {
  Gauge,
  Settings2,
  Briefcase,
  Users,
  UsersRound,
  CalendarDays,
  FileText,
  CreditCard,
  Smartphone,
  Globe,
  KeyRound,
  Inbox,
  KanbanSquare,
  Contact,
  GanttChartSquare,
  Quote,
  Truck,
  HardHat,
  Package,
  ClipboardList,
  Boxes,
  Megaphone,
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

const NAV: EgoSection[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "ego/dashboard", icon: Gauge }],
  },
  {
    label: "Operations",
    items: [
      { title: "Jobs", url: "ego/jobs", icon: Briefcase },
      { title: "Schedule", url: "ego/schedule", icon: CalendarDays },
      { title: "Customers", url: "ego/customers", icon: Users },
      { title: "Task Board", url: "apps/task-board", icon: KanbanSquare },
    ],
  },
  {
    label: "Procurement",
    items: [
      { title: "Parts", url: "ego/parts", icon: Package },
      { title: "Purchase Orders", url: "ego/purchase-orders", icon: ClipboardList },
      { title: "Suppliers", url: "ego/suppliers", icon: Truck },
      { title: "Subcontractors", url: "ego/subcontractors", icon: HardHat },
    ],
  },
  {
    label: "Assets",
    items: [
      { title: "Assets", url: "ego/assets", icon: Boxes },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Invoices", url: "ego/invoices", icon: FileText },
      { title: "Payments", url: "ego/payments", icon: CreditCard },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "Email", url: "apps/email", icon: Inbox },
      { title: "Contacts", url: "ego/contacts", icon: Contact },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Activity", url: "ego/activity", icon: GanttChartSquare },
      { title: "Reviews", url: "ego/reviews", icon: Quote },
    ],
  },
  {
    label: "Surfaces",
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
  {
    label: "Administration",
    items: [
      { title: "Team", url: "ego/team", icon: UsersRound, min: "manager" },
      { title: "Announcements", url: "ego/announcements", icon: Megaphone, min: "manager" },
      { title: "Settings", url: "ego/settings", icon: Settings2, min: "manager" },
      { title: "Integrations", url: "ego/integrations", icon: KeyRound, min: "founder" },
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

        <SidebarFooter className="border-t h-16 justify-center">
          <NavUser user={{ name: user?.name ?? "Admin", email: user?.email ?? "" }} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </div>
  )
}
