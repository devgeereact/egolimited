import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { gbp } from "@/lib/invoicing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  invoiceId: number
  total: number
  /** Amount still owed (total − payments already recorded). Defaults to total. */
  outstanding?: number
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
}

export default function PaymentDialog({ invoiceId, total, outstanding, open, onOpenChange, onDone }: Props) {
  const owed = Math.max(0, outstanding ?? total)
  const [amount, setAmount] = useState(String(owed))
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState("")
  const [busy, setBusy] = useState(false)

  // Reset the amount to the outstanding balance each time the dialog opens.
  useEffect(() => { if (open) { setAmount(String(owed)); setReference("") } }, [open, owed])

  const amt = Number(amount) || 0
  const remaining = Math.max(0, +(owed - amt).toFixed(2))
  const over = amt > owed + 0.01
  const isFull = !over && amt > 0 && remaining < 0.01
  const isPartial = !over && amt > 0 && !isFull

  async function submit() {
    setBusy(true)
    try {
      const r = await api<{ paid_in_full: boolean; balance: number }>("/invoices/pay", {
        method: "POST", body: { id: invoiceId, amount: amt, paid_on: paidOn, reference },
      })
      toast.success(r.paid_in_full ? "Payment recorded — invoice paid, job closed" : `Partial payment recorded — ${gbp(r.balance)} still owed`)
      onOpenChange(false); onDone()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't record payment") } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="font-mono font-semibold">{gbp(owed)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amt">Amount (£)</Label>
            <Input id="amt" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className={cn("text-xs",
              over ? "text-destructive" : isPartial ? "text-amber-600 dark:text-amber-400" : isFull ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {over ? `That's more than the ${gbp(owed)} outstanding.`
                : isFull ? "Clears the invoice — the job will close."
                : isPartial ? `Partial payment — ${gbp(remaining)} will remain. The invoice stays open until it's fully paid.`
                : "Enter the amount received."}
            </p>
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
          <Button onClick={submit} disabled={busy || over || amt <= 0}>{busy && <Loader2 className="animate-spin" />} {isFull ? "Mark paid" : "Record payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
