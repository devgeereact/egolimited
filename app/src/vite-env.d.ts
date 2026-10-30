/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk publishable key (public). Unset = legacy own-login. See app/.env.example. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
}
