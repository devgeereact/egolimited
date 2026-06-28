import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// EGO LTD marketing site.
// Dev serves at "/" (port 5011); production build is mounted at /egolimited/
// on cPanel (soulrefresh.net/egolimited) — base only applies to the build.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/egolimited/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5011,
    strictPort: true, // clash fails loud instead of drifting (workspace rule)
  },
  preview: {
    port: 5011,
    strictPort: true,
  },
}));
