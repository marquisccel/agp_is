"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Boxes, Building2, CheckCircle2, CircleDollarSign, Database, MapPin, Package, Search, Users } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"

interface Warehouse { id: string; nama: string; lokasi: string }
interface SupplierStat {
  id: string
  nama: string
  kontak_wa: string | null
  link: string | null
  latitude: number | null
  longitude: number | null
  transactionStatus: string
  target_bulanan_kg: number
  warehouseId: string | null
  warehouse: { id: string; nama: string } | null
  totalTransaksi: number
  totalSelesai: number
  totalNilai: number
  totalKg: number
  lastPurchase: string | null
}
interface UserData {
  id: string
  nama: string
  email: string
  role: string
  warehouseId: string | null
  warehouse: { id: string; nama: string } | null
}
interface SkuPrice {
  id: string
  sku_name: string
  max_price_per_kg: number
  warehouse: { id: string; nama: string }
}
interface GlobalStats {
  totalPurchases: number
  totalCompleted: number
  totalNilai: number
  totalKg: number
  totalSuppliers: number
  totalWarehouses: number
  totalGreenSuppliers: number
  totalRedSuppliers: number
  totalMapReadySuppliers: number
}

type Tab = "overview" | "lapak" | "pengguna" | "harga-sku"
type SupplierStatusFilter = "all" | "GREEN" | "RED"

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
  if (!d) return "-"
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
}

