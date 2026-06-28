// Central manifest for the public-site photography. Files live in
// public/site/** and are served from the web root (e.g. "/site/hero/hero-main.jpg").
// Curated, licence-free photography (Unsplash) chosen to fit EGO's trades and
// property work. Swap any path here to re-skin the whole site in one place.

export const img = {
  hero: {
    main: "/site/hero/hero-main.jpg", // tradesperson working timber
    site: "/site/hero/hero-site.jpg", // tool rack / trades
  },
  // Per-page banner backgrounds (darkened behind the page title).
  banner: {
    about: "/site/banner/about.jpg",
    services: "/site/banner/services.jpg",
    sectors: "/site/banner/sectors.jpg",
    contact: "/site/banner/contact.jpg",
    resources: "/site/banner/resources.jpg",
    trust: "/site/banner/trust.jpg",
  },
  about: {
    primary: "/site/misc/about-1.jpg", // handyman at work (tall)
    inset: "/site/misc/about-2.jpg", // handshake (square)
  },
  cta: "/site/misc/cta.jpg",
  team: [
    "/site/team/1.jpg",
    "/site/team/2.jpg",
    "/site/team/3.jpg",
    "/site/team/4.jpg",
  ],
  people: ["/site/people/1.jpg", "/site/people/2.jpg", "/site/people/3.jpg"],
} as const

// Service slug -> hero/card image.
export const serviceImage: Record<string, string> = {
  "carpentry-joinery": "/site/trades/carpentry.jpg",
  "painting-decorating": "/site/trades/painting.jpg",
  "minor-plumbing": "/site/trades/plumbing.jpg",
  "walls-tiling": "/site/trades/tiling.jpg",
  "exterior-grounds": "/site/trades/exterior.jpg",
  "mounting-fitting": "/site/trades/mounting.jpg",
  "property-turnarounds": "/site/trades/turnaround.jpg",
  "planned-maintenance": "/site/trades/planned.jpg",
}

// Article slug -> hero image (articles carry no image of their own).
export const articleImage: Record<string, string> = {
  "winter-checklist-for-landlords": "/site/trades/exterior.jpg",
  "planned-vs-reactive-maintenance": "/site/trades/planned.jpg",
  "what-to-expect-from-a-good-contractor": "/site/misc/about-2.jpg",
}
export const fallbackArticleImage = "/site/banner/resources.jpg"
export function articleImageFor(slug: string): string {
  return articleImage[slug] ?? fallbackArticleImage
}

// Sector name -> image.
export const sectorImage: Record<string, string> = {
  Homeowners: "/site/sectors/homeowners.jpg",
  Landlords: "/site/sectors/landlords.jpg",
  "Letting & managing agents": "/site/sectors/agents.jpg",
  "Commercial & facilities": "/site/sectors/commercial.jpg",
}
