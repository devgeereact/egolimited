import { create } from "zustand"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Opts {
  title: string
  body?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}
interface ConfirmState {
  open: boolean
  opts: Opts
  resolve?: (v: boolean) => void
  ask: (o: Opts) => Promise<boolean>
  done: (v: boolean) => void
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  opts: { title: "" },
  ask: (o) => new Promise<boolean>((resolve) => set({ open: true, opts: o, resolve })),
  done: (v) => { get().resolve?.(v); set({ open: false, resolve: undefined }) },
}))

/** Themed replacement for window.confirm(). `const ok = await confirmDialog({ title, danger })`. */
export const confirmDialog = (o: Opts): Promise<boolean> => useConfirmStore.getState().ask(o)

/** Mount once (in AppLayout). Renders the active confirm dialog. */
export function ConfirmHost() {
  const { open, opts, done } = useConfirmStore()
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) done(false) }}>
      <DialogContent
        className="max-w-sm"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); done(true) } }}
      >
        <DialogHeader><DialogTitle>{opts.title}</DialogTitle></DialogHeader>
        {opts.body && <p className="text-sm text-muted-foreground">{opts.body}</p>}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => done(false)}>{opts.cancelText ?? "Cancel"}</Button>
          <Button
            variant={opts.danger ? "destructive" : "default"}
            className={opts.danger ? "" : undefined}
            onClick={() => done(true)}
            autoFocus
          >
            {opts.confirmText ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
