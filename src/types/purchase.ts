/**
 * Bentuk Purchase setelah diserialisasi untuk client component (Date -> ISO
 * string), dipakai oleh halaman nota dan komponen render (Fase 7 - domain
 * types bersama). Bukan cakupan penuh seluruh 82 warning no-explicit-any --
 * hanya jalur nota yang sudah diadopsi; jalur form interaktif kompleks
 * (double-check, edit transaksi item-level) belum disentuh karena butuh
 * verifikasi visual yang tidak bisa dilakukan pada sesi ini (Docker tidak
 * tersedia untuk menjalankan Postgres lokal).
 */

export type PurchaseItemDTO = {
  id: string
  sku_name: string
  spec: string | null
  berat_lapak: number | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

export type ReturItemDTO = {
  id: string
  sku_name: string
  berat_retur: number
  potongan_nilai: number
  alasan: string | null
}

export type PurchaseSupplierDTO = {
  id: string
  nama: string
  kontak_wa: string | null
}

export type PurchaseWarehouseDTO = {
  id: string
  nama: string
}

export type PurchaseDTO = {
  id: string
  nomor_nota: string | null
  tanggal: string
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  tanggal_transfer: string | null
  metode_pembayaran_terpilih: string | null
  status_approval: string
  status_pelunasan: string | null
  total_nilai_sebelum_retur: number | null
  total_potongan_retur: number | null
  total_nilai_setelah_retur: number | null
  potongan_sampah: number | null
  berat_potongan_sampah: number | null
  harga_potongan_sampah: number | null
  potongan_susut: number | null
  berat_potongan_susut: number | null
  harga_potongan_susut: number | null
  potongan_air: number | null
  berat_potongan_air: number | null
  harga_potongan_air: number | null
  potongan_karung: number | null
  berat_potongan_karung: number | null
  harga_potongan_karung: number | null
  dp_yang_digunakan: number | null
  total_dibayar: number | null
  persentase_pembayaran: number | null
  nominal_pembayaran_awal: number | null
  nominal_belum_lunas: number | null
  items: PurchaseItemDTO[]
  returs: ReturItemDTO[]
  supplier: PurchaseSupplierDTO
  warehouse: PurchaseWarehouseDTO
}
