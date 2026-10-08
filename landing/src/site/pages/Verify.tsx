import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import Logo from "@/site/components/Logo"

type VerifyResult = {
  found: boolean
  valid: boolean
  state: "valid" | "expiring" | "expired" | "not_found"
  reference?: string
  title?: string
  type?: string
  holder?: string
  issued_date?: string | null
  expiry_date?: string | null
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// Visual treatment per outcome — colour + icon + headline carry the meaning so
// the page never implies "verified" before the lookup has actually confirmed it.
const LOOKS = {
  valid: { icon: ShieldCheck, ring: "bg-success-soft text-success", head: "Certificate verified" },
  expiring: { icon: ShieldAlert, ring: "bg-warning-soft text-warning", head: "Valid, expiring soon" },
  expired: { icon: ShieldX, ring: "bg-danger-soft text-danger", head: "Certificate expired" },
  not_found: { icon: ShieldX, ring: "bg-muted text-muted-foreground", head: "Certificate not found" },
} as const

export default function Verify() {
  const { id } = useParams()
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Resets the panel before each lookup. The landing site fetches with a plain client (no
  // react-query here), so the loading/error reset genuinely belongs in the effect that fetches.
  useEffect(() => {
    let live = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    api
      .get<VerifyResult>(`verify.php?id=${encodeURIComponent(id ?? "")}`)
      .then((r) => live && setResult(r))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Verification failed"))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [id])

  const look = result ? LOOKS[result.state] : LOOKS.not_found
  const Icon = loading ? Loader2 : error ? ShieldAlert : look.icon

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
            loading || error ? "bg-muted text-muted-foreground" : look.ring
          }`}
        >
          <Icon className={`h-7 w-7 ${loading ? "animate-spin" : ""}`} aria-hidden />
        </div>

        {loading ? (
          <>
            <h1 className="mt-4 font-serif text-xl font-bold">Checking certificate…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Reference{" "}
              <span className="font-mono font-medium text-foreground">{id}</span>
            </p>
          </>
        ) : error ? (
          <>
            <h1 className="mt-4 font-serif text-xl font-bold">Could not verify</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn’t reach the verification service. Please try again shortly.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-xl font-bold">{look.head}</h1>
            {result?.found ? (
              <dl className="mt-5 space-y-2 text-left text-sm">
                {result.title && <Row k="Certificate" v={result.title} />}
                {result.type && <Row k="Type" v={result.type} />}
                {result.holder && <Row k="Held by" v={result.holder} />}
                <Row k="Reference" v={result.reference ?? String(id)} mono />
                <Row k="Issued" v={fmtDate(result.issued_date)} />
                <Row k="Expires" v={fmtDate(result.expiry_date)} />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No certificate matches reference{" "}
                <span className="font-mono font-medium text-foreground">{id}</span>. Check the
                reference and try again.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={`text-right font-medium text-foreground ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  )
}
