export const OPERATIONAL_ROLES = ["STAFF", "ADMIN"]

export function isOperationalRole(role: string | null | undefined) {
  return typeof role === "string" && OPERATIONAL_ROLES.includes(role)
}

/**
 * True kalau akun ini hanya boleh melihat dan mengubah data gudangnya
 * sendiri.
 *
 * Sebelum arahan Manager (30 Sep 2026), Admin juga dikurung ke satu
 * gudang -- satu Admin per gudang. Sekarang satu Admin memeriksa-silang
 * SEMUA gudang, sama seperti Manager. Staff tetap satu gudang.
 */
export function isWarehouseScoped(role: string | null | undefined) {
  return role === "STAFF"
}
