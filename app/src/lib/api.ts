/**
 * EGO LIMITED API client. Talks to the PHP/MySQL backend.
 * - Prod: same-origin relative path under /api.
 * - Dev (vite): cross-origin to the server API (CORS allows :5050/:5051).
 *
 * ⚠️ The dev default is the LIVE PRODUCTION API. There is no staging environment, so running
 * `npm run dev` and clicking "delete customer" deletes a REAL customer on egolimited.com.
 * To point dev at a local PHP API instead, set VITE_API_BASE in app/.env.local, e.g.
 *
 *     VITE_API_BASE=http://127.0.0.1:8080
 *
 * (and add that origin to `cors_origins` in the API's config.php). The default is left as-is
 * so nobody's existing workflow breaks, but prefer the local API for anything destructive.
 */
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? "https://egolimited.com/api" : "/api")

import { clerkEnabled, clerkToken } from "@/lib/clerk"

const TOKEN_KEY = "ego_token"

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

/** The bearer for the next request: a fresh Clerk session token, or the legacy own-login token. */
async function authToken(): Promise<string | null> {
  if (!clerkEnabled) return getToken()
  const r = await clerkToken()
  return r.kind === "token" ? r.token : null
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = opts
  const headers: Record<string, string> = {}
  const token = auth ? await authToken() : null
  if (token) headers["Authorization"] = `Bearer ${token}`

  // The host's mod_security 403s empty POST bodies — always send at least {}.
  const sendsBody = method !== "GET" && method !== "HEAD"
  let payload: string | undefined
  if (sendsBody) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(body ?? {})
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload })
  return handle<T>(res)
}

/**
 * Multipart/form-data POST (file uploads). Do NOT set Content-Type — the browser adds
 * the boundary. Same auth + error handling as api().
 */
export async function apiForm<T = unknown>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {}
  const token = await authToken()
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form })
  return handle<T>(res)
}

/**
 * Fetch a file endpoint with auth and trigger a browser download. Used for
 * server-generated CSV/report exports (a plain <a href> can't send the Bearer token).
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {}
  const token = await authToken()
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new ApiError(res.status, (d as { error?: string }).error || `Download failed (${res.status})`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Session expired / no longer valid: clear the token and bounce to login so
    // pages don't silently blank out. Guard against redirect loops on the login page.
    if (res.status === 401) {
      setToken(null)
      const loginPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/ego/login`
      if (window.location.pathname !== loginPath) {
        window.location.assign(loginPath)
      }
    }
    throw new ApiError(res.status, (data as { error?: string }).error || `Request failed (${res.status})`)
  }
  return data as T
}
