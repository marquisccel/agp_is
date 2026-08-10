/**
 * Sumber tunggal label human-readable untuk aksi audit log (Fase 7 - Audit
 * trail page). Sebelumnya definisi ini hanya ada di dalam
 * manager/export/route.ts -- begitu halaman audit trail dedicated dibuat,
 * label akan gampang tidak sinkron lagi kalau didefinisikan dua kali
 * terpisah (persis pola bug D-6).
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE_DRAFT: "Draft transaksi dibuat",
  EDIT_PURCHASE: "Transaksi diperbarui",
  ADMIN_DOUBLE_CHECK: "Verifikasi gudang selesai",
  MANAGER_APPROVE_PRICE: "Harga disetujui manager",
  MANAGER_REJECT_PRICE: "Harga ditolak manager",
  UPLOAD_TRANSFER_PROOF: "Bukti transfer diunggah",
  REPLACE_TRANSFER_PROOF: "Bukti transfer diganti",
  SETTLE_TERMIN: "Termin ditandai lunas",
  REQUEST_DP: "Pengajuan kasbon dibuat",
  APPROVE_DP: "Kasbon disetujui",
  REJECT_DP: "Kasbon ditolak",
  FORWARD_DP: "Kasbon diteruskan ke manager",
  SUPPLIER_STATUS_AUTO_GREEN: "Status supplier otomatis menjadi GREEN",
  SUPPLIER_STATUS_MANUAL_UPDATE: "Status supplier diubah manual",
  UPDATE_SKU_PRICE_STANDARD: "Standar harga SKU diperbarui",
  CREATE_SKU_PRICE_STANDARD: "Standar harga SKU ditambahkan",
  UPDATE_USER_SETTINGS: "Pengaturan akun diperbarui",
  DELETE_PURCHASE: "Transaksi dihapus permanen",
  DELETE_SUPPLIER: "Data lapak dihapus",
  CREATE_SUPPLIER: "Data lapak ditambahkan",
  CREATE_WAREHOUSE_TARGET: "Target gudang ditambahkan",
  UPDATE_WAREHOUSE_TARGET: "Target gudang diperbarui",
  SUPPLIER_COORDINATES_BULK_IMPORT: "Koordinat lapak diimpor massal (CSV)",
}

export function formatAuditAction(action: string): string {
  return (
    AUDIT_ACTION_LABELS[action] ||
    action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
  )
}
