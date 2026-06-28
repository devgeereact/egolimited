# PULSE UI — Design System Reference (EGO LIMITED)

> **Source of truth for all UI work on EGO LIMITED.** Scraped from the provided PULSE UI
> (`shadcn-ui-admin` / "PulseUI Pro") app. When tweaking, restructuring, or building new screens,
> **follow this exactly** so everything stays consistent with the kit. Don't invent new tokens,
> radii, or variant styles — reuse what's here.
>
> Foundation: **shadcn/ui (New York style) + Radix primitives + Tailwind + CVA + `cn()`**.
> React 19, React Router 7, Tailwind 3, `tailwindcss-animate`.

---

## 1. Design tokens (the law)

All color is **HSL CSS variables**, themed by a class on `<html>`. Tailwind maps them to semantic
color names — **always use the semantic name, never a raw hex/hsl** (e.g. `bg-primary`,
`text-muted-foreground`, `border-border`).

Semantic colors (Tailwind ← CSS var):
`background, foreground, card(/-foreground), popover(/-foreground), primary(/-foreground),
secondary(/-foreground), muted(/-foreground), accent(/-foreground), destructive(/-foreground),
border, input, ring, chart-1..5, sidebar(/-foreground/-primary/-accent/-border/-ring)`.

- **Radius:** `--radius: 0.625rem` (10px). Tailwind: `rounded-lg = var(--radius)`,
  `rounded-md = radius−2px`, `rounded-sm = radius−4px`. Cards use `rounded-xl`, controls `rounded-md`,
  badges/pills `rounded-full`.
- **Container:** centered, `padding: 2rem`, max width at `2xl: 1400px`.
- **Dark mode:** class-based (`darkMode: ["class"]`).

### Themes (5 + base) — `dark-blue` is DEFAULT
Applied via a class on `<html>`; managed by `UIThemeProvider` + `useUIThemeStore` (zustand);
light/dark handled by `next-themes`. Theme list: `dark-blue, classic-light, gaussian-black, semi-dark`
(+ base `:root` light and `.dark`).

| Theme | Feel | Primary | Notes |
|-------|------|---------|-------|
| **dark-blue** *(default)* | Dark "Nebula", glassmorphism | `221 83% 62%` blue | Cards = `hsl(card/0.72)` + `backdrop-blur(18px)` + border `hsl(border/0.7)` + `0 8px 30px rgba(0,0,0,.28)`; nebula bg image; sidebar glass blur(22px) |
| classic-light | Light glass, purple accent | `262 83% 58%` | Card glass blur(12px); radial purple/pink gradients on bg + sidebar |
| gaussian-black | Near-black, image bg | `0 0% 98%` | Transparent cards over `bg-themes/gausian-black.jpg` |
| semi-dark | Light body + dark sidebar | `217 91% 60%` | Only re-themes the sidebar |
| base `:root` / `.dark` | Neutral gray shadcn | `0 0% 15%` / `0 0% 92%` | Fallback when no custom theme class |

**Default (`:root`) key values:** `--background:0 0% 100%`, `--foreground:0 0% 9%`,
`--primary:0 0% 15%`, `--muted-foreground:0 0% 45%`, `--border:0 0% 90%`, `--destructive:0 72% 51%`.
**`.dark`:** `--background:0 0% 10%`, `--card:0 0% 15%`, `--primary:0 0% 92%`, `--border:0 0% 100%/10%`.

### Chart palette (`--chart-1..5`, per theme)
- **dark-blue:** cyan `188 94% 48%`, blue `217 91% 60%`, violet `262 83% 66%`, emerald `152 76% 52%`, amber `38 92% 58%`.
- base light: orange/cyan/navy/lime/amber · `.dark`: indigo/emerald/amber/violet/orange · classic-light: purple/blue/emerald/amber/pink.
- Use `hsl(var(--chart-N))` for series colors so charts re-theme automatically.

### Gradient utilities (cards / progress / accents)
`.gradient-red|blue|green|purple|orange|violet|cyan` — all `linear-gradient(310deg, …)`:
red `#ee0979→#ff6a00`, blue `#00c6fb→#005bea`, green `#17ad37→#98ec2d`, purple `#7928ca→#ff0080`,
orange `#f7971e→#ffd200`, violet `#3494e6→#ec6ead`, cyan `#2af598→#009efd`.

---

## 2. Typography
- **Font family:** Tailwind default sans (system stack) — **no custom webfont is loaded.** Keep it,
  or if EGO adds a brand font, set it once in `tailwind.config` + `index.css` and document here.
- **Scale (as used):** body `text-sm` (14px) is the workhorse; inputs `text-base` on mobile →
  `md:text-sm`; badges/table-sub `text-xs`; helper/meta `text-muted-foreground`.
- **Weights:** `font-medium` (buttons, table head, labels), `font-semibold` (card titles, badges).
- **Card title:** `font-semibold leading-none tracking-tight`. **Card description:** `text-sm text-muted-foreground`.

---

## 3. Components — exact specs

All live in `app/src/components/ui/` (41 components). Variants use **CVA**; compose classes with
`cn()` from `@/lib/utils`. **Reuse these primitives — don't hand-roll buttons/inputs/etc.**

