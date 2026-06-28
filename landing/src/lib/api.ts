// Minimal API client for the public site. Talks to the EGO LIMITED PHP backend.
// Most dynamic features degrade gracefully (bundled fallbacks) when an endpoint
// isn't present, so the marketing site always renders.
export const API_BASE = import.meta.env.DEV ? "https://egolimited.com/api" : "/api"

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`)
  }
  return data as T
}

export const api = {
  get: <T = unknown>(path: string) => request<T>("GET", path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body),
}
