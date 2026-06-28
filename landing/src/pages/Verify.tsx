import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react"
import { PageHero, Section } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { api } from "@/lib/api"
import { useCompany } from "@/site/CompanyProvider"

type State = "loading" | "valid" | "invalid"

export default function Verify() {
  const { id } = useParams()
  const company = useCompany()
  const [state, setState] = useState<State>("loading")
  const [detail, setDetail] = useState<{ name?: string; reference?: string } | null>(null)

  useEffect(() => {
    let active = true
    api.get<{ valid: boolean; name?: string; reference?: string }>(`verify.php?id=${encodeURIComponent(id ?? "")}`)
      .then((r) => { if (!active) return; if (r.valid) { setState("valid"); setDetail(r) } else setState("invalid") })
      .catch(() => { if (active) setState("invalid") })
    return () => { active = false }
  }, [id])

  return (
    <>
      <Seo title="Verify document — EGO LTD" description="Verify the authenticity of an EGO LTD document or certificate." path={`/verify/${id ?? ""}`} noindex />
      <PageHero eyebrow="Verification" title="Document verification" intro="Confirming that this document was issued by EGO LTD." />
      <Section>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          {state === "loading" && (<><Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" /><p className="mt-4 text-muted-foreground">Checking…</p></>)}
          {state === "valid" && (<><ShieldCheck className="mx-auto h-12 w-12 text-success" /><h2 className="mt-4 font-serif text-2xl font-bold">Verified</h2><p className="mt-2 text-muted-foreground">This is a genuine {company.name} document{detail?.reference ? <> (ref <span className="font-medium text-foreground">{detail.reference}</span>)</> : null}{detail?.name ? <> issued to <span className="font-medium text-foreground">{detail.name}</span></> : null}.</p></>)}
          {state === "invalid" && (<><ShieldAlert className="mx-auto h-12 w-12 text-warning" /><h2 className="mt-4 font-serif text-2xl font-bold">Could not verify</h2><p className="mt-2 text-muted-foreground">We could not confirm this reference. If you believe it is genuine, contact us at <a href={`mailto:${company.email}`} className="font-medium text-primary hover:text-accent">{company.email}</a> and we will check it for you.</p></>)}
        </div>
      </Section>
    </>
  )
}
