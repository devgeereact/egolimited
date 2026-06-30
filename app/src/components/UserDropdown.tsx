"use client"

import { Link, useNavigate } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { User, ShieldCheck, Lock, Settings, LogOut, LogIn, Globe } from "lucide-react"

import { useAuth } from "@/store/auth.store"
import { atLeast } from "@/lib/roles"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function UserDropdown() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  async function onLogout() {
    await logout()
    navigate("/welcome", { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full h-10 w-10 p-0 overflow-hidden ml-2">
          <Avatar className="h-10 w-10 border-border rounded-full">
            <AvatarFallback>{user ? initials(user.name) : "?"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-3 rounded-xl shadow-xl">
        <DropdownMenuLabel className="rounded-xl mb-3 bg-muted/50 border border-border font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{user ? initials(user.name) : "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user ? user.name : "Not signed in"}</p>
              <p className="truncate text-xs text-muted-foreground">{user ? user.email : "guest"}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuItem asChild className="gap-2 h-9">
          <a href="/">
            <Globe className="!size-5" /> Visit website
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2" />

        {user ? (
          <>
            <DropdownMenuItem asChild className="gap-2 h-9">
              <Link to="/ego/account/profile">
                <User className="!size-5" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 h-9">
              <Link to="/ego/account/security">
                <ShieldCheck className="!size-5" /> Security & 2FA
              </Link>
            </DropdownMenuItem>
            {atLeast(user.role, "manager") && (
              <DropdownMenuItem asChild className="gap-2 h-9">
                <Link to="/ego/settings">
                  <Settings className="!size-5" /> Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild className="gap-2 h-9">
              <Link to="/ego/lock">
                <Lock className="!size-5" /> Lock screen
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuItem className="gap-2 h-9 text-destructive focus:text-destructive" onClick={onLogout}>
              <LogOut className="!size-5" /> Log out
            </DropdownMenuItem>
          </>
        ) : (
          <div className="mt-3">
            <Button asChild variant="default" className="w-full h-8 justify-center gap-2">
              <Link to="/ego/login">
                <LogIn className="size-4" /> Sign in
              </Link>
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
