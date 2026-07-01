import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Settings2, Loader2, Users, Bell, Palette, UserRound, Lock, Building2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { atLeast } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ThemePicker from "@/components/ego/ThemePicker"

type Settings = Record<string, string | number | null>

// Company config — FOUNDER edits, managers view read-only, office never sees it.
const FIELDS: { key: string; label: string; group: string; type?: string }[] = [
  { key: "company_name", label: "Company name", group: "Company" },
  { key: "address", label: "Address", group: "Company" },
  { key: "phone", label: "Phone", group: "Company" },
  { key: "email", label: "Email", group: "Company" },
  { key: "notify_email", label: "Alerts email (job-complete notices)", group: "Company" },
  { key: "vat_number", label: "VAT number (shown on website)", group: "Tax" },
  { key: "companies_house_no", label: "Companies House number (shown on website)", group: "Tax" },
  { key: "default_vat_rate", label: "Default VAT rate (%)", group: "Tax", type: "number" },
  { key: "bank_account_name", label: "Account name", group: "Bank" },
  { key: "bank_sort_code", label: "Sort code", group: "Bank" },
  { key: "bank_account_number", label: "Account number", group: "Bank" },
  { key: "job_prefix", label: "Job prefix", group: "Numbering" },
  { key: "invoice_prefix", label: "Invoice prefix", group: "Numbering" },
  { key: "quote_prefix", label: "Quote prefix", group: "Numbering" },
  { key: "payment_terms_days", label: "Payment terms (days)", group: "Numbering", type: "number" },
]
const GROUPS = ["Company", "Tax", "Bank", "Numbering"]

// Notification-bell categories the user can toggle.
const NOTIFY: { key: string; label: string; hint: string }[] = [
  { key: "emails", label: "New emails", hint: "When a new email lands in the shared inbox." },
  { key: "enquiries", label: "Website enquiries", hint: "New leads from the marketing site." },
  { key: "portal", label: "Client portal messages", hint: "When a customer messages about their job." },
  { key: "reviews", label: "New reviews", hint: "When a customer leaves a review." },
  { key: "completed", label: "Jobs completed", hint: "When an engineer marks a job done — ready to invoice." },
]

export default function SettingsPage() {
  const user = useAuth((s) => s.user)
  const isFounder = user?.role === "founder"
  const canSeeCompany = atLeast(user?.role, "manager") // managers view, founder edits

  // Company settings (only loaded for manager+).
  const [s, setS] = useState<Settings>({})
  const [saved, setSaved] = useState<Settings>({})
  const [loadingCo, setLoadingCo] = useState(canSeeCompany)
  const [savingGroup, setSavingGroup] = useState<string | null>(null)

  // Notification preferences (everyone).
  const [prefs, setPrefs] = useState<Record<string, number>>({})
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    api<{ prefs: Record<string, number> }>("/me/notify-prefs").then((r) => setPrefs(r.prefs)).catch(() => {})
    if (canSeeCompany) {
      api<{ settings: Settings }>("/settings")
        .then((r) => { setS(r.settings); setSaved(r.settings) })
        .catch(() => {})
        .finally(() => setLoadingCo(false))
    }
  }, [canSeeCompany])

  async function togglePref(key: string, on: boolean) {
    const next = { ...prefs, [key]: on ? 1 : 0 }
    const prev = prefs
    setPrefs(next); setSavingPrefs(true)
    try { await api("/me/notify-prefs", { method: "POST", body: next }) }
    catch { toast.error("Couldn't save that"); setPrefs(prev) }
    finally { setSavingPrefs(false) }
  }

  function groupDirty(g: string) {
    return FIELDS.filter((f) => f.group === g).some((f) => (s[f.key] ?? "") !== (saved[f.key] ?? ""))
  }
  async function saveGroup(g: string) {
    setSavingGroup(g)
    const keys = FIELDS.filter((f) => f.group === g).map((f) => f.key)
    const body = Object.fromEntries(keys.map((k) => [k, s[k] ?? ""]))
    try {
      await api("/settings", { method: "POST", body })
      setSaved((p) => ({ ...p, ...body }))
      toast.success(`${g} saved`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") }
    finally { setSavingGroup(null) }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal preferences and account.</p>
        </div>
      </div>

      {/* ---------- PERSONAL (everyone) ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4 text-muted-foreground" /> Appearance</CardTitle></CardHeader>
          <CardContent><ThemePicker /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4 text-muted-foreground" /> Your account</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/ego/account/profile"><UserRound className="size-4" /> Profile</Link></Button>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/ego/account/security"><Lock className="size-4" /> Password &amp; two-factor</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="size-4 text-muted-foreground" /> Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p className="mb-3 text-sm text-muted-foreground">Choose what shows in your notification bell.</p>
          {NOTIFY.map((n) => (
            <div key={n.key} className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.hint}</p>
              </div>
              <Switch checked={!!prefs[n.key]} onCheckedChange={(v) => togglePref(n.key, v)} disabled={savingPrefs} aria-label={n.label} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---------- COMPANY (manager+ view · founder edit) ---------- */}
      {canSeeCompany && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <Building2 className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">Company</h2>
            {isFounder ? null : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" /> View only · the founder edits these
              </span>
            )}
          </div>

          {loadingCo ? (
            <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {GROUPS.map((g) => (
                <Card key={g}>
                  <CardHeader><CardTitle>{g}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {FIELDS.filter((f) => f.group === g).map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label htmlFor={f.key}>{f.label}</Label>
                        <Input
                          id={f.key} type={f.type ?? "text"} value={(s[f.key] ?? "") as string | number}
                          readOnly={!isFounder} disabled={!isFounder}
                          onChange={(e) => setS((p) => ({ ...p, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    {isFounder && (
                      <div className="flex justify-end pt-1">
                        <Button size="sm" onClick={() => saveGroup(g)} disabled={!groupDirty(g) || savingGroup === g}>
                          {savingGroup === g && <Loader2 className="animate-spin" />} {groupDirty(g) ? `Save ${g}` : "Saved"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="size-5" /></div>
                <div>
                  <p className="text-sm font-medium">People</p>
                  <p className="text-xs text-muted-foreground">Add staff, set roles, send invites and manage access.</p>
                </div>
              </div>
              <Button asChild variant="outline"><Link to="/ego/team">Manage team</Link></Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
