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
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split big, stable vendors into their own long-cached chunks so the app
        // shell stays small and a page change doesn't re-download React/Radix.
        manualChunks(id) {
          if (!id.includes("node_modules")) return
          if (id.includes("react-router") || id.includes("/@remix-run/")) return "vendor-router"
          if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) return "vendor-react"
          if (id.includes("@radix-ui")) return "vendor-radix"
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory") || id.includes("apexcharts")) return "vendor-charts"
        },
      },
    },
  },
})
