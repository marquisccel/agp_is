"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, Filter, Home, Search, User } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"

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

  const handleDelete = async (id: string) => {
    if (!confirm("Hati-hati! Apakah Anda yakin ingin menghapus transaksi ini? Data yang terhapus tidak dapat dikembalikan.")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/manager/purchases/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menghapus transaksi")
      }
      alert("Transaksi berhasil dihapus.")
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
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

  const statusMap: Record<string, { label: string; cls: string }> = {
    menunggu_verifikasi_supervisor: { label: "Menunggu Verifikasi Supervisor", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    menunggu_double_cek: { label: "Menunggu Cek", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    menunggu_approval_harga: { label: "Menunggu Approval Harga", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    approved: { label: "Disetujui", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    sudah_transfer: { label: "Sudah Transfer", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-200" },
    dibatalkan: { label: "Dibatalkan", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  }

  return (
    <div className="space-y-6">
      <div className="interactive-surface border border-slate-200/80 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari supplier, no. nota, staff..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <ElegantSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              ariaLabel="Filter status transaksi"
              className="w-full pl-8"
              menuClassName="w-72"
              options={[
                { value: "all", label: "Semua Status" },
                { value: "menunggu_verifikasi_supervisor", label: "Menunggu Verifikasi Supervisor" },
                { value: "menunggu_double_cek", label: "Menunggu Double Cek" },
                { value: "menunggu_approval_harga", label: "Menunggu Approval Harga" },
                { value: "approved", label: "Disetujui (Menunggu Transfer)" },
                { value: "sudah_transfer", label: "Sudah Transfer" },
                { value: "rejected", label: "Ditolak" },
                { value: "dibatalkan", label: "Dibatalkan" },
              ]}
            />
          </div>

          <div className="relative">
            <Home className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <ElegantSelect
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              ariaLabel="Filter gudang transaksi"
              className="w-full pl-8"
              menuClassName="w-56"
              options={[
                { value: "all", label: "Semua Gudang" },
                ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.nama })),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="interactive-surface overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200/70 bg-white/55 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Gudang / Tanggal</th>
                <th className="px-6 py-4">Lapak / Supplier</th>
                <th className="px-6 py-4">Barang</th>
                <th className="px-6 py-4">Total Nilai</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const totalBerat = purchase.items.reduce((sum, item) => sum + (item.berat_final_item || 0), 0)
                  const totalNilai = purchase.total_dibayar ?? purchase.total_nilai_setelah_retur ?? purchase.total_nilai_sebelum_retur ?? 0
                  const status = statusMap[purchase.status_approval] ?? { label: purchase.status_approval, cls: "bg-slate-50 text-slate-600 border-slate-200" }

                  return (
                    <tr key={purchase.id} className="premium-row">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-950">{purchase.warehouse.nama}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{new Date(purchase.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900">{purchase.supplier.nama}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>Staff: {purchase.staff.nama}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{totalBerat.toFixed(1)} KG</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-400">
                          {purchase.items.length} sku - {purchase.nomor_nota || `#${purchase.id.split("-")[0]}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-slate-950">
                        {formatRp(totalNilai)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-black ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {purchase.status_approval === "menunggu_approval_harga" ? (
                            <Link href={`/dashboard/manager/approval-harga/${purchase.id}`} className="w-full">
                              <button className="premium-button w-full rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100">
                                Approval Harga <ArrowRight className="inline h-3.5 w-3.5" />
                              </button>
                            </Link>
                          ) : purchase.status_approval === "approved" || purchase.status_approval === "sudah_transfer" ? (
                            <Link href={`/nota/${purchase.id}`} target="_blank" className="w-full">
                              <button className="premium-button w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                Lihat Nota
                              </button>
                            </Link>
                          ) : null}

                          <Link href={`/dashboard/manager/purchases/${purchase.id}`} className="w-full">
                            <button className="premium-button w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                              Detail
                            </button>
                          </Link>

                          <Link href={`/dashboard/manager/edit/${purchase.id}`} className="w-full">
                            <button className="premium-button w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                              Edit
                            </button>
                          </Link>

                          <button
                            onClick={() => handleDelete(purchase.id)}
                            disabled={deletingId === purchase.id}
                            className="premium-button w-full rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === purchase.id ? "Menghapus..." : "Hapus"}
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
