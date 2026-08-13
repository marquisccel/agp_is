export type StatusTone = "success" | "warning" | "info" | "neutral" | "danger"

/**
 * Sumber tunggal label + tone status transaksi (Purchase.status_approval).
 *
 * Sebelumnya `statusMap` didefinisikan lokal & independen di 5 file
 * (staff/history, AdminHistoryClient, ManagerHistoryClient,
 * ManagerPurchaseDetailClient, ManagerSupplierDetailsClient) dan sudah
 * drift: "menunggu_verifikasi" berwarna emerald di 4 file tapi amber di
 * ManagerSupplierDetailsClient -- status yang sama, warna beda tergantung
 * halaman mana yang dibuka. Pola yang sama dengan drift label audit log
 * (lihat auditLabels.ts) sebelumnya.
 *
 * Tone semantik disesuaikan sekalian: "menunggu_*" jadi warning (kuning),
 * bukan emerald -- emerald/hijau seharusnya berarti "selesai/baik", bukan
 * "masih menunggu", supaya warna benar-benar membantu scan cepat.
 */
export const PURCHASE_STATUS_LABELS: Record<string, { label: string; tone: StatusTone }> = {
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "warning" },
  menunggu_approval_harga: { label: "Menunggu Approval Harga", tone: "warning" },
  approved: { label: "Disetujui", tone: "info" },
  sudah_transfer: { label: "Sudah Transfer", tone: "success" },
  dibatalkan: { label: "Dibatalkan", tone: "neutral" },
}

export const PURCHASE_STATUS_DESCRIPTIONS: Record<string, string> = {
  menunggu_verifikasi: "Menunggu verifikasi dan double check penerimaan barang dari Admin gudang.",
  menunggu_approval_harga: "Menunggu persetujuan harga dari Manager.",
  approved: "Harga disetujui, menunggu transfer pembayaran ke supplier.",
  sudah_transfer: "Pembayaran sudah ditransfer. Transaksi selesai.",
  dibatalkan: "Transaksi dibatalkan karena harga ditolak Manager.",
}

export function getPurchaseStatus(status: string): { label: string; tone: StatusTone } {
  return PURCHASE_STATUS_LABELS[status] ?? { label: status, tone: "neutral" }
}

export const DP_STATUS_LABELS: Record<string, { label: string; tone: StatusTone }> = {
  menunggu_approval_admin: { label: "Menunggu Admin", tone: "warning" },
  menunggu_approval_manager: { label: "Menunggu Manager", tone: "warning" },
  approved: { label: "Disetujui", tone: "success" },
  rejected: { label: "Ditolak", tone: "danger" },
}

export function getDpStatus(status: string): { label: string; tone: StatusTone } {
  return DP_STATUS_LABELS[status] ?? { label: status, tone: "neutral" }
}
