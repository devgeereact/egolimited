import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCircle2, Mail, MessageSquare, Star, type LucideIcon } from "lucide-react"

import { api } from "@/lib/api"
import { useApi, invalidate, queryKeyFor } from "@/lib/query"
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

const NOTIFICATIONS = "/notifications"

export function NotificationDropdown() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Cached + deduped + polled every 30s in the background — see lib/query.ts.
  const { data } = useApi<{ items: Note[]; count: number }>(NOTIFICATIONS, { refetchInterval: 30000 })
  // Derived straight from the cache — no mirror copy in local state. Copying it into useState
  // meant a setState inside an effect on every poll: an extra render pass, and a second source
  // of truth that could drift from the cache.
  const items = data?.items ?? []
  const count = data?.count ?? 0

  // Opening the bell marks everything shown as seen → badge clears. Write the cleared state
  // straight into the cache so the badge clears instantly, then confirm with the server.
  function onOpenChange(open: boolean) {
    if (!open || count === 0) return
    qc.setQueryData(queryKeyFor(NOTIFICATIONS), (old: { items: Note[]; count: number } | undefined) =>
      old ? { items: old.items.map((x) => ({ ...x, unread: 0 })), count: 0 } : old
    )
    api("/notifications/seen", { method: "POST" })
      .then(() => invalidate(NOTIFICATIONS))
      .catch(() => invalidate(NOTIFICATIONS)) // failed? re-sync rather than lie about the badge
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <div className="relative">
          <Button variant="ghost" size="icon" className="rounded-full [&_svg]:size-5 h-10 w-10 p-0" aria-label="Notifications">
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
