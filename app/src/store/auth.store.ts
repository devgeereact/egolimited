import { create } from "zustand"
import { api, setToken, getToken } from "@/lib/api"
import type { Role } from "@/lib/roles"

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
    set({ user: null, status: "anon" })
  },

  loadMe: async () => {
    if (!getToken()) {
      set({ user: null, status: "anon" })
      return
    }
    try {
      const res = await api<{ user: AuthUser }>("/auth/me")
      set({ user: res.user, status: "authed" })
    } catch {
      setToken(null)
      set({ user: null, status: "anon" })
    }
  },

  setAvailable: (v) => set((s) => (s.user ? { user: { ...s.user, available: v } } : s)),
}))
