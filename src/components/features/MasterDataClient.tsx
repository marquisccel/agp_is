"use client"

import { useState } from "react"

// ── Types ──
interface Warehouse { id: string; nama: string; lokasi: string }
interface SupplierStat {
  id: string; nama: string; kontak_wa: string | null
  target_bulanan_kg: number; warehouseId: string | null
  warehouse: { id: string; nama: string } | null
  totalTransaksi: number; totalSelesai: number
  totalNilai: number; totalKg: number; lastPurchase: string | null
}
interface UserData {
  id: string; nama: string; email: string; role: string
  warehouseId: string | null
  warehouse: { id: string; nama: string } | null
}
interface SkuPrice {
  id: string; sku_name: string; max_price_per_kg: number
  warehouse: { id: string; nama: string }
}
interface GlobalStats {
  totalPurchases: number; totalCompleted: number
  totalNilai: number; totalKg: number
  totalSuppliers: number; totalWarehouses: number
}

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}
function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(2)} ton`
  return `${n.toFixed(1)} KG`
}
function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
}

// ── Tab Types ──
type Tab = "overview" | "lapak" | "pengguna" | "harga-sku"

export default function MasterDataClient({
  warehouses, suppliers, users, skuPrices, globalStats
}: {
  warehouses: Warehouse[]
  suppliers: SupplierStat[]
  users: UserData[]
  skuPrices: SkuPrice[]
  globalStats: GlobalStats
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [searchLapak, setSearchLapak] = useState("")
  const [filterWarehouse, setFilterWarehouse] = useState("all")
  const [searchUser, setSearchUser] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterSkuWarehouse, setFilterSkuWarehouse] = useState("all")

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Ringkasan", icon: "📊" },
    { id: "lapak", label: "Daftar Lapak", icon: "🏪" },
    { id: "pengguna", label: "Pengguna", icon: "👥" },
    { id: "harga-sku", label: "Harga SKU", icon: "💰" },
  ]

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(searchLapak.toLowerCase()) ||
      (s.kontak_wa || "").includes(searchLapak)
    const matchWarehouse = filterWarehouse === "all" || s.warehouseId === filterWarehouse
    return matchSearch && matchWarehouse
  }).sort((a, b) => b.totalKg - a.totalKg)

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = u.nama.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
    const matchRole = filterRole === "all" || u.role === filterRole
    return matchSearch && matchRole
  })

  // Filtered SKU prices
  const filteredSkuPrices = skuPrices.filter(s =>
    filterSkuWarehouse === "all" || s.warehouse.id === filterSkuWarehouse
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Master Data</h2>
        <p className="text-slate-500 text-sm mt-1">
          Ringkasan data transaksi, lapak, pengguna, dan harga SKU di seluruh Collection Center.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Global Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon="📦" label="Total Transaksi" color="cyan"
              value={globalStats.totalPurchases.toLocaleString("id-ID")}
              sub={`${globalStats.totalCompleted} selesai ditransfer`}
            />
            <StatCard
              icon="⚖️" label="Total Tonase (Selesai)" color="violet"
              value={fmtKg(globalStats.totalKg)}
              sub="Semua gudang"
            />
            <StatCard
              icon="💵" label="Total Nilai Transaksi" color="emerald"
              value={fmtRp(globalStats.totalNilai)}
              sub="Approved & sudah transfer"
            />
            <StatCard
              icon="🏪" label="Jumlah Lapak/Supplier" color="amber"
              value={globalStats.totalSuppliers.toLocaleString("id-ID")}
              sub="Aktif terdaftar"
            />
            <StatCard
              icon="🏭" label="Collection Center" color="blue"
              value={globalStats.totalWarehouses.toLocaleString("id-ID")}
              sub="Gudang aktif"
            />
            <StatCard
              icon="✅" label="Tingkat Penyelesaian" color="green"
              value={globalStats.totalPurchases > 0
                ? `${((globalStats.totalCompleted / globalStats.totalPurchases) * 100).toFixed(0)}%`
                : "0%"}
              sub="Transaksi selesai transfer"
            />
          </div>

          {/* Per-Warehouse Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4">Performa per Collection Center</h3>
            <div className="space-y-3">
              {warehouses.map(w => {
                const wSuppliers = suppliers.filter(s => s.warehouseId === w.id)
                const wKg = wSuppliers.reduce((sum, s) => sum + s.totalKg, 0)
                const wNilai = wSuppliers.reduce((sum, s) => sum + s.totalNilai, 0)
                const wTrx = wSuppliers.reduce((sum, s) => sum + s.totalSelesai, 0)
                const maxKg = Math.max(...warehouses.map(ww =>
                  suppliers.filter(s => s.warehouseId === ww.id).reduce((sum, s) => sum + s.totalKg, 0)
                ), 1)

                return (
                  <div key={w.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {w.nama.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-slate-800 text-sm">{w.nama}</span>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>🏪 {wSuppliers.length} lapak</span>
                          <span>📦 {wTrx} trx</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                          style={{ width: `${Math.min((wKg / maxKg) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>⚖️ {fmtKg(wKg)}</span>
                        <span>💵 {fmtRp(wNilai)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top 5 Lapak */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4">Top 5 Lapak by Tonase</h3>
            <div className="space-y-3">
              {[...suppliers]
                .sort((a, b) => b.totalKg - a.totalKg)
                .slice(0, 5)
                .map((s, idx) => {
                  const maxKg = suppliers[0]?.totalKg || 1
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === 0 ? "bg-amber-100 text-amber-700" :
                        idx === 1 ? "bg-slate-100 text-slate-600" :
                        idx === 2 ? "bg-orange-100 text-orange-600" :
                        "bg-slate-50 text-slate-400"
                      }`}>{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-800 text-sm truncate">{s.nama}</span>
                          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{fmtKg(s.totalKg)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            style={{ width: `${Math.min((s.totalKg / maxKg) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: LAPAK ── */}
      {activeTab === "lapak" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text" placeholder="Cari nama lapak atau no. WA..."
                value={searchLapak} onChange={e => setSearchLapak(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-slate-700"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
            </select>
          </div>

          {/* Summary */}
          <div className="text-xs text-slate-500 px-1">
            Menampilkan <strong>{filteredSuppliers.length}</strong> dari {suppliers.length} lapak · diurutkan by tonase terbanyak
          </div>

          {/* Lapak Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                Tidak ada lapak yang cocok.
              </div>
            ) : filteredSuppliers.map((s, idx) => {
              const pctTarget = s.target_bulanan_kg > 0
                ? Math.min((s.totalKg / s.target_bulanan_kg) * 100, 100) : 0

              return (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {s.nama.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{s.nama}</div>
                        <div className="text-xs text-slate-400">{s.warehouse?.nama || "—"}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-400">Rank</div>
                      <div className="text-lg font-bold text-slate-600">#{idx + 1}</div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <MiniStat label="Total Trx" value={s.totalTransaksi.toString()} />
                    <MiniStat label="Selesai" value={s.totalSelesai.toString()} color="emerald" />
                    <MiniStat label="Total KG" value={fmtKg(s.totalKg)} color="cyan" />
                    <MiniStat label="Total Nilai" value={fmtRp(s.totalNilai)} color="violet" />
                  </div>

                  {/* Target Progress */}
                  {s.target_bulanan_kg > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Target Bulanan: {fmtKg(s.target_bulanan_kg)}</span>
                        <span className={`font-semibold ${pctTarget >= 100 ? "text-emerald-600" : "text-slate-500"}`}>
                          {pctTarget.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${pctTarget >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-500 to-blue-500"}`}
                          style={{ width: `${pctTarget}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-400">
                    {s.kontak_wa ? (
                      <a
                        href={`https://wa.me/${s.kontak_wa.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.107 1.523 5.83L.057 23.891a.5.5 0 0 0 .624.625l6.066-1.466A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.013-1.375l-.36-.214-3.73.902.918-3.729-.234-.382A9.818 9.818 0 1 1 12 21.818z"/></svg>
                        {s.kontak_wa}
                      </a>
                    ) : (
                      <span className="italic">Tidak ada kontak WA</span>
                    )}
                    <span>Terakhir: {fmtDate(s.lastPurchase)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB: PENGGUNA ── */}
      {activeTab === "pengguna" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text" placeholder="Cari nama atau email..."
                value={searchUser} onChange={e => setSearchUser(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-slate-700"
            >
              <option value="all">Semua Role</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Nama</th>
                    <th className="px-5 py-3.5 text-left">Email</th>
                    <th className="px-5 py-3.5 text-left">Role</th>
                    <th className="px-5 py-3.5 text-left">Gudang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                        Tidak ada pengguna yang cocok.
                      </td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            u.role === "SUPERVISOR"
                              ? "bg-emerald-100 text-emerald-700"
                              : u.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-cyan-100 text-cyan-700"
                          }`}>
                            {u.nama.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">{u.nama}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          u.role === "SUPERVISOR"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : u.role === "ADMIN"
                              ? "bg-violet-50 text-violet-700 border border-violet-200"
                              : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-sm">{u.warehouse?.nama || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: HARGA SKU ── */}
      {activeTab === "harga-sku" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <select
              value={filterSkuWarehouse} onChange={e => setFilterSkuWarehouse(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500 bg-white text-slate-700 w-full sm:w-auto"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
            </select>
          </div>

          {/* SKU Price Cards per warehouse */}
          {warehouses
            .filter(w => filterSkuWarehouse === "all" || w.id === filterSkuWarehouse)
            .map(w => {
              const wSkus = filteredSkuPrices.filter(s => s.warehouse.id === w.id)
              if (wSkus.length === 0) return null
              return (
                <div key={w.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                      {w.nama.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-800">{w.nama}</span>
                    <span className="text-xs text-slate-400 ml-auto">{wSkus.length} SKU</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-slate-400 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3 text-left">SKU</th>
                          <th className="px-5 py-3 text-right">Harga Maks / KG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {wSkus.map(sku => (
                          <tr key={sku.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                                <span className="font-semibold text-slate-800">{sku.sku_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700">
                              Rp {sku.max_price_per_kg.toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──
function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: string
}) {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-50 text-cyan-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-base mb-3 ${colorMap[color] || "bg-slate-50 text-slate-600"}`}>
        {icon}
      </div>
      <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-0.5">{label}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const cls = color === "emerald" ? "text-emerald-700 font-bold" :
    color === "cyan" ? "text-cyan-700 font-bold" :
    color === "violet" ? "text-violet-700 font-bold" : "text-slate-800 font-semibold"
  return (
    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
      <div className={`text-sm ${cls} leading-tight`}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  )
}
