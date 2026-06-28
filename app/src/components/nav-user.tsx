"use client"

import { useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, User, Settings2, ShieldCheck, Lock, LogOutIcon } from "lucide-react"

import { useAuth } from "@/store/auth.store"
import { atLeast } from "@/lib/roles"

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

export function NavUser({ user }: { user: { name: string; email: string } }) {
  const { isMobile, state } = useSidebar()
  const collapsed = state === "collapsed"
  const navigate = useNavigate()
  const { user: authUser, logout } = useAuth()
  const canSettings = atLeast(authUser?.role, "manager")

  async function onLogout() {
    await logout()
    navigate("/welcome", { replace: true })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {collapsed ? (
              <button className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mx-auto">
                <Avatar className="h-9 w-9 rounded-xl"><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
              </button>
            ) : (
              <SidebarMenuButton size="lg" className="bg-muted px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <Avatar className="h-9 w-9 rounded-xl shrink-0"><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 p-3 rounded-xl shadow-xl" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal rounded-xl border mb-3 bg-muted/50">
              <div className="flex items-center gap-2 text-left text-sm p-2">
                <Avatar className="h-10 w-10"><AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback></Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 h-9" onClick={() => navigate("/ego/account/profile")}>
              <User className="!size-5" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 h-9" onClick={() => navigate("/ego/account/security")}>
              <ShieldCheck className="!size-5" /> Security & 2FA
            </DropdownMenuItem>
            {canSettings && (
              <DropdownMenuItem className="gap-2 h-9" onClick={() => navigate("/ego/settings")}>
                <Settings2 className="!size-5" /> Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="gap-2 h-9" onClick={() => navigate("/ego/lock")}>
              <Lock className="!size-5" /> Lock screen
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem className="gap-2 h-9 text-destructive focus:text-destructive" onClick={onLogout}>
              <LogOutIcon className="!size-5" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
