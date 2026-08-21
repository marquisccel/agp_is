/**
 * Daftar SKU PET -- SATU sumber kebenaran.
 *
 * Sebelumnya daftar ini ditulis dua kali (form Input Pembelian dan halaman
 * Harga Standar SKU) dan sudah sempat berbeda isinya: "Karung" ada di form
 * pembelian tapi tidak ada di halaman harga standar, sehingga Manager tidak
 * bisa menetapkan batas harga untuk Karung dan kontrol harga tidak pernah
 * aktif untuk SKU itu.
 *
 * FM = Full Mineral (varian permintaan Manager, hasil meeting).
 */
export const SKU_LIST = [
  "Bening FM",
  "BM FM",
  "Mix FM",
  "Bening",
  "BM",
  "Mix",
  "Karung",
  "Warna",
  "Tutup HD",
  "Kotor",
  "Grade B",
  "Bocil",
  "Grade C",
  "Saos Kecap",
  "Galon",
  "PK",
] as const

export type SkuName = (typeof SKU_LIST)[number]

/** Opsi siap pakai untuk ElegantSelect pada form pembelian. */
export const SKU_OPTIONS = [
  { value: "", label: "Pilih SKU" },
  ...SKU_LIST.map(sku => ({ value: sku, label: sku })),
]
