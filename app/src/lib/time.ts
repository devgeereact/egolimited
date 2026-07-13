/**
 * EGO LIMITED — one way to say "when".
 *
 * Before this there were five: `slice(0, 10)` (date, no time — so an announcement told you the day
 * it went out but not the hour), `slice(5, 16)` ("07-13 08:01" — no year, ambiguous), raw MySQL
 * strings dumped straight into the page, and two different toLocaleString calls. A person reading
 * the inbox could not tell whether a message arrived this morning or last March.
 *
 * The rule everywhere now: say it in words a person would use ("2 hours ago", "Yesterday, 14:32"),
 * and always keep the exact timestamp one hover away. Recent things get relative time because that
 * is what you actually want to know; older things get the date, because "47 days ago" is not useful.
 */

/** MySQL gives us "2026-07-13 08:01:22" (server time, already London). Safari refuses that format. */
export function toDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"))
  return Number.isNaN(d.getTime()) ? null : d
}

const HHMM: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false }

/** The full, unambiguous thing — for tooltips and anywhere precision matters. "13 Jul 2026, 08:01" */
export function formatExact(s: string | null | undefined): string {
  const d = toDate(s)
  if (!d) return "—"
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", ...HHMM })
}

/**
 * How a person would say it. Always includes a TIME for anything recent — the whole point is being
 * able to tell that an email went out at 08:01 rather than merely "on Monday".
 */
export function formatWhen(s: string | null | undefined): string {
  const d = toDate(s)
  if (!d) return "—"

  const now = new Date()
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000)
  const time = d.toLocaleTimeString("en-GB", HHMM)

  if (mins < 0) {
    // Scheduled for the future (a queued campaign step, a booked job).
    const ahead = Math.abs(mins)
    if (ahead < 60) return `in ${ahead} min`
    if (ahead < 60 * 24) return `at ${time}`
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`
  }

  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const daysApart = Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / 86_400_000)

  if (daysApart === 0) {
    const hrs = Math.floor(mins / 60)
    return hrs === 1 ? `1 hour ago · ${time}` : `${hrs} hours ago · ${time}`
  }
  if (daysApart === 1) return `Yesterday, ${time}`
  if (daysApart < 7) return `${d.toLocaleDateString("en-GB", { weekday: "long" })}, ${time}`
  if (d.getFullYear() === now.getFullYear())
    return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${time}`
}

/** Compact form for dense tables, where a full sentence would crowd the row. Still carries the time. */
export function formatShort(s: string | null | undefined): string {
  const d = toDate(s)
  if (!d) return "—"
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString("en-GB", HHMM)
  if (d.getFullYear() === now.getFullYear())
    return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("en-GB", HHMM)}`
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })} ${d.toLocaleTimeString("en-GB", HHMM)}`
}
