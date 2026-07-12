import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Loader2, Users, Bell, Palette, UserRound, Building2, ShieldCheck, Mail, Phone, Receipt, Landmark, Pencil, Lock, Hash, Timer,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuth } from "@/store/auth.store"
import { ROLE_LABEL, atLeast, type Role } from "@/lib/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ThemePicker from "@/components/ego/ThemePicker"
import AccountSecurity from "@/pages/ego/account/AccountSecurity"
import ActivityPage from "@/pages/ego/workspace/ActivityPage"

type Settings = Record<string, string | number | null>

// Company config — FOUNDER edits, managers view read-only, office never sees it.
const FIELDS: { key: string; label: string; group: string; type?: string }[] = [
  { key: "company_name", label: "Company name", group: "Company" },
  { key: "address", label: "Address", group: "Company" },
  { key: "phone", label: "Phone", group: "Company" },
  { key: "email", label: "Email", group: "Company" },
  { key: "notify_email", label: "Alerts email (enquiries, reviews, job-complete)", group: "Company" },
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
  { key: "sla_urgent_hours", label: "Urgent — resolve within (hours)", group: "SLA", type: "number" },
  { key: "sla_normal_hours", label: "Normal — resolve within (hours)", group: "SLA", type: "number" },
  { key: "sla_low_hours", label: "Low — resolve within (hours)", group: "SLA", type: "number" },
]
const GROUPS = ["Company", "Tax", "Bank", "Numbering", "SLA"] as const
const GROUP_ICON: Record<string, typeof Building2> = { Company: Building2, Tax: Receipt, Bank: Landmark, Numbering: Hash, SLA: Timer }

const NOTIFY: { key: string; label: string; hint: string }[] = [
  { key: "emails", label: "New emails", hint: "When a new email lands in the shared inbox." },
  { key: "enquiries", label: "Website enquiries", hint: "New leads from the marketing site." },
  { key: "portal", label: "Client portal messages", hint: "When a customer messages about their job." },
  { key: "reviews", label: "New reviews", hint: "When a customer leaves a review." },
  { key: "completed", label: "Jobs completed", hint: "When an engineer marks a job done — ready to invoice." },
]

