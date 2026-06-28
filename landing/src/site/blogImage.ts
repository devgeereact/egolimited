// Blog cover/feature image generation via Pollinations (no API key).
const POLLINATIONS = "https://image.pollinations.ai/prompt"
const STYLE_SUFFIX =
  "professional editorial photograph, UK residential property maintenance, " +
  "natural daylight, realistic, high detail, no text, no watermark"

function buildPrompt(title: string): string {
  const clean = (title || "property maintenance guide").trim()
  return `${clean}. ${STYLE_SUFFIX}`
}
interface ImageOpts { width?: number; height?: number; seed?: number }
export function blogImageUrl(title: string, opts: ImageOpts = {}): string {
  const { width = 1600, height = 900, seed = 1 } = opts
  const prompt = encodeURIComponent(buildPrompt(title))
  return `${POLLINATIONS}/${prompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`
}
export function coverImageUrl(title: string, seed = 1): string {
  return blogImageUrl(title, { width: 1600, height: 900, seed })
}
export function featureImageUrls(title: string, count = 3, base = 1): string[] {
  const n = Math.max(1, Math.min(3, count))
  return Array.from({ length: n }, (_, i) => blogImageUrl(title, { width: 1600, height: 900, seed: base + 100 + i }))
}
