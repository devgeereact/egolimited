# EGO LTD — SEO Audit

**Site:** https://egolimited.com (landing) · SPA (Vite + React 19 + TS + Tailwind v4)
**Audit date:** 2026-06-29
**Scope:** Public marketing site (`landing/`). The app (`/app/`) and API (`/api/`) are correctly excluded from indexing.

---

## 0. Headline verdict

The technical foundation is **above average for a small-business site**: there is hand-tuned per-page metadata, a full schema.org `HomeAndConstructionBusiness` block, a sitemap, a robots file, OG/Twitter cards, and a PWA manifest. The single biggest structural risk is that the site is a **client-side-rendered SPA**, so non-JS crawlers and social scrapers see only the homepage `<head>`. Fixing that (prerender/SSG) is the one change that moves the needle most.

**Overall score: 72/100** — strong on-page intent, weak on render delivery and local-SEO depth.

| Area | Score | Note |
|---|---|---|
| Crawlability & indexing | 7/10 | robots + sitemap good; SPA render gap |
| Metadata (titles/desc) | 9/10 | hand-tuned, length-correct, brand-suffixed |
| Structured data | 7/10 | LocalBusiness solid; missing ratings, sameAs, geo |
| Social / OG | 5/10 | only homepage static; per-page OG needs JS |
| Sitemap | 6/10 | missing blog articles + lastmod |
| Local SEO | 5/10 | no GBP signals, thin area-page depth |
| Performance | 7/10 | fonts swap + preconnect good; CSR cost |
| Content & internal linking | 7/10 | good service copy; sitemap/link gaps |

---

## 1. What's already done well (keep it)

- **`index.html` head is complete**: `title`, `meta description`, canonical, `og:*` (title, description, type, site_name, url, locale `en_GB`, 1200×630 image + alt), `twitter:card=summary_large_image`, `theme-color` (light + dark), `apple-touch-icon`, manifest.
- **Sitewide JSON-LD** `HomeAndConstructionBusiness` with `@id`, name, url, image, telephone (`+447539705576`), email, description, `priceRange`, full `PostalAddress`, `areaServed` (London + Greater London), and `openingHoursSpecification`. This is exactly the right type for a local trades business.
- **Per-page `<head>` management** via `Seo.tsx` — sets title/description/canonical/OG/Twitter and per-route JSON-LD, and clears stale JSON-LD on route change (a subtle correctness win).
- **Hand-tuned per-page tags** in `content.ts` (`serviceSeo`, `articleSeo`) — titles ≤60 chars, descriptions 150–160 chars, brand-suffixed, with phone CTA. This is better than most agencies ship.
- **Schema helpers** for `BreadcrumbList`, `Service`, `Article`, `FAQPage`, and a path-scoped `localBusiness` node (no `@id` collision with the sitewide node).
- **robots.txt** correctly `Allow: /`, disallows `/app` + `/login`, and points to the sitemap.
- **Fonts**: `preconnect` to Google Fonts + `display=swap` (no invisible-text flash, no render block surprise).
- **Mobile**: viewport set, PWA installable, dark-mode theme-color.

---

## 2. Issues by priority

### 🔴 P0 — Render delivery (the one that matters most)

**Problem:** The site is a CSR SPA. The static `index.html` carries **only the homepage** title/description/OG/JSON-LD. Every other route (`/services/*`, `/areas/*`, `/about`, blog articles) gets its real metadata **only after React runs** via `Seo.tsx`.

- **Googlebot** renders JS, so it *eventually* sees correct per-page tags — but with a render delay and crawl-budget cost.
- **Facebook, LinkedIn, WhatsApp, Slack, X scrapers do NOT run JS.** Share any inner URL and they pull the homepage OG title/description/image. So a shared `/services/minor-plumbing` link previews as "EGO LTD — General Maintenance, London", not the plumbing page.
- **Initial canonical** on every route is `https://egolimited.com/` (from static HTML) until JS rewrites it — a transient self-referencing-canonical risk on deep pages.

