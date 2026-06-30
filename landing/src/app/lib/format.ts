// Money is stored in pence everywhere. Format for display only.
export function gbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format((pence || 0) / 100)
}

export function poundsToPence(pounds: string | number): number {
  const n = typeof pounds === "string" ? parseFloat(pounds) : pounds
  // Scale via a fixed-decimal string first so IEEE-754 error (e.g. 1.005 * 100
  // = 100.49999…) doesn't round the wrong way.
  return Number.isFinite(n) ? Math.round(Number((n * 100).toFixed(4))) : 0
}

export function shortDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso.replace(" ", "T"))
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// Whole days from today to the given date. Negative means the date has passed.
// Returns null when there is no usable date. Used for expiry / renewal / service
// countdowns across the operations modules.
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso.replace(" ", "T"))
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

// Human-friendly countdown label, e.g. "12d", "today", "3d ago".
export function countdownLabel(days: number | null): string {
  if (days === null) return "—"
  if (days === 0) return "today"
  return days > 0 ? `${days}d` : `${Math.abs(days)}d ago`
}

// Time of day, e.g. "09:30". Used by the staff schedule / day view.
export function shortTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso.replace(" ", "T"))
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

// Day heading, e.g. "Mon 16 Jun". Groups jobs by day in the schedule.
export function dayLabel(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso.replace(" ", "T"))
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

// True if the date falls on today.
export function isToday(iso?: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso.replace(" ", "T"))
  if (isNaN(d.getTime())) return false
  return d.toDateString() === new Date().toDateString()
}

// First name only, for friendly greetings.
export function firstName(name?: string | null): string {
  return (name ?? "").trim().split(/\s+/)[0] || ""
}
