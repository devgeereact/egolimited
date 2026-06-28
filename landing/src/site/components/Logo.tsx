import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export default function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2 font-serif", className)} aria-label="EGO LTD home">
      <span className={cn("grid h-9 w-9 place-items-center rounded-md text-base font-bold", light ? "bg-white text-primary" : "bg-primary text-primary-foreground")}>E</span>
      <span className="flex flex-col leading-none">
        <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-foreground")}>
          EGO <span className="text-accent">LTD</span>
        </span>
        <span className={cn("font-sans text-[10px] font-medium uppercase tracking-[0.18em]", light ? "text-white/70" : "text-muted-foreground")}>
          Maintenance
        </span>
      </span>
    </Link>
  )
}
