/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        // Body — Inter. Functional UI, tables, labels, buttons, forms.
        // Crisp UI-grade humanist sans; tabular figures for ops dashboards.
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        // Display — Barlow Semi Condensed. Page titles, hero, big stat
        // numbers. The `font-serif` utility name is retained for backward
        // compatibility; this is the heading face.
        serif: ["'Barlow Semi Condensed'", "Inter", "system-ui", "sans-serif"],
        heading: ["'Barlow Semi Condensed'", "Inter", "system-ui", "sans-serif"],
        mono: ["'Source Code Pro'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      // Warm near-black shadow tint reads as real light on stone surfaces.
      // The "lit" tokens add the signature top-edge highlight (the lit edge).
      boxShadow: {
        xs: "0 1px 2px 0 hsl(60 2% 8% / 0.10)",
        sm: "0 1px 2px hsl(60 2% 8% / 0.10), 0 2px 6px hsl(60 2% 8% / 0.08)",
        DEFAULT:
          "0 2px 4px hsl(60 2% 8% / 0.10), 0 8px 20px -6px hsl(60 2% 8% / 0.18)",
        md: "0 4px 8px hsl(60 2% 8% / 0.12), 0 14px 32px -8px hsl(60 2% 8% / 0.22)",
        lg: "0 8px 16px hsl(60 2% 8% / 0.16), 0 24px 50px -10px hsl(60 2% 8% / 0.26)",
        xl: "0 16px 32px hsl(60 2% 8% / 0.20), 0 40px 80px -12px hsl(60 2% 8% / 0.32)",
        // Signature: 1px highlight + soft warm lift.
        lit: "inset 0 1px 0 0 hsl(46 30% 95% / 0.50), 0 1px 2px hsl(60 2% 8% / 0.10), 0 10px 28px -10px hsl(60 2% 8% / 0.22)",
        "lit-md": "inset 0 1px 0 0 hsl(46 30% 95% / 0.60), 0 4px 10px hsl(60 2% 8% / 0.14), 0 18px 40px -12px hsl(60 2% 8% / 0.28)",
        // Stronger ember lit edge for the one hero surface per screen.
        "lit-gold": "inset 0 1px 0 0 hsl(36 90% 80% / 0.55), 0 4px 12px hsl(60 2% 8% / 0.16), 0 16px 36px -12px hsl(36 86% 45% / 0.35)",
        // Ember CTA glow — a warm cast under the one accent action on screen.
        accent:
          "inset 0 1px 0 0 hsl(36 95% 82% / 0.45), 0 2px 8px hsl(36 86% 45% / 0.30), 0 10px 24px -8px hsl(36 86% 45% / 0.45)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Semantic status tones (readable in light + dark). Use the DEFAULT for
        // text/icons and `-soft` for the pill/wash background.
        success: {
          DEFAULT: "hsl(var(--success))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          soft: "hsl(var(--info-soft))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          soft: "hsl(var(--danger-soft))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      // Brand easing — the one curve used across motion (mirrors --ease in CSS).
      // Named so arbitrary `ease-[cubic-bezier(…,…)]` (ambiguous to Tailwind's
      // comma parser) isn't needed in class strings.
      transitionTimingFunction: {
        brand: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
}
