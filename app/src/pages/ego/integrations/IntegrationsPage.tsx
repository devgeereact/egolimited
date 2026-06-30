import { useEffect, useState } from "react"
import { KeyRound, Loader2, ShieldCheck, Mail, CloudSun, Sparkles, Inbox, MessageSquareQuote } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Field = { key: string; label: string; secret?: boolean; type?: string; placeholder?: string; multiline?: boolean; rows?: number; hint?: string }
type Section = { id: string; title: string; icon: typeof Mail; fields: Field[] }

const SECTIONS: Section[] = [
  {
    id: "smtp", title: "Email (SMTP)", icon: Mail, fields: [
      { key: "smtp_host", label: "Host", placeholder: "smtp.yourhost.com" },
      { key: "smtp_port", label: "Port", placeholder: "587", type: "number" },
      { key: "smtp_user", label: "Username" },
      { key: "smtp_pass", label: "Password", secret: true },
      { key: "smtp_from", label: "From email", placeholder: "office@egolimited.co.uk" },
      { key: "smtp_from_name", label: "From name", placeholder: "EGO LIMITED" },
      { key: "smtp_secure", label: "Security (tls / ssl / none)", placeholder: "tls" },
    ],
  },
  {
    id: "weather", title: "OpenWeather", icon: CloudSun, fields: [
      { key: "openweather_key", label: "API key", secret: true },
      { key: "weather_city", label: "Default city", placeholder: "Birmingham,GB" },
    ],
  },
  {
    id: "ai", title: "AI (OpenRouter)", icon: Sparkles, fields: [
      { key: "openrouter_key", label: "API key", secret: true, placeholder: "sk-or-…" },
      { key: "openrouter_model", label: "Primary model", placeholder: "anthropic/claude-3.5-sonnet",
        hint: "The model used first for every AI draft. Switch any time — e.g. openai/gpt-4o-mini, google/gemini-2.0-flash-001." },
      { key: "openrouter_models", label: "Backup models", multiline: true,
        placeholder: "openai/gpt-4o-mini\ngoogle/gemini-2.0-flash-001",
        hint: "Optional. One per line (or comma-separated). Tried in order if the primary is busy or unavailable." },
      { key: "openrouter_image_model", label: "Image model (email marketing)", placeholder: "google/gemini-2.5-flash-image-preview",
        hint: "Optional. Used to generate header images for marketing emails." },
    ],
  },
  {
    id: "brand", title: "Brand voice", icon: MessageSquareQuote, fields: [
      { key: "brand_voice", label: "Company voice", multiline: true, rows: 10,
        placeholder: "Leave blank to use the built-in EGO LTD voice…",
        hint: "The voice every AI draft and email uses — announcements, tasks, incidents, procurement, the inbox composer and marketing campaigns. Leave blank to use the built-in EGO voice (plain-spoken, straight, British, no hype). Paste your own to override it everywhere." },
    ],
  },
  {
    id: "imap", title: "Inbound email (IMAP)", icon: Inbox, fields: [
      { key: "imap_host", label: "Host", placeholder: "imap.yourhost.com" },
      { key: "imap_port", label: "Port", placeholder: "993", type: "number" },
      { key: "imap_user", label: "Username" },
      { key: "imap_pass", label: "Password", secret: true },
      { key: "imap_secure", label: "Security (ssl / tls / none)", placeholder: "ssl" },
    ],
  },
]

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key))

export default function IntegrationsPage() {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [configured, setConfigured] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  function refresh() {
    return api<{ fields: Record<string, string>; configured: Record<string, boolean> }>("/integrations").then((r) => {
      // non-secret values prefill; secret fields stay blank (server never sends them)
      const v: Record<string, string> = {}
      for (const k of ALL_KEYS) {
        const isSecret = SECTIONS.flatMap((s) => s.fields).find((f) => f.key === k)?.secret
        v[k] = isSecret ? "" : (r.fields[k] ?? "")
      }
      setVals(v); setConfigured(r.configured)
    })
  }
  useEffect(() => { refresh().finally(() => setLoading(false)) }, [])

  async function saveSection(s: Section) {
    setSavingId(s.id)
    const body: Record<string, string> = {}
    for (const f of s.fields) {
      // send secrets only when the user typed a new value (blank = keep existing)
      if (f.secret && !vals[f.key]) continue
      body[f.key] = vals[f.key] ?? ""
    }
    try {
      await api("/integrations", { method: "POST", body })
      toast.success(`${s.title} saved`)
      await refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") }
    finally { setSavingId(null) }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter real keys here. Stored server-side only — never in the code or GitHub.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {SECTIONS.map((s) => {
          const busy = savingId === s.id
          return (
            <Card key={s.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2"><s.icon className="size-4 text-muted-foreground" /> {s.title}</CardTitle>
                {s.fields.some((f) => f.secret && configured[f.key]) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3" /> Configured
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {s.fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    {f.multiline ? (
                      <Textarea
                        id={f.key} rows={f.rows ?? 3} autoComplete="off"
                        value={vals[f.key] ?? ""}
                        placeholder={f.placeholder}
                        onChange={(e) => setVals((p) => ({ ...p, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        id={f.key}
                        type={f.secret ? "password" : (f.type ?? "text")}
                        autoComplete="off"
                        value={vals[f.key] ?? ""}
                        placeholder={f.secret && configured[f.key] ? "•••••• (saved — leave blank to keep)" : f.placeholder}
                        onChange={(e) => setVals((p) => ({ ...p, [f.key]: e.target.value }))}
                      />
                    )}
                    {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={() => saveSection(s)} disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Save {s.title}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
