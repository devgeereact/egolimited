# EGO LTD — SEO Optimizer (Implementation Plan)

Concrete, prioritised fixes for the issues raised in **`02-SEO-AUDIT.md`**. Each item: what, where, how, expected impact. Ordered by ROI.

---

## 1. P0 — Prerender the SPA (biggest single win)

**Why:** non-JS crawlers/social scrapers only see the homepage `<head>`; every inner URL previews wrong and indexes slower.

**Recommended approach (fits cPanel static hosting — no Node runtime):** post-build static prerender.

### Option A — `react-snap` (least code)
```bash
cd landing
npm i -D react-snap
```
`landing/package.json`:
```jsonc
{
  "scripts": {
    "build": "vite build && react-snap"
  },
  "reactSnap": {
    "source": "dist",
    "include": [
      "/", "/services", "/sectors", "/areas", "/about",
      "/accreditations", "/contact", "/track",
      "/services/carpentry-joinery", "/services/painting-decorating",
      "/services/minor-plumbing", "/services/walls-tiling",
      "/services/exterior-grounds", "/services/mounting-fitting",
      "/services/property-turnarounds", "/services/planned-maintenance",
      "/areas/north-london", "/areas/south-london", "/areas/east-london",
      "/blog/winter-checklist-for-landlords",
      "/blog/planned-vs-reactive-maintenance",
      "/blog/what-to-expect-from-a-good-contractor",
      "/privacy", "/terms", "/cookies"
    ],
    "puppeteerArgs": ["--no-sandbox"]
  }
}
```
Hydration note: with React 19 + `createRoot`, switch the client entry to `hydrateRoot` when the DOM is prerendered (react-snap pattern) to avoid a flash.

### Option B — `vite-plugin-ssg` / `vite-react-ssg`
More control, type-safe route list, better hydration story. Slightly more wiring. Prefer this if Option A fights React 19 hydration.

**Verify after build:**
```bash
grep -o '<title>[^<]*' landing/dist/services/minor-plumbing/index.html
# expect: Minor Plumbing & Leak Repairs in London — EGO LTD
```
Then re-check `og:title`/`canonical` are page-specific in the emitted HTML, and that `--base=/` is intact.

**Impact:** correct social previews on every shared link, faster/cheaper indexing, correct canonical from first byte. **High.**

---

## 2. P1 — Fix the sitemap

**File:** `landing/public/sitemap.xml`

Add the three blog articles and `<lastmod>` everywhere. Generate it from `content.ts` at build (single source of truth) rather than hand-maintaining.

Add now (manual stopgap):
```xml
<url><loc>https://egolimited.com/blog/winter-checklist-for-landlords</loc><lastmod>2026-05-12</lastmod><priority>0.6</priority></url>
<url><loc>https://egolimited.com/blog/planned-vs-reactive-maintenance</loc><lastmod>2026-04-03</lastmod><priority>0.6</priority></url>
<url><loc>https://egolimited.com/blog/what-to-expect-from-a-good-contractor</loc><lastmod>2026-02-18</lastmod><priority>0.6</priority></url>
<url><loc>https://egolimited.com/blog</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>
```
Add `<lastmod>` to existing entries (use last meaningful content change date).

**Better (do once):** a tiny `scripts/gen-sitemap.ts` that imports `services`, `articles`, `areas` from `content.ts`/`areas.ts` and writes `public/sitemap.xml` in a `prebuild` step. Eliminates drift.

**Impact:** indexable blog content gets discovered; recrawl prioritisation improves. **Medium-high.**

---

## 3. P1 — Local SEO

### 3a. Google Business Profile (off-site, highest local lever)
Not a code change — but the single biggest local-ranking factor.
- Create/claim GBP for **EGO LTD, 11 Halesworth Road, London SE13 7TJ**, phone `07539 705576`.
- Categories: *Handyman*, *Building maintenance*, *Property maintenance*. Add all service areas (SE/South/North/East London).
- Add real photos (vans, before/after, team), services + prices, business hours matching the site.
- Drive reviews to GBP (see §5). GBP reviews + proximity + relevance = the local pack.

