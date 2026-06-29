import { useTheme } from "next-themes"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { useUIThemeStore } from "@/store/ui-theme.store"
import { Button } from "@/components/ui/button"

// EGO ships two on-brand modes: Classic Light (default day) and Gaussian Black
// (night). Both carry the ember accent. Swatches preview cream/black + ember.
const THEMES = [
  { id: "classic-light", label: "Classic Light", swatch: "from-[#f4f1e8] to-[#EF9F27]" },
  { id: "gaussian-black", label: "Gaussian Black", swatch: "from-[#0a0a0a] to-[#EF9F27]" },
]

/** Appearance picker — lives inside Settings (no floating widget). */
export default function ThemePicker() {
  const { setTheme: setMode } = useTheme()
  const { theme, setTheme } = useUIThemeStore()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        {THEMES.map((t) => {
          const active = theme === t.id
          return (
            <button key={t.id} type="button"
              onClick={() => { setMode("light"); setTheme(t.id) }}
              className={cn("group relative h-20 overflow-hidden rounded-lg ring-1 ring-inset transition",
                active ? "ring-2 ring-primary" : "ring-border hover:ring-primary/50")}>
              <span className={cn("absolute inset-0 bg-gradient-to-br", t.swatch)} />
              {active && (
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/40 px-2 py-1 text-left text-[11px] font-medium text-white">
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
      <Button variant="outline" size="sm" onClick={() => { setMode("light"); setTheme("classic-light") }}>
        Reset to default (Classic Light)
      </Button>
    </div>
  )
}
