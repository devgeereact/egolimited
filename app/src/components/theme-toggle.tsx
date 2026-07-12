"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUIThemeStore } from "@/store/ui-theme.store"

const LIGHT_THEME = "classic-light"

export function ThemeToggle() {
  // Drives the SAME custom-theme system as Settings → Appearance, so toggling never
  // wipes the user's chosen theme. Light = Classic Light; toggling back to dark
  // restores the dark theme they last had selected.
  const { theme, setTheme: setCustomTheme } = useUIThemeStore()
  const [mounted, setMounted] = useState(false)

  // The canonical next-themes hydration guard: the active theme isn't knowable until we're on the
  // client, so the first paint renders a placeholder and this flips it. The lint rule objects to
  // setState-in-effect on principle (it costs one extra render), but that extra render is exactly
  // the point here — there is no correct value to render before mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full opacity-0">
        <Sun />
      </Button>
    )
  }

  const isDark = theme !== LIGHT_THEME

  function toggle() {
    if (isDark) {
      if (theme) localStorage.setItem("ui-theme-dark", theme) // remember their dark choice
      setCustomTheme(LIGHT_THEME)
    } else {
      setCustomTheme(localStorage.getItem("ui-theme-dark") || "dark-blue")
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full [&_svg]:size-5 h-10 w-10 p-0"
            onClick={toggle}
            aria-label="Toggle theme"
          >
            <Sun
              className={`transition-all ${
                isDark ? "rotate-90 scale-0" : "rotate-0 scale-100"
              }`}
            />
            <Moon
              className={`absolute transition-all ${
                isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0"
              }`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}