export default function MasterDataClient({
  warehouses,
  suppliers,
  users,
  skuPrices,
  globalStats,
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
  const [filterSupplierStatus, setFilterSupplierStatus] = useState<SupplierStatusFilter>("all")
  const [searchUser, setSearchUser] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterSkuWarehouse, setFilterSkuWarehouse] = useState("all")

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Ringkasan" },
    { id: "lapak", label: "Lapak" },
    { id: "pengguna", label: "Pengguna" },
    { id: "harga-sku", label: "Harga SKU" },
  ]

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchSearch = supplier.nama.toLowerCase().includes(searchLapak.toLowerCase()) ||
      (supplier.kontak_wa || "").includes(searchLapak)
    const matchWarehouse = filterWarehouse === "all" || supplier.warehouseId === filterWarehouse
    const matchStatus = filterSupplierStatus === "all" || supplier.transactionStatus === filterSupplierStatus
    return matchSearch && matchWarehouse && matchStatus
  }).sort((a, b) => b.totalKg - a.totalKg)

  const filteredUsers = users.filter((user) => {
    const matchSearch = user.nama.toLowerCase().includes(searchUser.toLowerCase()) ||
      user.email.toLowerCase().includes(searchUser.toLowerCase())
    const matchRole = filterRole === "all" || user.role === filterRole
    return matchSearch && matchRole
  })

  const filteredSkuPrices = skuPrices.filter((sku) =>
    filterSkuWarehouse === "all" || sku.warehouse.id === filterSkuWarehouse
  )

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/70 p-1 shadow-sm backdrop-blur">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-28 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-slate-950"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div key={activeTab} className="soft-enter">
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard icon={<Package />} label="Total Transaksi" value={globalStats.totalPurchases.toLocaleString("id-ID")} sub={`${globalStats.totalCompleted} selesai transfer`} />
            <StatCard icon={<Boxes />} label="Tonase Selesai" value={fmtKg(globalStats.totalKg)} sub="Seluruh Collection Center" />
            <StatCard icon={<CircleDollarSign />} label="Nilai Transaksi" value={fmtRp(globalStats.totalNilai)} sub="Approved dan transfer" />
            <StatCard icon={<Users />} label="Lapak / Supplier" value={globalStats.totalSuppliers.toLocaleString("id-ID")} sub="Terdaftar" />
            <StatCard icon={<Building2 />} label="Collection Center" value={globalStats.totalWarehouses.toLocaleString("id-ID")} sub="Gudang aktif" />
            <StatCard
              icon={<CheckCircle2 />}
              label="Penyelesaian"
              value={globalStats.totalPurchases > 0 ? `${((globalStats.totalCompleted / globalStats.totalPurchases) * 100).toFixed(0)}%` : "0%"}
              sub="Transaksi selesai"
            />
            <StatCard icon={<Users />} label="Supplier Hijau" value={globalStats.totalGreenSuppliers.toLocaleString("id-ID")} sub="Sudah transaksi valid" />
            <StatCard icon={<Users />} label="Supplier Merah" value={globalStats.totalRedSuppliers.toLocaleString("id-ID")} sub="Perlu aktivasi" />
            <StatCard icon={<MapPin />} label="Lokasi Siap" value={globalStats.totalMapReadySuppliers.toLocaleString("id-ID")} sub="Koordinat tersedia" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <section className="interactive-surface border border-slate-200/80 p-5">
              <h3 className="text-sm font-black text-slate-950">Performa per Collection Center</h3>
              <p className="mt-1 text-xs text-slate-500">Ringkasan volume, nilai, dan jumlah lapak aktif per gudang.</p>
              <div className="mt-5 space-y-3">
                {warehouses.map((warehouse) => {
                  const wSuppliers = suppliers.filter((supplier) => supplier.warehouseId === warehouse.id)
                  const wKg = wSuppliers.reduce((sum, supplier) => sum + supplier.totalKg, 0)
                  const wNilai = wSuppliers.reduce((sum, supplier) => sum + supplier.totalNilai, 0)
                  const wTrx = wSuppliers.reduce((sum, supplier) => sum + supplier.totalSelesai, 0)
                  const maxKg = Math.max(...warehouses.map((item) =>
                    suppliers.filter((supplier) => supplier.warehouseId === item.id).reduce((sum, supplier) => sum + supplier.totalKg, 0)
                  ), 1)

                  return (
                    <div key={warehouse.id} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{warehouse.nama}</p>
                          <p className="mt-1 text-xs text-slate-500">{wSuppliers.length} lapak aktif, {wTrx} transaksi selesai</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-black text-slate-950">{fmtKg(wKg)}</p>
                          <p className="text-xs text-slate-500">{fmtRp(wNilai)}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-950 transition-all duration-700" style={{ width: `${Math.min((wKg / maxKg) * 100, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="interactive-surface border border-slate-200/80 p-5">
              <h3 className="text-sm font-black text-slate-950">Top 5 Lapak by Tonase</h3>
              <p className="mt-1 text-xs text-slate-500">Supplier dengan kontribusi volume terbesar.</p>
              <div className="mt-5 space-y-3">
                {[...suppliers].sort((a, b) => b.totalKg - a.totalKg).slice(0, 5).map((supplier, idx) => {
                  const maxKg = suppliers[0]?.totalKg || 1
                  return (
                    <div key={supplier.id} className="flex items-center gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">{idx + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-bold text-slate-900">{supplier.nama}</p>
                          <span className="shrink-0 text-xs font-bold text-slate-500">{fmtKg(supplier.totalKg)}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-teal-700" style={{ width: `${Math.min((supplier.totalKg / maxKg) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "lapak" && (
        <div className="space-y-4">
          <FilterBar>
            <SearchBox value={searchLapak} onChange={setSearchLapak} placeholder="Cari nama lapak atau no. WA..." />
            <ElegantSelect
              value={filterWarehouse}
              onChange={setFilterWarehouse}
              ariaLabel="Filter gudang lapak"
              className="w-full sm:w-56"
              menuClassName="w-56"
              options={[
                { value: "all", label: "Semua Gudang" },
                ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.nama })),
              ]}
            />
            <ElegantSelect
              value={filterSupplierStatus}
              onChange={(value) => setFilterSupplierStatus(value as SupplierStatusFilter)}
              ariaLabel="Filter status supplier"
              className="w-full sm:w-56"
              options={[
                { value: "all", label: "Semua Status" },
                { value: "GREEN", label: "Hijau - aktif" },
                { value: "RED", label: "Merah - belum aktif" },
              ]}
            />
          </FilterBar>

          <p className="px-1 text-xs text-slate-500">
            Menampilkan <strong>{filteredSuppliers.length}</strong> dari {suppliers.length} lapak, diurutkan dari tonase terbesar.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredSuppliers.length === 0 ? (
              <EmptyState text="Tidak ada lapak yang cocok." />
            ) : filteredSuppliers.map((supplier, idx) => (
              <div key={supplier.id} className="interactive-surface border border-slate-200/80 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950">{supplier.nama}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-500">{supplier.warehouse?.nama || "-"}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                        supplier.transactionStatus === "GREEN"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}>
                        {supplier.transactionStatus === "GREEN" ? "Hijau" : "Merah"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                        supplier.latitude !== null && supplier.longitude !== null
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        {supplier.latitude !== null && supplier.longitude !== null ? "Map Ready" : "Belum Ada Koordinat"}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">#{idx + 1}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label="Transaksi" value={supplier.totalTransaksi.toString()} />
                  <MiniStat label="Selesai" value={supplier.totalSelesai.toString()} />
                  <MiniStat label="Tonase" value={fmtKg(supplier.totalKg)} />
                  <MiniStat label="Nilai" value={fmtRp(supplier.totalNilai)} />
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200/70 pt-4 text-xs text-slate-500">
                  <span>{supplier.kontak_wa ? `WA ${supplier.kontak_wa}` : "Kontak belum tersedia"}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Terakhir: {fmtDate(supplier.lastPurchase)}</span>
                    <Link href={`/dashboard/manager/suppliers/${supplier.id}`} className="font-bold text-teal-700 hover:text-teal-800">
                      Detail lapak
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "pengguna" && (
        <div className="space-y-4">
          <FilterBar>
            <SearchBox value={searchUser} onChange={setSearchUser} placeholder="Cari nama atau email..." />
            <ElegantSelect
              value={filterRole}
              onChange={setFilterRole}
              ariaLabel="Filter role pengguna"
              className="w-full sm:w-48"
              options={[
                { value: "all", label: "Semua Role" },
                { value: "SUPERVISOR", label: "Supervisor" },
                { value: "ADMIN", label: "Admin" },
                { value: "STAFF", label: "Staff" },
              ]}
            />
          </FilterBar>

          <div className="interactive-surface overflow-hidden border border-slate-200/80">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200/70 bg-white/55 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left">Nama</th>
                  <th className="px-5 py-4 text-left">Email</th>
                  <th className="px-5 py-4 text-left">Role</th>
                  <th className="px-5 py-4 text-left">Gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">Tidak ada pengguna yang cocok.</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="premium-row">
                    <td className="px-5 py-4 font-bold text-slate-900">{user.nama}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">{user.email}</td>
                    <td className="px-5 py-4"><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700">{user.role}</span></td>
                    <td className="px-5 py-4 text-slate-600">{user.warehouse?.nama || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "harga-sku" && (
        <div className="space-y-4">
          <FilterBar>
            <ElegantSelect
              value={filterSkuWarehouse}
              onChange={setFilterSkuWarehouse}
              ariaLabel="Filter gudang SKU"
              className="w-full sm:w-56"
              menuClassName="w-56"
              options={[
                { value: "all", label: "Semua Gudang" },
                ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.nama })),
              ]}
            />
          </FilterBar>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {warehouses.filter((warehouse) => filterSkuWarehouse === "all" || warehouse.id === filterSkuWarehouse).map((warehouse) => {
              const wSkus = filteredSkuPrices.filter((sku) => sku.warehouse.id === warehouse.id)
              if (wSkus.length === 0) return null
              return (
                <section key={warehouse.id} className="interactive-surface overflow-hidden border border-slate-200/80">
                  <div className="flex items-center justify-between border-b border-slate-200/70 p-5">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{warehouse.nama}</h3>
                      <p className="mt-1 text-xs text-slate-500">{wSkus.length} SKU tersimpan</p>
                    </div>
                    <Database className="h-5 w-5 text-slate-400" />
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {wSkus.map((sku) => (
                        <tr key={sku.id} className="premium-row">
                          <td className="px-5 py-3 font-bold text-slate-900">{sku.sku_name}</td>
                          <td className="px-5 py-3 text-right font-mono font-black text-slate-950">Rp {sku.max_price_per_kg.toLocaleString("id-ID")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="interactive-surface border border-slate-200/80 p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <div className="text-2xl font-black tracking-[-0.03em] text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 text-center">
      <div className="text-sm font-black text-slate-950">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</div>
    </div>
  )
}

function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="interactive-surface border border-slate-200/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {children}
      </div>
    </div>
  )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
      />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-[24px] border border-dashed border-slate-200 bg-white/60 p-12 text-center text-sm font-semibold text-slate-400">
      {text}
    </div>
  )
}
