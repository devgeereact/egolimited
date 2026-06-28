import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { Construction } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

/**
 * EGO LIMITED page scaffold. Consistent placeholder for new screens before
 * their real content is built. Follows PULSE UI tokens (see
 * docs/PULSE-UI-DESIGN-SYSTEM.md): Card, semantic colors, lucide icons.
 */
export interface PageSkeletonProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Short tag, e.g. "Admin", "Engineer", "Customer", "Phase 2". */
  area?: string
  /** Bullet list of what this screen will contain. */
  todo?: string[]
  children?: React.ReactNode
  className?: string
}

export default function PageSkeleton({
  title,
  description,
  icon: Icon = Construction,
  area,
  todo,
  children,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-6 p-4 md:p-6", className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              {title}
            </h1>
            {area ? <Badge variant="secondary">{area}</Badge> : null}
            <Badge variant="ghost">Scaffold</Badge>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      {/* Body: either provided children or a placeholder with the to-build list */}
      {children ?? (
        <Card>
          <CardContent className="p-6">
            <p className="mb-4 text-sm text-muted-foreground">
              This screen is scaffolded. Content to build:
            </p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {(todo ?? ["Layout", "Data", "Actions", "States"]).map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 rounded-md border border-dashed p-3 text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
