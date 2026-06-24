export const PENDING_VERIFICATION_STATUSES = [
  "menunggu_verifikasi",
]

export const ACTIVE_PURCHASE_STATUSES = [
  ...PENDING_VERIFICATION_STATUSES,
  "menunggu_approval_harga",
  "approved",
  "sudah_transfer",
]
