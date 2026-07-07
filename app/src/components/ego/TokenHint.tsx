import { cn } from "@/lib/utils"

const TOKENS = ["{{first_name}}", "{{company}}", "{{website}}", "{{sender_name}}"]

/** Shows the merge tokens that fill per recipient — so office knows what auto-personalises. */
export function TokenHint({ className }: { className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground", className)}>
      <span>Auto-filled per recipient:</span>
      {TOKENS.map((t) => (
        <code key={t} className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/80">{t}</code>
      ))}
    </p>
  )
}
