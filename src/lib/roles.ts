export const OPERATIONAL_ROLES = ["STAFF", "ADMIN"]

export function isOperationalRole(role: string | null | undefined) {
  return typeof role === "string" && OPERATIONAL_ROLES.includes(role)
}
