/** EGO LIMITED roles + the pure client-side guard (the SERVER still enforces every
 * request — this is UX only). Hierarchy: Founder > Manager > Office (Employee Admin) > Engineer.
 * Customers have no login (tokenised job link). */
export type Role = "founder" | "manager" | "office" | "engineer"

export const ROLE_RANK: Record<Role, number> = { engineer: 1, office: 2, manager: 3, founder: 4 }
export const ROLE_LABEL: Record<Role, string> = {
  founder: "Founder", manager: "Manager", office: "Employee Admin", engineer: "Engineer",
}

export function rank(role?: Role | null): number { return role ? ROLE_RANK[role] ?? 0 : 0 }

/** Does `role` meet the minimum rank `min`? */
export function atLeast(role: Role | null | undefined, min: Role): boolean {
  return rank(role) >= ROLE_RANK[min]
}

/** Office-class = any non-engineer staff (founder / manager / office). The old "admin". */
export function isOffice(role?: Role | null): boolean {
  return rank(role) >= ROLE_RANK.office
}

/**
 * Route guard. Engineer routes are engineer-exact (the mobile field app);
 * every other tier is a minimum-rank check.
 */
export function canAccess(role: Role | null | undefined, required: Role): boolean {
  return required === "engineer" ? role === "engineer" : atLeast(role, required)
}
