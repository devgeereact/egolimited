import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

/**
 * Cookie and browser-storage notice (UK GDPR / PECR).
 *
 * WHAT THIS SITE ACTUALLY STORES, as of the September 2026 audit:
 *   - `ego_cookie_consent`  this record itself
 *   - `theme`               light or dark, set by next-themes
 *   - `ego_token`/`ego_user` only after a sign-in, on the sign-in path
 * No analytics, no advertising, no tag manager, no session replay. That was checked
 * against the source and again in a browser: a fresh visit to the home page sets no
 * cookies at all, and the only third-party requests are the Google Fonts stylesheet.
 *
 * The previous version of this banner offered to accept "a little analytics to improve
 * it". There was no analytics, and there never had been, so it was asking permission for
 * something that could not happen. Consent has to describe the real thing or it is not
 * consent. It now describes what runs, and keeps the switch that WOULD gate an optional
 * script, so the day one is added it is already wired to a real answer.
 *
 * A stored answer carries the notice version it was given against. Bump VERSION when the
 * wording or the categories change and everyone is asked again, which is the correct
 * behaviour and the reason a bare "accepted" string was not good enough.
 */
const KEY = "ego_cookie_consent"
const VERSION = 2

export type CookieChoice = "essential" | "optional"

interface StoredConsent {
  choice: CookieChoice
  version: number
  at: string // ISO timestamp: when this answer was given
}

function readConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<StoredConsent>
    // v1 stored the bare strings "accepted" | "essential" against different wording.
    // Anything that is not a current-version record counts as no answer, so the visitor
    // is asked again rather than held to a promise about a notice they never read.
    if (v.version !== VERSION) return null
    if (v.choice !== "essential" && v.choice !== "optional") return null
    return v as StoredConsent
  } catch {
    return null // storage blocked or corrupt: fail safe, treat as no consent
  }
}

/**
 * The gate for any optional (non-essential) script or storage added later. It returns
 * false unless the visitor has actively said yes, so forgetting to handle the
 * "no answer yet" case cannot leak into loading something.
 */
export function optionalStorageAllowed(): boolean {
  return readConsent()?.choice === "optional"
}

/** Reopen the banner so a visitor can change their mind. Wired to the footer link. */
const REOPEN_EVENT = "ego:cookie-preferences"
export function openCookiePreferences() {
  window.dispatchEvent(new Event(REOPEN_EVENT))
}

export default function CookieConsent() {
  // Answerable on the first render, so no mount effect and no banner flash.
  const [show, setShow] = useState(() => readConsent() === null)

  // Reopening is the withdrawal route. PECR expects changing your mind to be as easy as
  // giving the answer was, and before this there was no way back to the banner at all.
  useEffect(() => {
    const reopen = () => setShow(true)
    window.addEventListener(REOPEN_EVENT, reopen)
    return () => window.removeEventListener(REOPEN_EVENT, reopen)
  }, [])

  function choose(choice: CookieChoice) {
    try {
      const record: StoredConsent = { choice, version: VERSION, at: new Date().toISOString() }
      localStorage.setItem(KEY, JSON.stringify(record))
    } catch {
      /* storage blocked: the answer cannot be remembered, but nothing optional runs either */
    }
    setShow(false)
  }

  if (!show) return null

  const current = readConsent()?.choice

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          This site stores a few things in your browser to work: your choice here, whether
          you picked light or dark, and your sign-in if you use the job tracker. We run no
          analytics and no advertising. If we ever add anything optional, we will ask you
          first and it will stay off until you say yes. See our{" "}
          <Link to="/cookies" className="font-medium text-foreground underline underline-offset-2">
            Cookie policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            aria-pressed={current === "essential"}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose("optional")}
            aria-pressed={current === "optional"}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Allow optional too
          </button>
        </div>
      </div>
    </div>
  )
}
