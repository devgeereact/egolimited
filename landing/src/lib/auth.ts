// The public marketing site has no auth of its own — staff sign in through the
// app at /app. This stub keeps SiteNav/SiteFooter happy; "user" is
// always null so they show the public (logged-out) state.
export function useAuth(): { user: null } {
  return { user: null }
}
