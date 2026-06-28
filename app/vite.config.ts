import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  // Local/working base. Deploy under egolimited.com uses base "/app/" (set at build time;
  // also set the React Router basename to match).
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 5051, strictPort: true },
  preview: { port: 5051, strictPort: true },
})