### 3b. Enrich the sitewide JSON-LD
**File:** `landing/index.html` — add to the `HomeAndConstructionBusiness` block:
```jsonc
"geo": { "@type": "GeoCoordinates", "latitude": 51.4566, "longitude": -0.0093 },
"logo": "https://egolimited.com/site/logo.png",
"sameAs": [
  "https://www.google.com/maps/place/?q=place_id:YOUR_GBP_PLACE_ID",
  "https://www.facebook.com/YOUR_PAGE",
  "https://www.instagram.com/YOUR_HANDLE"
]
```
(Replace coordinates with the verified SE13 7TJ lat/long and add real profile URLs as they go live. Don't ship placeholder URLs.)

### 3c. Deepen area pages
**Files:** `landing/src/site/pages/Areas.tsx`, `AreaDetail.tsx`, `areas.ts`
- Each area page: unique copy naming neighbourhoods + postcode districts served, 2–3 local proof points, an area-specific FAQ, and internal links to the top services.
- Emit per-page `localBusinessLd({ areaServed: [...] })` + `breadcrumbLd(...)` (helpers already in `Seo.tsx`).
- Thin/duplicate area pages do not rank — give each a reason to exist.

**Impact:** ranks for "maintenance/handyman [area] London" long-tail. **Medium-high (compounds with GBP).**

---

## 4. P2 — Structured-data enrichment

### 4a. FAQ schema
Confirm `faqLd(faqs)` is passed as `jsonLd` on the Home (or a dedicated FAQ section). If not, wire it:
```tsx
import Seo, { faqLd } from "@/site/components/Seo"
import { faqs } from "@/site/content"
<Seo title="..." description="..." jsonLd={faqLd(faqs)} />
```
**Impact:** FAQ rich snippets in SERP. **Medium.**

### 4b. Review / aggregateRating (when real reviews exist)
Once `/api/public/reviews` serves real, permissioned reviews, emit on Home:
```jsonc
"aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": 37 }
```
plus individual `Review` nodes. **Never hardcode a rating** — derive from the live feed; brand rule forbids unbackable claims. **Medium (star rich results).**

### 4c. Breadcrumbs everywhere
Service/area/article pages already have `breadcrumbLd` — ensure every deep page calls it. Helps SERP breadcrumb display + internal context.

---

## 5. P2 — Reviews engine (SEO + conversion flywheel)

The app already has a reviews module + `/api/public/reviews`. Close the loop:
1. On job completion / invoice paid, auto-send a review request (the campaigns/email tooling exists).
2. Route reviews to **Google Business Profile first** (local-pack fuel), then surface on-site.
3. Feed on-site reviews into `aggregateRating` schema (§4b).

**Impact:** reviews drive local rank + click-through + trust. **High over time.**

---

## 6. P3 — Performance & hygiene

- **Self-host fonts** (Barlow Semi Condensed, Inter, Source Code Pro) to remove 2 third-party origins — marginal LCP/privacy win. Keep `font-display: swap`.
- **Image discipline:** descriptive `alt` on all service/area imagery; serve `webp`/`avif`; lazy-load below-the-fold.
- **Preload** the LCP hero image and the primary font on Home.
- Keep `/app` + `/login` disallowed; never expose app/API routes in the sitemap.
- Run Lighthouse + Search Console "URL inspection" on a service page after prerender lands to confirm rendered HTML matches.

---

## 7. Suggested execution order

| # | Task | Effort | Impact |
|---|---|---|---|
| 1 | Prerender SPA (react-snap / vite-ssg) | M | 🔴 High |
| 2 | Generate sitemap from content + lastmod | S | 🟠 Med-high |
| 3 | Create + verify Google Business Profile | S (ops) | 🔴 High (local) |
| 4 | Add geo/logo/sameAs to JSON-LD | S | 🟠 Med |
| 5 | Deepen 3 area pages + their schema | M | 🟠 Med-high |
| 6 | Wire FAQ schema on Home | S | 🟡 Med |
| 7 | Review-request automation → GBP | M | 🔴 High (compounding) |
| 8 | aggregateRating/Review schema (live data) | S | 🟡 Med |
| 9 | Self-host fonts, image alt/webp, preload | M | 🟢 Low-med |

**Do 1–4 this sprint.** They are the difference between "renders fine for users" and "ranks and shares correctly for machines".

---

## 8. Measurement

- **Google Search Console:** submit sitemap, watch Coverage (indexed count should rise after prerender), Performance (impressions/clicks per query + page), and use URL Inspection to confirm rendered HTML.
- **GBP Insights:** calls, direction requests, "near me" discovery.
- **Targets (90 days):** all 21+ routes indexed; service/area pages appearing for "[service] London / [area]"; GBP in local pack for core SE-London terms; ≥10 Google reviews.
