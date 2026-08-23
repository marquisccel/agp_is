"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Filter, Search, Tag, User } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import StatusPill from "@/components/ui/StatusPill"
import { getPurchaseStatus } from "@/lib/purchaseStatusLabels"

interface PurchaseItem {
  id: string
  sku_name: string
  spec: string | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

interface Supplier {
  id: string
  nama: string
}

interface Staff {
  id: string
  nama: string
}

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
  items: PurchaseItem[]
}

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

export default function AdminHistoryClient({
  initialPurchases,
  basePath = "/dashboard/admin",
}: {
  initialPurchases: Purchase[]
  basePath?: string
}) {
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedSupplier, setSelectedSupplier] = useState("all")

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "menunggu_verifikasi", label: "Menunggu Verifikasi" },
    { value: "menunggu_approval_harga", label: "Menunggu Approval Harga" },
    { value: "approved", label: "Disetujui (Menunggu Transfer)" },
    { value: "sudah_transfer", label: "Sudah Transfer" },
    { value: "dibatalkan", label: "Dibatalkan" },
  ]

  const suppliers = Array.from(new Set(initialPurchases.map((p) => p.supplier.id)))
    .map((id) => initialPurchases.find((p) => p.supplier.id === id)?.supplier)
    .filter(Boolean) as Supplier[]

  const supplierOptions = [
    { value: "all", label: "Semua Lapak" },
    ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.nama })),
  ]

  const filteredPurchases = initialPurchases.filter((purchase) => {
    const query = search.toLowerCase()
    const matchesSearch =
      purchase.supplier.nama.toLowerCase().includes(query) ||
      (purchase.nomor_nota && purchase.nomor_nota.toLowerCase().includes(query)) ||
      purchase.id.toLowerCase().includes(query) ||
      purchase.staff.nama.toLowerCase().includes(query)

    const matchesStatus = selectedStatus === "all" || purchase.status_approval === selectedStatus
    const matchesSupplier = selectedSupplier === "all" || purchase.supplier.id === selectedSupplier

    return matchesSearch && matchesStatus && matchesSupplier
  })


  return (
    <div className="space-y-6">
      <div className="interactive-surface bg-white rounded-lg p-5 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari supplier, no. nota, staff..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 text-sm transition-all text-slate-800"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <div className="pl-8">
            <ElegantSelect
              value={selectedStatus}
              options={statusOptions}
              onChange={setSelectedStatus}
              ariaLabel="Filter status transaksi"
              className="w-full"
            />
          </div>
        </div>

        <div className="relative">
          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <div className="pl-8">
            <ElegantSelect
              value={selectedSupplier}
              options={supplierOptions}
              onChange={setSelectedSupplier}
              ariaLabel="Filter supplier transaksi"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="interactive-surface bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Tanggal / No. Nota</th>
                <th className="px-6 py-4">Lapak / Supplier</th>
                <th className="px-6 py-4">Barang (Total Berat)</th>
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
                  const status = getPurchaseStatus(purchase.status_approval)

                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {new Date(purchase.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">
                          {purchase.nomor_nota || `#${purchase.id.split("-")[0]}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{purchase.supplier.nama}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Staff: {purchase.staff.nama}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{totalBerat.toFixed(1)} KG</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {purchase.items.length} jenis item ({purchase.items.map((item) => item.sku_name).slice(0, 2).join(", ")}{purchase.items.length > 2 ? "..." : ""})
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {formatRp(totalNilai)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill label={status.label} tone={status.tone} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {purchase.status_approval === "menunggu_verifikasi" ? (
                            <Link href={`${basePath}/check/${purchase.id}`}>
                              <button className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1">
                                Cek <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          ) : purchase.status_approval === "approved" || purchase.status_approval === "sudah_transfer" ? (
                            <Link href={`/nota/${purchase.id}`} target="_blank">
                              <button className="bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all">
                                Nota
                              </button>
                            </Link>
                          ) : null}

                          {/* Nota yang sudah ditransfer ditolak oleh API saat
                              disimpan, jadi tautan ini dulu selalu berakhir
                              di form yang tidak bisa dituntaskan. */}
                          {purchase.status_approval !== "sudah_transfer" && (
                            <Link href={`${basePath}/edit/${purchase.id}`}>
                              <button className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1">
                                Edit
                              </button>
                            </Link>
                          )}
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
