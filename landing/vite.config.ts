import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  // Local/working base. Deploy under egolimited.com uses base "/" (set at build time).
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 5050, strictPort: true },
  preview: { port: 5050, strictPort: true },
})