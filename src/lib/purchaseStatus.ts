export const PENDING_SUPERVISOR_STATUSES = [
  "menunggu_verifikasi_supervisor",
  "menunggu_double_cek",
]

export const ACTIVE_PURCHASE_STATUSES = [
  ...PENDING_SUPERVISOR_STATUSES,
  "menunggu_approval_harga",
  "approved",
  "sudah_transfer",
]
