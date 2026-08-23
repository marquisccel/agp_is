/**
 * Sumber tunggal label human-readable untuk aksi audit log (Fase 7 - Audit
 * trail page). Sebelumnya definisi ini hanya ada di dalam
 * manager/export/route.ts -- begitu halaman audit trail dedicated dibuat,
 * label akan gampang tidak sinkron lagi kalau didefinisikan dua kali
 * terpisah (persis pola bug D-6).
 *
 * Feed aktivitas di dashboard Manager dulu punya peta sendiri yang hanya
 * memuat 9 aksi, sehingga sisanya jatuh ke fallback dan tampil sebagai nama
 * mentah seperti "Delete Supplier" dengan keterangan seragam "memperbarui
 * data operasional" -- membingungkan justru buat yang membacanya. Sekarang
 * feed itu ikut memakai definisi di file ini.
 */

export type AuditActionInfo = {
  /** Judul singkat untuk chip aktivitas. */
  label: string
  /** Pelengkap kalimat: "<nama pengguna> {description}." */
  description: string
  /** Kelas warna chip; dipisah per jenis dampak, bukan per fitur. */
  tone: string
}

const TONE = {
  netral: "bg-slate-50 text-slate-700 border-slate-100",
  masuk: "bg-sky-50 text-sky-700 border-sky-100",
  selesai: "bg-emerald-50 text-emerald-700 border-emerald-100",
  uang: "bg-violet-50 text-violet-700 border-violet-100",
  tolak: "bg-rose-50 text-rose-700 border-rose-100",
  hapus: "bg-rose-50 text-rose-700 border-rose-100",
  perhatian: "bg-orange-50 text-orange-700 border-orange-100",
} as const

