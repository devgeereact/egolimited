import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCircle2, Mail, MessageSquare, Star, type LucideIcon } from "lucide-react"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface Note {
  type: string; tone: "info" | "warning" | "danger" | "success"
  title: string; description: string; to: string; created_at: string; unread: number
}

const ICON: Record<string, LucideIcon> = {
  email: Mail, message: MessageSquare, completed: CheckCircle2, review: Star,
}
const TONE: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  danger: "bg-red-500/15 text-red-600 dark:text-red-400",
}

export function NotificationDropdown() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Note[]>([])
  const [count, setCount] = useState(0)

  function load() {
    api<{ items: Note[]; count: number }>("/notifications")
      .then((r) => { setItems(r.items); setCount(r.count) })
      .catch(() => {})
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 30000) // live-ish: refresh every 30s
    return () => clearInterval(t)
  }, [])

  // Opening the bell marks everything shown as seen → badge clears.
  function onOpenChange(open: boolean) {
    if (open && count > 0) {
      setCount(0)
      setItems((xs) => xs.map((x) => ({ ...x, unread: 0 })))
      api("/notifications/seen", { method: "POST" }).catch(() => {})
    }
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <div className="relative">
          <Button variant="ghost" size="icon" className="rounded-full [&_svg]:size-5 h-10 w-10 p-0">
            <Bell />
          </Button>
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 rounded-xl border p-0 shadow-xl">
        <DropdownMenuLabel className="px-4 py-3">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <Bell className="size-6" /> Nothing yet — you're all caught up.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n, i) => {
              const Icon = ICON[n.type] ?? Bell
              return (
                <button key={i} onClick={() => navigate(n.to)}
                  className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60", n.unread && "bg-primary/[0.04]")}>
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONE[n.tone] ?? TONE.info)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                      {n.title}
                      {n.unread === 1 && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{n.description}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">{n.created_at?.slice(5, 16)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
