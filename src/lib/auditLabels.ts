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

/*
 * Semua lencana aktivitas bernada abu yang sama.
 *
 * Sebelumnya tiap jenis aksi punya warnanya sendiri -- biru, hijau, ungu,
 * merah, oranye -- sehingga satu daftar aktivitas memuat lima warna
 * sekaligus. Warnanya tidak menandai apa pun yang perlu ditindak: seluruh
 * baris di sana adalah hal yang SUDAH terjadi, bukan tugas yang menunggu.
 * Yang tersisa cuma pelangi yang membuat mata melompat-lompat, sementara
 * kalimat di sebelahnya sudah menerangkan aksinya dengan jelas.
 *
 * Nada tetap disimpan sebagai konsep supaya pemanggilnya tidak berubah dan
 * pembedaan warna bisa dihidupkan lagi kalau memang dibutuhkan.
 */
const ABU = "bg-slate-50 text-slate-700 border-slate-100"
const TONE = {
  netral: ABU,
  masuk: ABU,
  selesai: ABU,
  uang: ABU,
  tolak: ABU,
  hapus: ABU,
  perhatian: ABU,
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
