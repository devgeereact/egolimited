import { create } from "zustand"

type UIThemeState = {
  theme: string
  setTheme: (theme: string) => void
}

export const useUIThemeStore = create<UIThemeState>((set) => ({
  // Default theme is Classic Light; users pick + save their own in Settings → Appearance.
  theme: localStorage.getItem("ui-theme") || "classic-light",

  setTheme: (theme) => {
    localStorage.setItem("ui-theme", theme)

    // force update (important)
    set({ theme: "" })

    setTimeout(() => {
      set({ theme })
    }, 0)
  },
}))