export const AUDIT_ACTIONS: Record<string, AuditActionInfo> = {
  // ── Alur transaksi ────────────────────────────────────────────
  CREATE_DRAFT: {
    label: "Draft transaksi dibuat",
    description: "membuat draft transaksi pembelian baru",
    tone: TONE.masuk,
  },
  EDIT_PURCHASE: {
    label: "Transaksi diperbarui",
    description: "mengubah data transaksi pembelian",
    tone: TONE.netral,
  },
  ADMIN_DOUBLE_CHECK: {
    label: "Verifikasi gudang selesai",
    description: "menyelesaikan verifikasi timbangan gudang",
    tone: TONE.selesai,
  },
  MANAGER_APPROVE_PRICE: {
    label: "Harga disetujui",
    description: "menyetujui harga pembelian yang melebihi standar",
    tone: TONE.selesai,
  },
  MANAGER_REJECT_PRICE: {
    label: "Harga ditolak",
    description: "menolak harga pembelian sehingga transaksi dibatalkan",
    tone: TONE.tolak,
  },
  UPLOAD_TRANSFER_PROOF: {
    label: "Bukti transfer diunggah",
    description: "mengunggah bukti transfer pembayaran ke lapak",
    tone: TONE.masuk,
  },
  REPLACE_TRANSFER_PROOF: {
    label: "Bukti transfer diganti",
    description: "mengganti bukti transfer yang sudah diunggah sebelumnya",
    tone: TONE.perhatian,
  },
  SETTLE_TERMIN: {
    label: "Sisa termin dilunasi",
    description: "melunasi sisa pembayaran termin dan mengunggah notanya",
    tone: TONE.selesai,
  },
  REOPEN_PELUNASAN: {
    label: "Nota dibuka kembali",
    description: "membatalkan status lunas karena pembayarannya ternyata kurang",
    tone: TONE.perhatian,
  },
  SETTLE_TERMIN_PARTIAL: {
    label: "Pembayaran sebagian dicatat",
    description: "mencatat pembayaran sebagian atas sisa nota; masih ada kekurangan",
    tone: TONE.perhatian,
  },
  DELETE_PURCHASE: {
    label: "Transaksi dihapus",
    description: "menghapus transaksi pembelian secara permanen",
    tone: TONE.hapus,
  },

  // ── Kasbon / uang muka ────────────────────────────────────────
  REQUEST_DP: {
    label: "Kasbon diajukan",
    description: "mengajukan uang muka (kasbon) untuk lapak",
    tone: TONE.uang,
  },
  APPROVE_DP: {
    label: "Kasbon disetujui",
    description: "menyetujui pengajuan kasbon lapak",
    tone: TONE.uang,
  },
  REJECT_DP: {
    label: "Kasbon ditolak",
    description: "menolak pengajuan kasbon lapak",
    tone: TONE.tolak,
  },
  FORWARD_DP: {
    label: "Kasbon diteruskan",
    description: "meneruskan pengajuan kasbon ke Manager",
    tone: TONE.perhatian,
  },
  REFUND_DP: {
    label: "Sisa kasbon dikembalikan",
    description: "mengembalikan kelebihan kasbon ke saldo lapak karena nilai nota lebih kecil dari kasbon yang dialokasikan",
    tone: TONE.uang,
  },

  // ── Data lapak ────────────────────────────────────────────────
  CREATE_SUPPLIER: {
    label: "Lapak ditambahkan",
    description: "menambahkan data lapak baru",
    tone: TONE.masuk,
  },
  DELETE_SUPPLIER: {
    label: "Lapak dihapus",
    description: "menghapus data lapak",
    tone: TONE.hapus,
  },
  SUPPLIER_STATUS_AUTO_GREEN: {
    label: "Status lapak jadi hijau",
    description: "memicu perubahan status lapak menjadi hijau lewat transaksi",
    tone: TONE.selesai,
  },
  SUPPLIER_STATUS_MANUAL_UPDATE: {
    label: "Status lapak diubah",
    description: "mengubah status lapak secara manual",
    tone: TONE.perhatian,
  },
  SUPPLIER_COORDINATES_BULK_IMPORT: {
    label: "Koordinat lapak diimpor",
    description: "mengimpor koordinat lapak secara massal dari CSV",
    tone: TONE.netral,
  },

  // ── Master data & akun ────────────────────────────────────────
  CREATE_SKU_PRICE_STANDARD: {
    label: "Harga standar SKU dibuat",
    description: "menetapkan batas harga standar untuk sebuah SKU",
    tone: TONE.netral,
  },
  UPDATE_SKU_PRICE_STANDARD: {
    label: "Harga standar SKU diubah",
    description: "mengubah batas harga standar sebuah SKU",
    tone: TONE.netral,
  },
  CREATE_WAREHOUSE_TARGET: {
    label: "Target gudang dibuat",
    description: "menetapkan target tonase untuk gudang",
    tone: TONE.netral,
  },
  UPDATE_WAREHOUSE_TARGET: {
    label: "Target gudang diubah",
    description: "mengubah target tonase gudang",
    tone: TONE.netral,
  },
  CREATE_USER: {
    label: "Akun baru didaftarkan",
    description: "mendaftarkan akun pengguna baru",
    tone: TONE.masuk,
  },
  UPDATE_USER_SETTINGS: {
    label: "Pengaturan akun diubah",
    description: "memperbarui profil atau kata sandi akunnya sendiri",
    tone: TONE.netral,
  },
}

/** Fallback dipakai kalau ada aksi baru yang belum sempat didaftarkan. */
function fallback(action: string): AuditActionInfo {
  const terbaca = action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
  return {
    label: terbaca || "Aktivitas sistem",
    description: `melakukan aksi ${terbaca.toLowerCase()}`,
    tone: TONE.netral,
  }
}

export function getAuditAction(action: string): AuditActionInfo {
  return AUDIT_ACTIONS[action] ?? fallback(action)
}

/** Label saja -- dipakai halaman Audit Trail dan export CSV. */
export const AUDIT_ACTION_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(AUDIT_ACTIONS).map(([key, info]) => [key, info.label])
)

export function formatAuditAction(action: string): string {
  return getAuditAction(action).label
}
