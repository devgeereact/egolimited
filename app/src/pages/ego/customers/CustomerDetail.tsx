import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Mail, MapPin, Phone, Pencil, Plus, Trash2, Loader2 } from "lucide-react"
import EmailDialog from "@/components/ego/EmailDialog"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusPill, type EgoStatus } from "@/components/ego/StatusPill"
import { gbp } from "@/lib/mock/jobs"

interface Detail {
  id: number
  name: string
  ref_code: string | null
  phone: string | null
  email: string | null
  notes: string | null
  balance: number
  addresses: { line1?: string; city?: string; postcode?: string }[]
  jobs: { id: number; reference: string; title: string; status: EgoStatus; quoted_amount: string | null; created_at: string }[]
}

export default function CustomerDetail() {
  const [params] = useSearchParams()
  const id = params.get("id")
  const navigate = useNavigate()
  const [c, setC] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailOpen, setEmailOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    api<{ customer: Detail }>(`/customers/get?id=${id}`)
      .then((r) => setC(r.customer))
      .catch(() => toast.error("Customer not found"))
      .finally(() => setLoading(false))
  }, [id])

  async function onDelete() {
    if (!c || !confirm(`Delete ${c.name}? (soft-delete — recoverable)`)) return
    await api("/customers/delete", { method: "POST", body: { id: c.id } })
    toast.success("Customer deleted")
    navigate("/ego/customers")
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
  if (!c) return <div className="p-6 text-muted-foreground">Customer not found.</div>

  const addr = c.addresses?.[0]

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/ego/customers"><ArrowLeft /> Customers</Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            {c.ref_code && <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm font-semibold text-primary">{c.ref_code}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/ego/jobs/new?customer=${c.id}`}><Plus /> New job</Link>
          </Button>
          <Button variant="outline" onClick={() => setEmailOpen(true)} disabled={!c.email} title={c.email ? "" : "No email on file"}>
            <Mail /> Email
          </Button>
          <Button asChild variant="outline">
            <Link to={`/ego/customers/edit?id=${c.id}`}><Pencil /> Edit</Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={onDelete}>
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Job history</CardTitle>
              <span className="text-sm text-muted-foreground">{c.jobs.length} jobs</span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quote</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.jobs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No jobs yet.</TableCell></TableRow>
                  ) : c.jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono">
                        <Link to={`/ego/jobs/detail?id=${j.id}`} className="hover:underline">{j.reference}</Link>
                      </TableCell>
                      <TableCell className="max-w-[24ch] truncate">{j.title}</TableCell>
                      <TableCell><StatusPill status={j.status} /></TableCell>
                      <TableCell className="text-right font-mono">{j.quoted_amount ? gbp(Number(j.quoted_amount)) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {c.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{c.notes}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" /> {c.phone || "—"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> {c.email || "—"}</div>
              {addr && (addr.line1 || addr.postcode) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    <span>{[addr.line1, addr.city, addr.postcode].filter(Boolean).join(", ")}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Balance</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-mono font-medium">{gbp(c.balance)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Total of unpaid (sent) invoices.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {c.email && (
        <EmailDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          to={c.email}
          toName={c.name}
          customerName={c.name}
          customerId={c.id}
          onSent={() => {}}
        />
      )}
    </div>
  )
}
