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
  // Proxy /api so a LOCAL production preview (`vite preview`) can talk to a local PHP API — the
  // only way to exercise the service worker, which is disabled in dev. Target is overridable:
  //   VITE_API_PROXY=http://127.0.0.1:8099 npx vite preview
  server: {
    port: 5051,
    strictPort: true,
    proxy: { "/api": { target: process.env.VITE_API_PROXY || "http://127.0.0.1:8080", changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, "") } },
  },
  preview: {
    port: 5051,
    strictPort: true,
    proxy: { "/api": { target: process.env.VITE_API_PROXY || "http://127.0.0.1:8080", changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, "") } },
  },
  build: {
    // A hand-rolled manualChunks() grouping (react/router/radix/charts into separate
    // vendor chunks) previously shipped here and broke chunk load ordering — it threw
    // "Cannot access 'T' before initialization" in vendor-charts at module-eval time,
    // before React ever rendered, causing a site-wide white screen (2026-07-08). Route
    // code-splitting still happens via React.lazy() per page; leave vendor chunking to
    // Rollup's automatic (and correctly ordered) algorithm.
    chunkSizeWarningLimit: 900,
  },
  test: {
    // Default to node so the pure-logic specs (invoicing, jobStatus, roles) stay fast;
    // component specs opt into a DOM with a `@vitest-environment jsdom` docblock.
    environment: "node",
  },
})
