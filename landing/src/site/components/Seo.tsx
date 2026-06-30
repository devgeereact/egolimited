import { useEffect } from "react"

// Per-page <head> management without a dependency. Googlebot renders client JS,
// so the title/description/canonical we set here are picked up for search.
// Site-wide social tags + JSON-LD that non-JS scrapers need live statically in
// index.html; this component refines the per-page title/description/canonical.

const SITE = "https://egolimited.com"
const BRAND = "EGO LTD"

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute("content", content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", rel)
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

function removeMeta(attr: "name" | "property", key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove()
}

// Per-page JSON-LD. We manage one <script data-seo-jsonld> element, replacing
// its contents on each route and clearing it when a page ships no schema, so a
// stale Service/Article block never leaks onto the next page. The sitewide
// LocalBusiness block in index.html is left untouched.
function setJsonLd(data: unknown) {
  const id = "seo-jsonld"
  let el = document.head.querySelector<HTMLScriptElement>(`script#${id}`)
  if (!data) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement("script")
    el.id = id
    el.type = "application/ld+json"
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export default function Seo({
  title,
  description,
  path = "",
  noindex = false,
  jsonLd,
}: {
  title: string
  description?: string
  path?: string
  noindex?: boolean
  /** Optional structured data (a schema.org object or array of objects). */
  jsonLd?: unknown
}) {
  useEffect(() => {
    const full = title.includes(BRAND) ? title : `${title} · ${BRAND}`
    document.title = full
    const url = SITE + path

    upsertMeta("property", "og:title", full)
    upsertMeta("name", "twitter:title", full)
    upsertMeta("property", "og:url", url)
    upsertLink("canonical", url)

    if (description) {
      upsertMeta("name", "description", description)
      upsertMeta("property", "og:description", description)
      upsertMeta("name", "twitter:description", description)
    }

    // Keep soft-404 / not-found renders out of the index. Default pages clear
    // any stale robots meta a prior not-found render may have left behind.
    if (noindex) upsertMeta("name", "robots", "noindex")
    else removeMeta("name", "robots")

    setJsonLd(jsonLd)
    return () => setJsonLd(null)
  }, [title, description, path, noindex, jsonLd])

  return null
}

// Shared schema.org helpers so each page can declare structured data inline.
const BUSINESS_ID = `${SITE}/#business`

export function breadcrumbLd(
  crumbs: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: SITE + c.path,
    })),
  }
}

export function serviceLd(opts: {
  name: string
  description: string
  path: string
  areaServed?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: SITE + opts.path,
    areaServed: opts.areaServed ?? "London",
    provider: { "@type": "HomeAndConstructionBusiness", "@id": BUSINESS_ID },
  }
}

export function articleLd(opts: {
  title: string
  description: string
  path: string
  datePublished: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    datePublished: opts.datePublished,
    mainEntityOfPage: SITE + opts.path,
    author: { "@type": "Organization", name: BRAND },
    publisher: {
      "@type": "Organization",
      name: BRAND,
      logo: { "@type": "ImageObject", url: `${SITE}/og-image.png` },
    },
  }
}

export function faqLd(
  items: { q: string; a: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
}

export function localBusinessLd(opts: {
  name: string
  description: string
  path: string
  areaServed: string[]
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    // Path-scoped id so this area node stays distinct from the canonical
    // sitewide #business node defined in index.html (no @id collision).
    "@id": `${SITE + opts.path}#localbusiness`,
    name: BRAND,
    url: SITE + opts.path,
    image: `${SITE}/og-image.png`,
    telephone: "+447539705576",
    email: "hello@egolimited.com",
    description: opts.description,
    priceRange: "££",
    address: {
      "@type": "PostalAddress",
      streetAddress: "11 Halesworth Road",
      addressLocality: "London",
      postalCode: "SE13 7TJ",
      addressCountry: "GB",
    },
    areaServed: opts.areaServed.map((name) => ({ "@type": "Place", name })),
  }
}
