"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

import {
  Search,
  LayoutDashboard,
  BarChart3,
  BriefcaseBusiness,
  User,
  CreditCard,
  Settings,
  ChevronRight,
} from "lucide-react"

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()

  // Keyboard Shortcut (Ctrl + K / Cmd + K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", down)

    return () => {
      document.removeEventListener("keydown", down)
    }
  }, [])

  const runCommand = (callback: () => void) => {
    setOpen(false)
    callback()
  }

  return (
    <>
      {/* Icon Search Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="rounded-full [&_svg]:size-5 h-10 w-10 p-0
        "
      >
        <Search/>
      </Button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="border-b">
          <CommandInput
            placeholder="Search pages, apps, settings..."
            className="h-12"
          />
        </div>

        <CommandList className="max-h-[420px] overflow-y-auto">
          <CommandEmpty>
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          </CommandEmpty>

          {/* Dashboard */}
          <CommandGroup heading="Dashboard">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/"))}
              className="group cursor-pointer"
            >
              <LayoutDashboard className="mr-3 h-4 w-4 text-sky-500" />
              <span>Dashboard</span>
              <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/analytics"))}
              className="group cursor-pointer"
            >
              <BarChart3 className="mr-3 h-4 w-4 text-violet-500" />
              <span>Analytics</span>
              <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/crm"))}
              className="group cursor-pointer"
            >
              <BriefcaseBusiness className="mr-3 h-4 w-4 text-emerald-500" />
              <span>CRM</span>
              <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Account */}
          <CommandGroup heading="Account">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/profile"))}
              className="group cursor-pointer"
            >
              <User className="mr-3 h-4 w-4 text-orange-500" />
              <span>Profile</span>
              <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/billing"))}
              className="group cursor-pointer"
            >
              <CreditCard className="mr-3 h-4 w-4 text-pink-500" />
              <span>Billing</span>
              <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/settings"))}
              className="group cursor-pointer"
            >
              <Settings className="mr-3 h-4 w-4 text-gray-500" />
              <span>Settings</span>
              <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}