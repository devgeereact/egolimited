// Blog cover/feature image generation with zero new dependencies and no API key.
//
// We use Pollinations (https://pollinations.ai) image URLs: the image is rendered
// on the fly from a text prompt, so a blog title becomes a matching photograph
// without any image-generation API, key, or upload step. The resulting URL is
// stored directly in the blog_posts.cover_image field.
//
// ALWAYS pair an <img> using one of these URLs with an onError fallback to
// articleImageFor(slug) / fallbackArticleImage so a slow or failed Pollinations
// request never shows a broken image.

const POLLINATIONS = "https://image.pollinations.ai/prompt"

// A clean, on-brand photographic style suffix so every generated image reads as
// a real EGO property-maintenance photo rather than illustration or clipart.
const STYLE_SUFFIX =
  "professional editorial photograph, UK residential property maintenance, " +
  "natural daylight, realistic, high detail, no text, no watermark"

function buildPrompt(title: string): string {
  const clean = (title || "property maintenance guide").trim()
  return `${clean}. ${STYLE_SUFFIX}`
}

interface ImageOpts {
  width?: number
  height?: number
  seed?: number
}

// One Pollinations image URL for a given title + seed. Different seeds give
// different images for the same title (used for cover vs feature variants, and
// bumped on Regenerate for variety).
export function blogImageUrl(title: string, opts: ImageOpts = {}): string {
  const { width = 1600, height = 900, seed = 1 } = opts
  const prompt = encodeURIComponent(buildPrompt(title))
  return `${POLLINATIONS}/${prompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`
}

// The cover image for a post (16:9, used in the hero and on cards).
export function coverImageUrl(title: string, seed = 1): string {
  return blogImageUrl(title, { width: 1600, height: 900, seed })
}

// A set of in-body "feature" images that match the title, each with its own
// seed so they are visually distinct. `base` is bumped on Regenerate for variety.
export function featureImageUrls(title: string, count = 3, base = 1): string[] {
  const n = Math.max(1, Math.min(3, count))
  return Array.from({ length: n }, (_, i) =>
    blogImageUrl(title, { width: 1600, height: 900, seed: base + 100 + i }),
  )
}
