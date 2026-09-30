/**
 * Klasifikasi manual keaktifan pengiriman lapak (Tier 1/2/3).
 *
 * Terpisah dari transactionStatus (lib/supplierStatus.ts), yang otomatis
 * berpindah sendiri saat transaksi pertama disetujui. Tier murni penilaian
 * manual lewat form Tambah/Edit Lapak, tidak pernah diubah sistem.
 *
 * Satu sumber label supaya badge di Kinerja Lapak dan kolom di export CSV
 * Manager tidak diam-diam berbeda tulisan.
 */

export const TIER_VALUES = ["TIER_1", "TIER_2", "TIER_3"] as const
export type TierValue = (typeof TIER_VALUES)[number]

export const TIER_META: Record<TierValue, { label: string; deskripsi: string; warna: string }> = {
  TIER_1: { label: "Tier 1", deskripsi: "Sudah Rutin Kirim & Loyal", warna: "#22C55E" },
  TIER_2: { label: "Tier 2", deskripsi: "Potensi Rutin Kirim & Masih Bagi Barang", warna: "#EAB308" },
  TIER_3: { label: "Tier 3", deskripsi: "Cari Informasi dan Peluang untuk Kirim", warna: "#F97316" },
}

export function isTierValue(value: unknown): value is TierValue {
  return typeof value === "string" && (TIER_VALUES as readonly string[]).includes(value)
}

export function normalizeTier(value: unknown): TierValue | null {
  return isTierValue(value) ? value : null
}

/** Label siap tampil untuk CSV/teks polos; "-" kalau belum diklasifikasi. */
export function labelTier(value: string | null | undefined): string {
  return isTierValue(value) ? TIER_META[value].label : "-"
}