const initials = (s: string) => (s || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

export default function SettingsPage() {
  const { user, loadMe } = useAuth()
  const role = (user?.role ?? null) as Role | null
  const isFounder = role === "founder"
  const canSeeCompany = atLeast(role, "manager") // managers view, founder edits

  // Identity / account
  const [me, setMe] = useState<{ name: string; email: string; phone: string | null }>({ name: user?.name ?? "", email: user?.email ?? "", phone: null })
  const [editAcct, setEditAcct] = useState(false)
  const [acct, setAcct] = useState({ name: "", phone: "" })
  const [savingAcct, setSavingAcct] = useState(false)

  // Company (manager+)
  const [s, setS] = useState<Settings>({})
  const [saved, setSaved] = useState<Settings>({})
  const [loadingCo, setLoadingCo] = useState(canSeeCompany)
  const [savingGroup, setSavingGroup] = useState<string | null>(null)

  // Notifications (everyone)
  const [prefs, setPrefs] = useState<Record<string, number>>({})
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    api<{ user: { name: string; email: string; phone: string | null } }>("/auth/me")
      .then((r) => { setMe(r.user); setAcct({ name: r.user.name ?? "", phone: r.user.phone ?? "" }) }).catch(() => {})
    api<{ prefs: Record<string, number> }>("/me/notify-prefs").then((r) => setPrefs(r.prefs)).catch(() => {})
    if (canSeeCompany) {
      api<{ settings: Settings }>("/settings").then((r) => { setS(r.settings); setSaved(r.settings) }).catch(() => {}).finally(() => setLoadingCo(false))
    }
  }, [canSeeCompany])

  async function saveAcct() {
    setSavingAcct(true)
    try {
      await api("/me/profile", { method: "POST", body: { name: acct.name, phone: acct.phone } })
      setMe((m) => ({ ...m, name: acct.name, phone: acct.phone }))
      setEditAcct(false); await loadMe(); toast.success("Profile updated")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save") } finally { setSavingAcct(false) }
  }

  async function togglePref(key: string, on: boolean) {
    const next = { ...prefs, [key]: on ? 1 : 0 }; const prev = prefs
    setPrefs(next); setSavingPrefs(true)
    try { await api("/me/notify-prefs", { method: "POST", body: next }) }
    catch { toast.error("Couldn't save that"); setPrefs(prev) } finally { setSavingPrefs(false) }
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
      setSaved((p) => ({ ...p, ...body })); toast.success(`${g} saved`)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed") } finally { setSavingGroup(null) }
  }

  const InfoRow = ({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string | null }) => (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span><span className="font-medium">{label}:</span> {value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
      {/* ---------- Profile header ---------- */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary via-primary to-primary/80" />
        <CardContent className="pt-0">
          {/* Only the avatar overlaps the banner; the name stays below on the card so it
              reads as foreground text, never dark-on-purple. */}
          <div className="flex flex-wrap items-start gap-4">
            <div className="-mt-10 flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-md ring-4 ring-background">
              {initials(me.name)}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight text-foreground">{me.name || "Your account"}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="size-3" /> {role ? ROLE_LABEL[role] : ""}
                </span>
                {canSeeCompany && s.company_name && (
                  <><span className="text-muted-foreground/40">·</span><span className="inline-flex items-center gap-1"><Building2 className="size-3.5" /> {String(s.company_name)}</span></>
                )}
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex min-w-0 items-center gap-1"><Mail className="size-3.5 shrink-0" /> <span className="truncate">{me.email}</span></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- My account (editable) + Appearance ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4 text-muted-foreground" /> My account</CardTitle>
            {!editAcct ? (
              <Button variant="ghost" size="sm" onClick={() => setEditAcct(true)}><Pencil className="size-3.5" /> Edit</Button>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" onClick={saveAcct} disabled={savingAcct || !acct.name.trim()}>{savingAcct && <Loader2 className="animate-spin" />} Save</Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditAcct(false); setAcct({ name: me.name, phone: me.phone ?? "" }) }}>Cancel</Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {editAcct ? (
              <>
                <div className="space-y-1.5"><Label htmlFor="acct-name">Name</Label><Input id="acct-name" value={acct.name} onChange={(e) => setAcct((a) => ({ ...a, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label htmlFor="acct-phone">Phone</Label><Input id="acct-phone" value={acct.phone} onChange={(e) => setAcct((a) => ({ ...a, phone: e.target.value }))} placeholder="+44 …" /></div>
                <p className="text-xs text-muted-foreground">Your email and role are set by an administrator.</p>
              </>
            ) : (
              <>
                <InfoRow icon={UserRound} label="Name" value={me.name} />
                <InfoRow icon={Mail} label="Email" value={me.email} />
                <InfoRow icon={Phone} label="Phone" value={me.phone} />
                <InfoRow icon={ShieldCheck} label="Role" value={role ? ROLE_LABEL[role] : ""} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4 text-muted-foreground" /> Appearance</CardTitle></CardHeader>
          <CardContent><ThemePicker /></CardContent>
        </Card>
      </div>

      {/* ---------- Notifications ---------- */}
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

      {/* ---------- Security: password + 2FA ---------- */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Lock className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Security</h2>
        </div>
        <AccountSecurity />
      </div>

      {/* ---------- Company (manager+ view · founder edit) ---------- */}
      {canSeeCompany && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-2">
            <Building2 className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">Company</h2>
            {!isFounder && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" /> View only · the founder edits these
              </span>
            )}
          </div>

          {loadingCo ? (
            <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {GROUPS.map((g) => {
                const Icon = GROUP_ICON[g]
                return (
                  <Card key={g}>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4 text-muted-foreground" /> {g}</CardTitle></CardHeader>
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
                )
              })}
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
        </div>
      )}

      {/* ---------- Activity (with filter) ---------- */}
      <div className="pt-2">
        <ActivityPage embedded />
      </div>
    </div>
  )
}
