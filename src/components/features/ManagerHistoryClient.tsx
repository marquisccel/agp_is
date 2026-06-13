"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Filter, Calendar, User, Tag, Home, ArrowRight } from "lucide-react"

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

interface Warehouse {
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
  warehouse: Warehouse
  items: PurchaseItem[]
}

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

export default function ManagerHistoryClient({ 
  initialPurchases, 
  warehouses 
}: { 
  initialPurchases: Purchase[]
  warehouses: Warehouse[] 
}) {
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Hati-hati! Apakah Anda yakin ingin menghapus transaksi ini? Data yang terhapus tidak dapat dikembalikan.")) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/manager/purchases/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus transaksi");
      }
      alert("Transaksi berhasil dihapus.");
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // Filter purchases
  const filteredPurchases = initialPurchases.filter(p => {
    const matchesSearch = 
      p.supplier.nama.toLowerCase().includes(search.toLowerCase()) ||
      (p.nomor_nota && p.nomor_nota.toLowerCase().includes(search.toLowerCase())) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.staff.nama.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = selectedStatus === "all" || p.status_approval === selectedStatus
    const matchesWarehouse = selectedWarehouse === "all" || p.warehouse.id === selectedWarehouse

    return matchesSearch && matchesStatus && matchesWarehouse
  })

  const statusMap: Record<string, { label: string, cls: string }> = {
    menunggu_verifikasi_supervisor: { label: "Menunggu Verifikasi Supervisor", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    menunggu_double_cek: { label: '🕐 Menunggu Cek', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    menunggu_approval_harga: { label: '📋 Menunggu Approve', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    approved: { label: '✓ Disetujui', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    sudah_transfer: { label: '💸 Sudah Transfer', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: '✗ Ditolak', cls: 'bg-red-50 text-red-700 border-red-200' },
    dibatalkan: { label: '⊘ Dibatalkan', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  }

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari supplier, no. nota, staff..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm transition-all text-slate-800"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm transition-all text-slate-700 appearance-none bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="menunggu_verifikasi_supervisor">Menunggu Verifikasi Supervisor</option>
            <option value="menunggu_double_cek">🕐 Menunggu Double Cek</option>
            <option value="menunggu_approval_harga">📋 Menunggu Approval Harga</option>
            <option value="approved">✓ Disetujui (Menunggu Transfer)</option>
            <option value="sudah_transfer">💸 Sudah Ditransfer</option>
            <option value="rejected">✗ Ditolak</option>
            <option value="dibatalkan">⊘ Dibatalkan</option>
          </select>
        </div>

        {/* Warehouse Filter */}
        <div className="relative">
          <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm transition-all text-slate-700 appearance-none bg-white"
          >
            <option value="all">Semua Gudang</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Gudang / Tanggal</th>
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
                filteredPurchases.map((p) => {
                  const totalBerat = p.items.reduce((s, i) => s + (i.berat_final_item || 0), 0)
                  const totalNilai = p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0
                  const s = statusMap[p.status_approval] ?? { label: p.status_approval, cls: 'bg-slate-50 text-slate-600 border-slate-200' }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Warehouse & Tanggal */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{p.warehouse.nama}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(p.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' })}</span>
                        </div>
                      </td>

                      {/* Supplier & Staff */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{p.supplier.nama}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Staff: {p.staff.nama}</span>
                        </div>
                      </td>

                      {/* Items & Weight */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{totalBerat.toFixed(1)} KG</div>
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">
                          {p.items.length} sku · {p.nomor_nota || `#${p.id.split("-")[0]}`}
                        </div>
                      </td>

                      {/* Total Nilai */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {formatRp(totalNilai)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {p.status_approval === "menunggu_approval_harga" ? (
                            <Link href={`/dashboard/manager/approval-harga/${p.id}`} className="w-full">
                              <button className="bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1 w-full">
                                Approval Harga <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          ) : p.status_approval === "approved" || p.status_approval === "sudah_transfer" ? (
                            <Link href={`/nota/${p.id}`} target="_blank" className="w-full">
                              <button className="bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all w-full">
                                Lihat Nota
                              </button>
                            </Link>
                          ) : null}

                          {/* Detail button */}
                          <Link href={`/dashboard/manager/purchases/${p.id}`} className="w-full">
                            <button className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1 w-full">
                              Detail Transaksi
                            </button>
                          </Link>

                          {/* Edit button */}
                          <Link href={`/dashboard/manager/edit/${p.id}`} className="w-full">
                            <button className="bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1 w-full">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Edit
                            </button>
                          </Link>
                          {/* Delete button */}
                          <button 
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1 mx-auto w-full disabled:opacity-50"
                          >
                            {deletingId === p.id ? "Menghapus..." : "Hapus"}
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
