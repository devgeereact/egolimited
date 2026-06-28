// Single fetch helper for the whole app.
// Dev hits the live API (CORS enabled in PHP); production is same-origin relative.
export const API_BASE = import.meta.env.DEV ? "https://egolimited.com" : ""

type Json = Record<string, unknown> | unknown[]

// Fired after any successful write (POST/PUT/DELETE/upload) so live surfaces —
// the notification bell, badges — can refetch instantly instead of going stale.
export const DATA_CHANGED = "ego:data-changed"
export function onDataChanged(fn: () => void): () => void {
  window.addEventListener(DATA_CHANGED, fn)
  return () => window.removeEventListener(DATA_CHANGED, fn)
}
function notifyDataChanged(): void {
  window.dispatchEvent(new Event(DATA_CHANGED))
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("ego_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// A PHP endpoint can return an HTML error page (host 500/404, a fatal, a WAF
// block) instead of JSON. Never surface that raw markup to the user — turn it
// into a clean, human message keyed off the HTTP status.
function nonJsonError(text: string, status: number): Error {
  const t = (text || "").trim()
  const looksMarkup = t.startsWith("<") || /<html[\s>]/i.test(t)
  if (!t || looksMarkup) {
    if (status >= 500 || status === 0)
      return new Error("The server hit an error and couldn't complete that. Please try again shortly.")
    if (status === 404)
      return new Error("That service is unavailable right now. Please try again shortly.")
    if (status === 401 || status === 403)
      return new Error("Your session has expired or you don't have access. Please sign in again.")
    if (status >= 400)
      return new Error("That request couldn't be completed. Please check the details and try again.")
    return new Error("The server returned an unexpected response. Please try again shortly.")
  }
  // Plain-text (non-markup) body — safe to show a short, trimmed snippet.
  return new Error(t.slice(0, 140))
}

// A hung PHP endpoint must not leave a fetch promise pending forever. Wrap each
// request in an AbortController so it rejects after `ms` with a clear message;
// an explicitly-passed signal (if any) is still honoured.
const REQUEST_TIMEOUT_MS = 45_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController()
  const caller = init.signal
  if (caller) caller.addEventListener("abort", () => ctrl.abort(), { once: true })
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (e) {
    if (ctrl.signal.aborted && !(caller && caller.aborted)) {
      throw new Error("Request timed out")
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function request<T = Json>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}/${path.replace(/^\//, "")}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options.headers || {}),
    },
  })

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw nonJsonError(text, res.status)
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data
        ? String((data as Record<string, unknown>).error)
        : null) || `Request failed (${res.status})`
    throw new Error(msg)
  }
  const method = (options.method ?? "GET").toUpperCase()
  if (method !== "GET") notifyDataChanged()
  return data as T
}

// Multipart upload — let the browser set the Content-Type boundary itself.
async function upload<T = Json>(path: string, form: FormData): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { ...authHeader() },
    body: form,
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw nonJsonError(text, res.status)
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as Record<string, unknown>).error)
        : `Upload failed (${res.status})`
    throw new Error(msg)
  }
  notifyDataChanged()
  return data as T
}

// Absolute URL for a stored file path (e.g. uploads/jobs/12/x.jpg).
export function fileUrl(path: string): string {
  return `${API_BASE}/${path.replace(/^\//, "")}`
}

export const api = {
  get: <T = Json>(path: string) => request<T>(path),
  post: <T = Json>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T = Json>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T = Json>(path: string) => request<T>(path, { method: "DELETE" }),
  upload,
}
