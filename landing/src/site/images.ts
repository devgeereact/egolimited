// Public-site photography. To avoid shipping/binary-managing dozens of photos,
// every image is generated on the fly from a text prompt via Pollinations
// (no API key, no upload). Swap any prompt here to re-skin the whole site.
const POLLINATIONS = "https://image.pollinations.ai/prompt"
const STYLE =
  "professional editorial photograph, UK property maintenance, natural daylight, " +
  "realistic, high detail, warm tones, no text, no watermark"

function photo(prompt: string, w = 1600, h = 1000, seed = 7): string {
  return `${POLLINATIONS}/${encodeURIComponent(`${prompt}. ${STYLE}`)}?width=${w}&height=${h}&nologo=true&seed=${seed}`
}

export const img = {
  hero: {
    main: photo("a skilled tradesperson in workwear fixing a timber door in a London home", 1920, 1080, 11),
    site: photo("a tidy van and tool rack for a property maintenance company", 1600, 1000, 12),
  },
  banner: {
    about: photo("a friendly maintenance engineer talking to a homeowner at the doorstep", 1600, 900, 21),
    services: photo("hands using tools on a home repair, close up", 1600, 900, 22),
    sectors: photo("a London terraced street with residential and commercial property", 1600, 900, 23),
    contact: photo("a maintenance engineer on the phone outside a London property", 1600, 900, 24),
    resources: photo("a desk with property maintenance plans and a coffee", 1600, 900, 25),
    trust: photo("a clipboard, insurance certificate and tools on a workbench", 1600, 900, 26),
  },
  about: {
    primary: photo("a maintenance engineer carefully repairing a window frame, tall portrait", 900, 1200, 31),
    inset: photo("a handshake between a contractor and a happy customer", 800, 800, 32),
  },
  cta: photo("a tradesperson tidying up after finishing a job", 1600, 900, 41),
  team: [
    photo("portrait of a friendly UK tradesperson in workwear", 800, 1000, 51),
    photo("portrait of a maintenance coordinator on the phone", 800, 1000, 52),
    photo("portrait of a planned maintenance manager with a clipboard", 800, 1000, 53),
    photo("portrait of an accounts person at a desk", 800, 1000, 54),
  ],
  people: [
    photo("a UK homeowner smiling at home", 800, 800, 61),
    photo("a landlord outside a rental property", 800, 800, 62),
    photo("a facilities manager in an office building", 800, 800, 63),
  ],
} as const

const tradePrompt: Record<string, string> = {
  "carpentry-joinery": "carpenter fitting a wooden door and shelving in a home",
  "painting-decorating": "decorator painting an interior wall with a roller, tidy",
  "minor-plumbing": "plumber fixing a kitchen tap under a sink",
  "walls-tiling": "tiler re-grouting bathroom wall tiles, clean lines",
  "exterior-grounds": "worker clearing gutters and tidying a garden exterior",
  "mounting-fitting": "handyman mounting a TV bracket level on a wall",
  "property-turnarounds": "clean empty rental flat ready for new tenants",
  "planned-maintenance": "engineer inspecting a property with a checklist",
}
export const serviceImage: Record<string, string> = Object.fromEntries(
  Object.entries(tradePrompt).map(([slug, p], i) => [slug, photo(p, 1200, 800, 100 + i)]),
)

const articlePrompt: Record<string, string> = {
  "winter-checklist-for-landlords": "frosty British house exterior in winter, gutters and roof",
  "planned-vs-reactive-maintenance": "maintenance schedule and tools on a workbench",
  "what-to-expect-from-a-good-contractor": "a contractor shaking hands with a homeowner",
}
export const articleImage: Record<string, string> = Object.fromEntries(
  Object.entries(articlePrompt).map(([slug, p], i) => [slug, photo(p, 1600, 900, 200 + i)]),
)
export const fallbackArticleImage = photo("UK property maintenance guide", 1600, 900, 250)
export function articleImageFor(slug: string): string {
  return articleImage[slug] ?? fallbackArticleImage
}

const sectorPrompt: Record<string, string> = {
  Homeowners: "a comfortable London family home interior",
  Landlords: "a smart London rental property exterior",
  "Letting & managing agents": "a row of managed London apartments",
  "Commercial & facilities": "a modern commercial office building exterior",
}
export const sectorImage: Record<string, string> = Object.fromEntries(
  Object.entries(sectorPrompt).map(([name, p], i) => [name, photo(p, 1200, 800, 300 + i)]),
)
