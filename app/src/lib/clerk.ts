/**
 * Clerk bridge for non-React code (lib/api.ts, the auth store).
 *
 * Sign-in is Clerk (email code). Clerk's session token is short-lived, so it is fetched fresh for
 * each request via the getter registered by <ClerkBridge/> in main.tsx. When VITE_CLERK_PUBLISHABLE_KEY
 * is not set the app keeps the legacy own-login flow, so a build without the key still works.
 *
 * Roles never come from Clerk: the PHP API verifies the token and returns the staff record
 * (GET /auth/me), exactly as before.
 */
export const CLERK_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) || ""
export const clerkEnabled = CLERK_KEY !== ""

interface ClerkState {
  loaded: boolean
  signedIn: boolean
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

let state: ClerkState = { loaded: false, signedIn: false, getToken: async () => null, signOut: async () => {} }
let waiters: Array<() => void> = []

export function setClerkState(next: ClerkState): void {
  state = next
  if (next.loaded) {
    const w = waiters
    waiters = []
    w.forEach((f) => f())
  }
}

/** Wait for Clerk to finish loading, but never longer than `ms` (offline: clerk-js cannot load). */
function whenLoaded(ms: number): Promise<void> {
  if (state.loaded) return Promise.resolve()
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    waiters.push(() => { clearTimeout(t); resolve() })
  })
}

export type ClerkTokenResult =
  | { kind: "token"; token: string }
  | { kind: "signed-out" }          // Clerk loaded and nobody is signed in
  | { kind: "unavailable" }         // Clerk did not load, or no token could be fetched (offline)

export async function clerkToken(waitMs = 4000): Promise<ClerkTokenResult> {
  await whenLoaded(waitMs)
  if (!state.loaded) return { kind: "unavailable" }
  if (!state.signedIn) return { kind: "signed-out" }
  try {
    const token = await state.getToken()
    return token ? { kind: "token", token } : { kind: "unavailable" }
  } catch {
    return { kind: "unavailable" }
  }
}

export const clerkSignOut = (): Promise<void> => state.signOut()
