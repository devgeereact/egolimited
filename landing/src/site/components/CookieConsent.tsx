import { useState } from "react"
import { Link } from "react-router-dom"

// GDPR/PECR cookie notice. The site uses only essential cookies + local storage by
// default, so consent is recorded and non-essential (analytics) would be gated on
// "accepted". Choice is remembered in local storage; the banner then stays hidden.
const KEY = "ego_cookie_consent" // "accepted" | "essential"

export default function CookieConsent() {
  // Lazy initialiser rather than a mount effect: the answer is knowable on the very first render,
  // so reading it in an effect only bought an extra render and a visible banner flash.
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(KEY)
    } catch {
      return false // storage blocked — don't nag
    }
  })

  function choose(value: "accepted" | "essential") {
    try {
      localStorage.setItem(KEY, value)
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          We use essential cookies to make this site and your job tracker work, and — only with your
          consent — a little analytics to improve it. See our{" "}
          <Link to="/cookies" className="font-medium text-foreground underline underline-offset-2">
            Cookie policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
