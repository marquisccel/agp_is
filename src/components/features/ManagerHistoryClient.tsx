"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Calendar, Filter, Home, Search, Trash2, User } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import StatusPill from "@/components/ui/StatusPill"
import { getPurchaseStatus } from "@/lib/purchaseStatusLabels"
import { statusPembayaran } from "@/lib/paymentStatus"

interface PurchaseItem {
  id: string
  sku_name: string
  spec: string | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

interface Supplier { id: string; nama: string }
interface Warehouse { id: string; nama: string }
interface Staff { id: string; nama: string }

interface Purchase {
  id: string
  nomor_nota: string | null
  createdAt: string | Date
  status_approval: string
  status_pelunasan: string | null
  nominal_belum_lunas: number | null
  metode_pembayaran_terpilih: string | null
  total_nilai_setelah_retur: number | null
  total_nilai_sebelum_retur: number | null
  total_dibayar: number | null
  supplier: Supplier
  staff: Staff
  warehouse: Warehouse
  items: PurchaseItem[]
}

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

export default function ManagerHistoryClient({
  initialPurchases,
  warehouses,
}: {
  initialPurchases: Purchase[]
  warehouses: Warehouse[]
}) {
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()
  const { toast, host: toastHost } = useToast()
  const router = useRouter()

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Hapus transaksi ini?",
      description: "Data yang terhapus tidak dapat dikembalikan.",
      tone: "danger",
      confirmLabel: "Ya, hapus",
    })
    if (!ok) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/manager/purchases/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menghapus transaksi")
      }
      toast("Transaksi berhasil dihapus.")
      router.refresh()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus transaksi", "error")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPurchases = initialPurchases.filter((purchase) => {
    const query = search.toLowerCase()
    const matchesSearch =
      purchase.supplier.nama.toLowerCase().includes(query) ||
      (purchase.nomor_nota && purchase.nomor_nota.toLowerCase().includes(query)) ||
      purchase.id.toLowerCase().includes(query) ||
      purchase.staff.nama.toLowerCase().includes(query)

    const matchesStatus = selectedStatus === "all" || purchase.status_approval === selectedStatus
    const matchesWarehouse = selectedWarehouse === "all" || purchase.warehouse.id === selectedWarehouse

    return matchesSearch && matchesStatus && matchesWarehouse
  })


  return (
    <div className="space-y-6">
      {dialog}
      {toastHost}
      <div className="section section-body">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari supplier, no. nota, staff..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field-input field-icon"
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <ElegantSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              ariaLabel="Filter status transaksi"
              triggerClassName="field-icon"
              className="w-full"
              menuClassName="w-72"
              options={[
                { value: "all", label: "Semua Status" },
                { value: "menunggu_verifikasi", label: "Menunggu Verifikasi" },
                { value: "menunggu_approval_harga", label: "Menunggu Approval Harga" },
                { value: "approved", label: "Disetujui (Menunggu Transfer)" },
                { value: "sudah_transfer", label: "Sudah Transfer" },
                { value: "dibatalkan", label: "Dibatalkan" },
              ]}
            />
          </div>

          <div className="relative">
            <Home className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <ElegantSelect
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              ariaLabel="Filter gudang transaksi"
              triggerClassName="field-icon"
              className="w-full"
              menuClassName="w-56"
              options={[
                { value: "all", label: "Semua Gudang" },
                ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.nama })),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tabel-lembut text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th>Gudang / Tanggal</th>
                <th>Lapak / Supplier</th>
                <th>Barang</th>
                {/* Yang ditampilkan adalah total_dibayar -- nilai setelah
                    potongan kasbon, bukan nilai nota kotornya. Judul
                    "Total Nilai" membuatnya terbaca sebagai harga barang. */}
                <th>Nilai Dibayar</th>
                <th>Status</th>
                <th className="!text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const totalBerat = purchase.items.reduce((sum, item) => sum + (item.berat_final_item || 0), 0)
                  const totalNilai = purchase.total_dibayar ?? purchase.total_nilai_setelah_retur ?? purchase.total_nilai_sebelum_retur ?? 0
                  const status = getPurchaseStatus(purchase.status_approval)
                  // Status tahapan saja tidak cukup: nota bisa berstatus
                  // "Sudah Transfer" sementara sisa terminnya belum dilunasi,
                  // dan di daftar ini terbaca seolah sudah beres. Manager
                  // justru pihak yang paling perlu melihat sisa itu.
                  const bayar = statusPembayaran(purchase)

                  return (
                    <tr key={purchase.id} className="premium-row">
                      <td>
                        <div className="font-bold text-slate-950">{purchase.warehouse.nama}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{new Date(purchase.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}</span>
                        </div>
                      </td>
                      <td>
                        <div className="font-black text-slate-900">{purchase.supplier.nama}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>Staff: {purchase.staff.nama}</span>
                        </div>
                      </td>
                      <td>
                        <div className="font-bold text-slate-900">{totalBerat.toFixed(1)} KG</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-400">
                          {purchase.items.length} sku - {purchase.nomor_nota || `#${purchase.id.split("-")[0]}`}
                        </div>
                      </td>
                      <td className="font-mono font-black text-slate-950">
                        {formatRp(totalNilai)}
                      </td>
                      <td>
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusPill label={status.label} tone={status.tone} />
                          {bayar.sisa > 0 && (
                            <StatusPill label={bayar.label} tone={bayar.tone} />
                          )}
                        </div>
                      </td>
                      {/* Dulu kolom ini menumpuk sampai empat tombol selebar
                          kolom di SETIAP baris -- benda paling berat di
                          halaman, mengulang "Detail", "Edit", dan "Hapus"
                          sebanyak jumlah nota. Sekarang tersisa satu aksi
                          yang bergantung tahap, satu tautan ke detail, dan
                          hapus sebagai ikon. Tombol "Edit" dilepas karena
                          halaman Detail sudah membawanya, dan di sini ia
                          juga tampil untuk nota yang sudah ditransfer --
                          padahal nota seperti itu ditolak oleh API. */}
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {purchase.status_approval === "menunggu_approval_harga" ? (
                            <Link href={`/dashboard/manager/approval-harga/${purchase.id}`}>
                              <button
                                className="premium-button whitespace-nowrap rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-bold"
                                style={{ borderColor: "var(--warning-soft)", background: "var(--warning-soft)", color: "var(--warning)" }}
                              >
                                Approval Harga <ArrowRight className="inline h-3.5 w-3.5" />
                              </button>
                            </Link>
                          ) : purchase.status_approval === "approved" || purchase.status_approval === "sudah_transfer" ? (
                            <Link href={`/nota/${purchase.id}`} target="_blank">
                              <button className="premium-button btn-netral whitespace-nowrap px-3 py-1.5 text-xs">
                                Lihat Nota
                              </button>
                            </Link>
                          ) : null}

                          <Link href={`/dashboard/manager/purchases/${purchase.id}`}>
                            <button className="premium-button btn-netral px-3 py-1.5 text-xs">
                              Detail
                            </button>
                          </Link>

                          <button
                            onClick={() => handleDelete(purchase.id)}
                            disabled={deletingId === purchase.id}
                            className="premium-button btn-netral tone-danger min-w-[38px] justify-center p-2 disabled:opacity-50"
                            title="Hapus transaksi"
                            aria-label={`Hapus transaksi ${purchase.nomor_nota || purchase.id.split("-")[0]}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
