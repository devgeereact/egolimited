import { useTheme } from "next-themes"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { useUIThemeStore } from "@/store/ui-theme.store"
import { Button } from "@/components/ui/button"

const THEMES = [
  { id: "dark-blue", label: "Dark Blue", swatch: "from-[#1e1b4b] to-[#2563eb]" },
  { id: "gaussian-black", label: "Gaussian Black", swatch: "from-[#0a0a0a] to-[#262626]" },
  { id: "classic-light", label: "Classic Light", swatch: "from-gray-100 to-gray-300" },
  { id: "semi-dark", label: "Semi Dark", swatch: "from-gray-400 to-gray-900" },
]

/** Appearance picker — lives inside Settings (no floating widget). */
export default function ThemePicker() {
  const { setTheme: setMode } = useTheme()
  const { theme, setTheme } = useUIThemeStore()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
