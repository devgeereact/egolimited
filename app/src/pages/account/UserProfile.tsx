import { Link } from "react-router-dom"
import {
  User, Mail, Phone, ShieldCheck, Building2, MapPin, Receipt, Landmark, Loader2, Settings2, Pencil,
} from "lucide-react"

import { useApi } from "@/lib/query"
import { useAuth } from "@/store/auth.store"
import { ROLE_LABEL, atLeast } from "@/lib/roles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Company {
  company_name: string; address: string | null; phone: string | null; email: string | null
  vat_number: string | null; logo_url: string | null
  bank_account_name: string | null; bank_sort_code: string | null; bank_account_number: string | null
}

const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

export default function UserProfile() {
  const { user } = useAuth()
  const { data, isPending } = useApi<{ settings: Company }>("/settings")
  const co = data?.settings ?? null
  const loading = isPending

  const Row = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string | null }) => (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span><span className="font-medium">{label}:</span> {value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary to-primary/50" />
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="-mt-14 flex size-24 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary text-2xl font-semibold text-primary-foreground shadow-lg">
            {user ? initials(user.name) : "?"}
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-xl font-semibold">{user?.name ?? "—"}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <ShieldCheck className="size-3.5" /> {user ? ROLE_LABEL[user.role] : ""}
              </span>
              {co?.company_name && <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" /> {co.company_name}</span>}
              {user?.email && <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="size-3.5" /> {user.email}</a>}
            </div>
          </div>
          {atLeast(user?.role, "manager") && (
            <Button asChild variant="outline" className="sm:ml-auto"><Link to="/ego/settings"><Settings2 className="size-4" /> Company settings</Link></Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account */}
        <Card>
          <CardHeader><CardTitle className="text-base">My account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row icon={User} label="Name" value={user?.name} />
            <Row icon={Mail} label="Email" value={user?.email} />
            <Row icon={ShieldCheck} label="Role" value={user ? ROLE_LABEL[user.role] : ""} />
          </CardContent>
        </Card>

        {/* Company */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-primary" /> Company</CardTitle>
            {atLeast(user?.role, "manager") && (
              <Button asChild size="sm" variant="ghost"><Link to="/ego/settings"><Pencil className="size-3.5" /> Edit</Link></Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
            ) : co ? (
              <>
                <Row icon={Building2} label="Name" value={co.company_name} />
                <Row icon={MapPin} label="Address" value={co.address} />
                <Row icon={Phone} label="Phone" value={co.phone} />
                <Row icon={Mail} label="Email" value={co.email} />
                <Row icon={Receipt} label="VAT" value={co.vat_number} />
                <Row icon={Landmark} label="Bank"
                  value={co.bank_account_name ? `${co.bank_account_name} · ${co.bank_sort_code} · ${co.bank_account_number}` : null} />
              </>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Company info unavailable.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
