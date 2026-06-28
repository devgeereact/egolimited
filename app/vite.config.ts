import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// EGO field-service PWA.
// Dev serves at "/" (port 5012); production build is mounted under
// /egolimited/app/ on cPanel — base only applies to the built bundle so dev
// URLs stay clean.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/egolimited/app/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5012,
    strictPort: true, // clash fails loud instead of drifting (workspace rule)
  },
  preview: {
    port: 5012,
    strictPort: true,
  },
}));
