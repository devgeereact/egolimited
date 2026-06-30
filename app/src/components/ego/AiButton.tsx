import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"

/**
 * One AI button for every on-brand draft/polish across the app. Two modes:
 *  - brief (default): opens a small popover, the user types what they want, we POST { brief, ...extra }.
 *  - direct (pass buildBody): no popover, one click POSTs whatever buildBody() returns (e.g. polish existing text).
 * The backend always applies the EGO brand voice. onResult fills the form fields.
 */
export function AiButton<T>({
  endpoint,
  onResult,
  label = "Draft with AI",
  title = "Draft with AI",
  placeholder = "A few words on what it should say…",
  extra,
  buildBody,
  disabled,
}: {
  endpoint: string
  onResult: (data: T) => void
  label?: string
  title?: string
  placeholder?: string
  extra?: Record<string, unknown>
  /** When set, the button acts immediately on this body (no popover). Return null to abort. */
  buildBody?: () => Record<string, unknown> | null
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState("")
  const [busy, setBusy] = useState(false)

  async function call(bodyObj: Record<string, unknown>) {
    setBusy(true)
    try {
      const data = await api<T>(endpoint, { method: "POST", body: bodyObj })
      onResult(data)
      setOpen(false)
      setBrief("")
      toast.success("Draft ready — review and edit before saving")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI draft failed")
    } finally {
      setBusy(false)
    }
  }

  if (buildBody) {
    return (
      <Button
        type="button" variant="outline" size="sm" disabled={disabled || busy}
        onClick={() => { const b = buildBody(); if (!b) { toast.error("Nothing to work with yet"); return } call(b) }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {label}
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Sparkles className="size-4" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2">
        <p className="text-sm font-medium">{title}</p>
        <Textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={placeholder} />
        <Button
          type="button" size="sm" className="w-full" disabled={busy}
          onClick={() => { if (!brief.trim()) { toast.error("Tell the AI what you want"); return } call({ brief, ...(extra ?? {}) }) }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate
        </Button>
      </PopoverContent>
    </Popover>
  )
}
