import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Settings2, Loader2, Users } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ThemePicker from "@/components/ego/ThemePicker"
import AccountSecurity from "@/pages/ego/account/AccountSecurity"

type Settings = Record<string, string | number | null>

const FIELDS: { key: string; label: string; group: string; type?: string }[] = [
  { key: "company_name", label: "Company name", group: "Company" },
  { key: "address", label: "Address", group: "Company" },
  { key: "phone", label: "Phone", group: "Company" },
  { key: "email", label: "Email", group: "Company" },
  { key: "notify_email", label: "Alerts email (job-complete notices)", group: "Company" },
  { key: "vat_number", label: "VAT number", group: "Tax" },
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

export default function SettingsPage() {
  const [s, setS] = useState<Settings>({})
  const [saved, setSaved] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [savingGroup, setSavingGroup] = useState<string | null>(null)

  useEffect(() => {
    api<{ settings: Settings }>("/settings")
      .then((r) => { setS(r.settings); setSaved(r.settings) })
      .finally(() => setLoading(false))
  }, [])

  // a group is dirty if any of its own fields differ from the last saved snapshot
  function groupDirty(g: string) {
    return FIELDS.filter((f) => f.group === g).some((f) => (s[f.key] ?? "") !== (saved[f.key] ?? ""))
  }

  // save ONLY this group's fields — never touches other sections
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
  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-5" /></div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="security">Security &amp; 2FA</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const dirty = groupDirty(g)
          const busy = savingGroup === g
          return (
            <Card key={g}>
              <CardHeader><CardTitle>{g}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {FIELDS.filter((f) => f.group === g).map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    <Input id={f.key} type={f.type ?? "text"} value={(s[f.key] ?? "") as string | number}
                      onChange={(e) => setS((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={() => saveGroup(g)} disabled={!dirty || busy}>
                    {busy && <Loader2 className="animate-spin" />} {dirty ? `Save ${g}` : "Saved"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="size-5" /></div>
            <div>
              <p className="text-sm font-medium">People</p>
              <p className="text-xs text-muted-foreground">Add staff, set roles, send invites and manage access in one place.</p>
            </div>
          </div>
          <Button asChild variant="outline"><Link to="/ego/team">Manage team</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <AccountSecurity />
        </TabsContent>
      </Tabs>
    </div>
  )
}
