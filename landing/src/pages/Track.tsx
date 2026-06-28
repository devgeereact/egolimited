import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, ArrowRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHero, Section } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { APP_URL } from "@/site/components/SiteNav"

// The live customer portal (real-time job tracking, photos, messages) lives in
// the EGO app. This landing page is a friendly front door: enter a tracking ref
// and we hand off to the app's tokenised /track view.
export default function Track() {
  const [params] = useSearchParams()
  const [ref, setRef] = useState(params.get("ref") ?? "")

  function go(e: React.FormEvent) {
    e.preventDefault()
    const t = ref.trim()
    if (!t) return
    // Hand off to the app portal with the token/reference.
    window.location.href = `${APP_URL}track/${encodeURIComponent(t)}`
  }

  return (
    <>
      <Seo title="Track your job — EGO LTD" description="Follow your EGO LTD job in real time: status, photos, and messages. Enter the tracking reference from your confirmation." path="/track" noindex />
      <PageHero eyebrow="Customer portal" title="Track your job" intro="Enter the tracking reference from your confirmation email or text and we will take you straight to your job — status, photos, and messages, all in one place." />
      <Section>
        <div className="mx-auto max-w-md">
          <form onSubmit={go} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <Label htmlFor="ref">Tracking reference</Label>
            <div className="mt-2 flex gap-2">
              <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. EGO-4821 or a portal link" autoFocus />
              <Button type="submit" size="icon" aria-label="Track"><Search className="h-4 w-4" /></Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">The reference is in your confirmation email. Lost it? Reply to that email and we will resend your link.</p>
            <Button type="submit" className="mt-5 w-full">Open my job<ArrowRight className="ml-1 h-4 w-4" /></Button>
          </form>
          <a href={APP_URL} className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary">Have a portal link already? Open the portal<ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </Section>
    </>
  )
}
