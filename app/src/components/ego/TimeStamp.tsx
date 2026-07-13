import { cn } from "@/lib/utils"
import { formatExact, formatShort, formatWhen } from "@/lib/time"

/**
 * When something happened. Used everywhere a date is shown, so the answer is always the same shape.
 *
 * Renders a real <time> element: the machine-readable timestamp is in `dateTime`, the exact
 * date and time is always in the tooltip, and the visible text is what a person would actually say.
 * So "2 hours ago · 08:01" on screen, "13 Jul 2026, 08:01" on hover — you never have to choose
 * between readable and precise.
 */
export function TimeStamp({
  value,
  variant = "when",
  className,
  prefix,
}: {
  value: string | null | undefined
  /** `when` = conversational (feeds, messages). `short` = compact (dense table cells). */
  variant?: "when" | "short"
  className?: string
  /** e.g. "Sent" → "Sent 2 hours ago · 08:01" */
  prefix?: string
}) {
  if (!value) return <span className={cn("text-muted-foreground", className)}>—</span>

  const text = variant === "short" ? formatShort(value) : formatWhen(value)
  const exact = formatExact(value)

  return (
    <time
      dateTime={value.replace(" ", "T")}
      title={exact}
      className={cn("tabular-nums", className)}
    >
      {prefix ? `${prefix} ${text}` : text}
    </time>
  )
}