**Fix:** Prerender the marketing routes to static HTML so each ships its own `<head>` before JS. Options, cheapest first:
1. **`vite-plugin-prerender` / `vite-plugin-ssg`** (or `react-snap` post-build) — crawl the known routes at build and emit one HTML file per route with baked-in head tags. Best fit for the current cPanel static-hosting model — no Node runtime needed.
2. Migrate landing to an SSG framework (Astro) — bigger lift, not justified yet.

This single fix upgrades crawlability, social previews, and canonical correctness at once.

### 🟠 P1 — Sitemap gaps

- **Blog articles are missing.** `content.ts` defines articles (`winter-checklist-for-landlords`, `planned-vs-reactive-maintenance`, `what-to-expect-from-a-good-contractor`) with dates, but none appear in `sitemap.xml`. They are indexable content with `Article` schema — they must be listed.
- **No `<lastmod>`** anywhere. Add it (use article `date`, and a build date for static pages) — helps Google prioritise recrawls.
- Confirm `/reviews`, `/sectors/*` detail, and any blog index route are present.

### 🟠 P1 — Local SEO depth

- **No Google Business Profile signals.** The biggest lever for "[trade] near me" / "[trade] London" is a verified, complete GBP with photos, services, and reviews — this is off-site and not yet referenced anywhere. (See optimizer doc, §Off-site.)
- **Thin area pages.** `/areas/south-london` etc. need genuine local content (neighbourhoods/postcodes served, local landmarks, area-specific copy) to rank — not a templated paragraph. Each should carry its own `localBusiness` + `BreadcrumbList` JSON-LD (helper already exists).
- **No `geo` coordinates** in the LocalBusiness schema (`latitude`/`longitude`) — add them.
- **No `sameAs`** (links to GBP, Facebook, Instagram, Checkatrade) in the schema — add once profiles exist.

### 🟡 P2 — Structured-data enrichment

- **No `aggregateRating` / `Review` schema.** Reviews exist (`reviews` in `content.ts`, live `/api/public/reviews` feed). Once real permissioned reviews are live, emit `Review` + `aggregateRating` for rich-result eligibility. Do **not** fabricate ratings (brand rule: never publish a claim you can't back).
- **FAQ schema:** `faqLd` helper exists — confirm it's actually rendered on the homepage/FAQ section. FAQ rich results are easy wins for a services site.
- **Logo:** add an `Organization` `logo` (distinct from `og-image`) for knowledge-panel eligibility.

### 🟡 P2 — Content & internal linking

- Service pages have solid, honest copy — good. Area and sector pages need the same depth.
- Ensure every service links to relevant area pages and vice-versa (internal-link mesh helps both crawl and local relevance).
- Blog cadence is currently 3 articles — keep publishing (planned-vs-reactive, seasonal checklists, "how we price" — high-intent, low-competition long-tail).

### 🟢 P3 — Minor / hygiene

- **NAP consistency:** phone is `07539 705576` in copy and `+447539705576` in schema — consistent (good). Keep email `hello@egolimited.com` identical everywhere (note: internal docs reference `*.co.uk` logins — that's the app, not public NAP; don't leak `.co.uk` into public pages).
- `priceRange: "££"` is fine as a signal; real published rates are still "Price on request" in `pricing` (a conversion note more than SEO).
- Consider self-hosting fonts later to drop two third-party connections (marginal LCP win).
- Add `image` `alt` discipline across service/area imagery (accessibility + image search).

---

## 3. Quick-win checklist (do these first)

- [ ] Add a prerender step to the landing build (P0) — bakes per-route `<head>` + OG + canonical into static HTML.
- [ ] Add blog articles + `<lastmod>` to `sitemap.xml` (P1).
- [ ] Create + verify a Google Business Profile; add `sameAs` + `geo` to JSON-LD (P1).
- [ ] Confirm `FAQPage` schema renders on the homepage (P2).
- [ ] Deepen the three area pages with real local content + per-page localBusiness schema (P1/P2).
- [ ] Plan `Review`/`aggregateRating` schema for when real reviews go live (P2).

Detailed implementation steps and exact file edits are in **`03-SEO-OPTIMIZER.md`**.
