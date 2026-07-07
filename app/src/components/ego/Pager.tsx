import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Client-side pagination for long lists — keeps pages to PER items, no endless scroll. */
export function usePager<T>(items: T[], per = 12) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / per))
  const current = Math.min(page, pages)
  const slice = items.slice((current - 1) * per, current * per)
  return { page: current, pages, slice, setPage, total: items.length, per }
}

export function Pager({ page, pages, total, onPage, noun = "items" }:
  { page: number; pages: number; total: number; onPage: (p: number) => void; noun?: string }) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
      <span>{total} {noun}</span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
          <span className="tabular-nums">Page {page} of {pages}</span>
          <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
        </div>
      )}
    </div>
  )
}