### Button (`button.tsx`)
Base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium
transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 [&_svg]:size-4`.
- **variants:** `default` (bg-primary, shadow, hover bg-primary/90) · `destructive` · `outline`
  (border-input, bg-background, hover bg-accent) · `secondary` (hover/80) · `ghost` (hover bg-accent) · `link` (underline).
- **sizes:** `default h-9 px-4 py-2` · `sm h-8 px-3 text-xs` · `lg h-10 px-8` · `icon h-9 w-9`.
- `asChild` via Radix `Slot`. Icons auto-sized to `size-4`.

### Badge (`badge.tsx`)
`rounded-full border px-2.5 py-0.5 text-xs font-semibold`. Variants: `default` (bg-primary),
`secondary`, `destructive`, `outline` (text-foreground only), `ghost` (bg-muted/text-muted-foreground).

### Input (`input.tsx`)
`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm
md:text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring
disabled:opacity-50`. (Textarea, select, checkbox, radio-group, switch, slider, toggle follow the
same border-input + ring-ring focus language.)

### Card (`card.tsx`)
`rounded-xl border bg-card text-card-foreground shadow`. Parts: `CardHeader` (`flex flex-col
space-y-1.5 p-6`), `CardTitle` (`font-semibold leading-none tracking-tight`), `CardDescription`
(`text-sm text-muted-foreground`), `CardContent` (`p-6 pt-0`), `CardFooter` (`flex items-center p-6 pt-0`).
> In `dark-blue`/`classic-light`, `.card` gets glassmorphism (backdrop-blur + translucency) via CSS —
> keep using the `Card` component so it inherits this automatically.

### Table (`table.tsx`)
Wrapper `relative w-full overflow-auto`; `table` `w-full caption-bottom text-sm`. Head cell
(`TableHead`): `h-10 px-2 text-left align-middle font-medium text-muted-foreground`. Row: `border-b
transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted`. Cell: `p-2 align-middle`.
Footer: `border-t bg-muted/50 font-medium`. Data grids use **@tanstack/react-table**.

### Forms
**react-hook-form + zod** (`@hookform/resolvers`). Use the shadcn `form.tsx` set
(`Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage`) + `label.tsx`,
`field.tsx`, `input-group.tsx`. Validation messages render via `FormMessage` in `text-destructive`.

### Full component inventory (`app/src/components/ui/`)
`accordion, alert, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox,
collapsible, colored-progress, command, dialog, dropdown-menu, field, form, input-group, input,
label, pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, sidebar,
skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip`.
- **Overlays:** `dialog`, `sheet`, `popover`, `dropdown-menu`, `tooltip`, `command` (cmdk palette).
- **Nav/layout:** `sidebar` (custom, theme-aware `.nav-link.active` gradient), `tabs`, `breadcrumb`,
  `pagination`, `scroll-area`, `separator`.
- **Feedback:** `sonner` (toasts), `skeleton` (loading), `progress` / `colored-progress`, `alert`.

---

## 4. Icons
- **Primary (React):** `lucide-react` (used ~152×). Secondary: `@tabler/icons-react`. In buttons,
  icons auto-size to `size-4` (16px) via the button base class.
- **Icon fonts (CDN, in `index.html`):** Bootstrap Icons `1.11.3` + Boxicons. Available as `<i class>`.
- Rule: prefer **lucide-react** for new UI; keep icon usage monochrome via `currentColor`.

## 5. Charts
- **Recharts** (~30×, primary) + **ApexCharts / react-apexcharts** (~9×). shadcn `chart.tsx` wrapper
  (`ChartContainer`/`ChartTooltip`) ties Recharts to the token palette.
- **Always** color series with `hsl(var(--chart-1..5))` (and `--primary`/`--muted`) so charts follow
  the active theme. Calendar = **FullCalendar**, already themed to tokens (`--fc-*` mapped to `--border`,
  `--background`, `--muted`; events use `secondary`).

## 6. Stack notes for consistency
- **Styling:** Tailwind utility classes + CVA variants. Merge with `cn()` (clsx + tailwind-merge).
  Never inline styles for things a token/utility covers.
- **State/theme:** zustand stores (`@/store/*`, e.g. `ui-theme.store`), `next-themes` for light/dark.
- **Other libs in kit:** `framer-motion` (animation), `embla-carousel`, `react-day-picker`, `cmdk`,
  `tiptap` (rich text), `jspdf`/`jspdf-autotable` + `xlsx` + `file-saver` (exports),
  `react-phone-number-input`, `date-fns`.

## 7. Do / Don't (keep it consistent)
- ✅ Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) — never raw colors.
- ✅ Build from `components/ui/*` primitives + their CVA variants. Extend via `className` + `cn()`.
- ✅ Keep radii to the scale (`rounded-md` controls, `rounded-xl` cards, `rounded-full` pills).
- ✅ New series colors → `--chart-N`. New screens → wrap content in `Card`.
- ✅ Default theme is **dark-blue** (glassmorphic) — verify new UI looks right there first, then light.
- ❌ Don't introduce new fonts, shadows, radii, or one-off hex colors without adding them here first.
- ❌ Don't bypass the token system or hard-code dark/light values — it breaks theme switching.
