/**
 * EGO LIMITED API client. Talks to the PHP/MySQL backend.
 * - Dev (vite): cross-origin to the server API (CORS allows :5050/:5051).
 * - Prod: same-origin relative path under /api.
 */
export const API_BASE = import.meta.env.DEV
  ? "https://egolimited.com/api"
  : "/api"

const TOKEN_KEY = "ego_token"

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

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
  const token = getToken()
  if (auth && token) headers["Authorization"] = `Bearer ${token}`

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
