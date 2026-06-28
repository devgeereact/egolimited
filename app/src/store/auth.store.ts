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
}

interface AuthState {
  user: AuthUser | null
  status: "loading" | "authed" | "anon"
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  loadMe: () => Promise<void>
  setAvailable: (v: number) => void
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: getToken() ? "loading" : "anon",

  login: async (email, password) => {
    const res = await api<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    })
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
