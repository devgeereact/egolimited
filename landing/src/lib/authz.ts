// EGO v2 — authorisation contract (mirrors the server guards in api/_bootstrap.php).
// Two roles only (docs/spec §3): admin = full access; engineer = own jobs only.
// The server is the source of truth; these pure functions let the UI gate the
// same way and are unit-tested so the contract can't silently drift.

export type Role = "admin" | "engineer"

export function isAdmin(role: Role): boolean {
  return role === "admin"
}

// Admin-only areas (staff management, settings, all customers/invoices).
export function canManageUsers(role: Role): boolean {
  return role === "admin"
}

// Ownership: an engineer may only see/act on a job assigned to them. Admin bypasses.
// Mirrors engineer_owns_job() on the server.
export function canAccessJob(
  role: Role,
  userId: number,
  jobEngineerId: number | null,
): boolean {
  if (role === "admin") return true
  return jobEngineerId != null && jobEngineerId === userId
}

// Where a freshly-authenticated role should land.
export function roleHome(role: Role): string {
  return role === "admin" ? "/admin" : "/app"
}
