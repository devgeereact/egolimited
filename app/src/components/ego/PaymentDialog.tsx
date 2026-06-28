import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  invoiceId: number
  total: number
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
}

export default function PaymentDialog({ invoiceId, total, open, onOpenChange, onDone }: Props) {
  const [amount, setAmount] = useState(String(total))
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await api("/invoices/pay", { method: "POST", body: { id: invoiceId, amount: Number(amount), paid_on: paidOn, reference } })
      toast.success("Payment recorded — job closed")
      onOpenChange(false); onDone()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't record payment") } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amt">Amount (£)</Label>
            <Input id="amt" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pon">Date received</Label>
            <Input id="pon" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pref">Bank reference seen</Label>
            <Input id="pref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. FT-9981" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Mark paid</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
