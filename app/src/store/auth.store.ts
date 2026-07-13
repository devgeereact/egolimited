import { create } from "zustand"
import { api, ApiError, setToken, getToken } from "@/lib/api"
import type { Role } from "@/lib/roles"

/**
 * The last known signed-in user, kept so the app can boot with NO NETWORK.
 *
 * This is a UX cache, never a security decision: the server re-checks the bearer token on every
 * single request (see lib/authz.php), so a stale cached user grants nothing. Its only job is to
 * let an engineer in a basement reopen the app and keep working instead of being bounced to a
 * login screen they physically cannot complete.
 */
const USER_KEY = "ego_user"
const cacheUser = (u: AuthUser | null) => {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
  } catch { /* private mode / storage full — the app still works, just not offline */ }
}
const cachedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch { return null }
}

export type { Role }
export { canAccess } from "@/lib/roles"

export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
  available?: number
  must_change_password?: number
  totp_enabled?: number
}

interface AuthState {
  user: AuthUser | null
  status: "loading" | "authed" | "anon"
  login: (email: string, password: string, code?: string) => Promise<AuthUser>
  logout: () => Promise<void>
  loadMe: () => Promise<void>
  setAvailable: (v: number) => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: getToken() ? "loading" : "anon",

  login: async (email, password, code) => {
    const res = await api<{ token?: string; user?: AuthUser; totp_required?: boolean }>("/auth/login", {
      method: "POST",
      body: { email, password, code },
      auth: false,
    })
    // Server accepted the password but needs a 2FA code (opt-in users only).
    if (res.totp_required || !res.token || !res.user) {
      throw new Error(res.totp_required ? "2FA code required" : "Login failed")
    }
    setToken(res.token)
    cacheUser(res.user)
    set({ user: res.user, status: "authed" })
    return res.user
  },

  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST" })
    } catch {
      /* ignore */
    }
    setToken(null)
    cacheUser(null)
    set({ user: null, status: "anon" })
  },

  loadMe: async () => {
    if (!getToken()) {
      set({ user: null, status: "anon" })
      return
    }
    try {
      const res = await api<{ user: AuthUser }>("/auth/me")
      cacheUser(res.user)
      set({ user: res.user, status: "authed" })
    } catch (e) {
      // ONLY a real 401 means "you are not signed in". This catch used to fire on ANY failure and
      // destroy the token — so an engineer who reopened the app in a basement was silently logged
      // out and could not log back in, because logging in needs the network they don't have. Their
      // queued work would then never sync. A dead spot must not end a session.
      if (e instanceof ApiError && e.status === 401) {
        setToken(null)
        cacheUser(null)
        set({ user: null, status: "anon" })
        return
      }
      // Couldn't reach the server. Keep the token and carry on with the last known user; every
      // request the app makes is still authorised server-side, so this grants nothing.
      const u = cachedUser()
      set(u ? { user: u, status: "authed" } : { user: null, status: "anon" })
    }
  },

  setAvailable: (v) => set((s) => (s.user ? { user: { ...s.user, available: v } } : s)),
}))
