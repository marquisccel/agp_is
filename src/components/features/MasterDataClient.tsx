"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import Link from "next/link"
import { Database, Search, UserPlus } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { useToast } from "@/components/ui/Toast"
import { hasResolvedSupplierCoordinates } from "@/lib/supplierLocation"

interface Warehouse { id: string; nama: string; lokasi: string }

/**
 * Pendaftaran akun operasional.
 *
 * Diletakkan di Master Data (halaman khusus Manager) dan bukan sebagai
 * halaman daftar terbuka: field `role` ditentukan pengisi form, sehingga
 * kalau terbuka untuk umum siapa pun bisa mendaftarkan dirinya sebagai
 * MANAGER. Server juga menolak pemanggil non-Manager, jadi pembatasan ini
 * tidak hanya di tampilan.
 */
function FormAkunBaru({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter()
  const { toast, host: toastHost } = useToast()
  const [terbuka, setTerbuka] = useState(false)
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("STAFF")
  const [warehouseId, setWarehouseId] = useState("")
  const [loading, setLoading] = useState(false)

  const butuhGudang = role !== "MANAGER"

  const reset = () => {
    setNama(""); setEmail(""); setPassword(""); setRole("STAFF"); setWarehouseId("")
  }

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (butuhGudang && !warehouseId) {
      toast("Staff dan Admin wajib ditugaskan ke satu gudang.", "error")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, email, password, role, warehouseId: butuhGudang ? warehouseId : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal membuat akun")
      toast(`Akun ${data.nama} (${data.role}) berhasil dibuat.`)
      reset()
      setTerbuka(false)
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error")
    } finally {
      setLoading(false)
    }
  }

  if (!terbuka) {
    return (
      <>
        {toastHost}
        <button
          type="button"
          onClick={() => setTerbuka(true)}
          className="premium-button btn-primer flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          <UserPlus className="h-4 w-4" />
          Daftarkan Akun Baru
        </button>
      </>
    )
  }

  return (
    <form onSubmit={simpan} className="section section-body space-y-4">
      {toastHost}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">Daftarkan Akun Baru</h3>
        <button type="button" onClick={() => { reset(); setTerbuka(false) }} className="text-xs font-semibold text-slate-500">
          Batal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="field-label">Nama Lengkap</span>
          <input
            required value={nama} onChange={(e) => setNama(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="space-y-1.5">
          <span className="field-label">Email</span>
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="space-y-1.5">
          <span className="field-label">Password</span>
          <input
            required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
          <span className="block text-[11px] text-slate-400">Minimal 8 karakter.</span>
        </label>

        <div className="space-y-1.5">
          <span className="field-label">Role</span>
          <ElegantSelect
            value={role}
            onChange={(v) => { setRole(v); if (v === "MANAGER") setWarehouseId("") }}
            ariaLabel="Pilih role akun"
            className="w-full"
            options={[
              { value: "STAFF", label: "Staff" },
              { value: "ADMIN", label: "Admin" },
              { value: "MANAGER", label: "Manager" },
            ]}
          />
        </div>

        {butuhGudang && (
          <div className="space-y-1.5 sm:col-span-2">
            <span className="field-label">Gudang Penugasan</span>
            <ElegantSelect
              value={warehouseId}
              onChange={setWarehouseId}
              ariaLabel="Pilih gudang penugasan"
              className="w-full"
              options={[
                { value: "", label: "Pilih gudang" },
                ...warehouses.map(w => ({ value: w.id, label: w.nama })),
              ]}
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="premium-button btn-primer rounded-xl px-6 py-2.5 text-sm font-bold disabled:opacity-70"
      >
        {loading ? "Menyimpan..." : "Buat Akun"}
      </button>
    </form>
  )
}


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
      {/* Tab memakai .segmented, sama dengan pemilih di dashboard Manager
          dan filter di Data Lapak -- sebelumnya kotak hitam pekat di atas
          panel kaca buram, satu-satunya pola seperti itu di aplikasi. */}
      <div className="segmented" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? "active" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div key={activeTab} className="soft-enter">
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Empat angka utama saja. Sebelumnya sembilan kartu berukuran
              sama berjejer 3x3 -- tanpa hierarki, dan sebagian isinya
              turunan atau sudah tampil di tempat lain: jumlah Collection
              Center terbaca dari daftarnya sendiri di bawah, dan status
              hijau/merah lapak sudah jadi badge di tab Lapak. */}
          <div className="stat-strip">
            <div className="stat-tile">
              <span className="stat-label">Total Transaksi</span>
              <div className="stat-value-row">
                <span className="stat-value">{globalStats.totalPurchases.toLocaleString("id-ID")}</span>
              </div>
              <span className="stat-delta flat">{globalStats.totalCompleted} selesai transfer</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Tonase Selesai</span>
              <div className="stat-value-row">
                <span className="stat-value">{fmtKg(globalStats.totalKg)}</span>
              </div>
              <span className="stat-delta flat">Seluruh gudang</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Nilai Transaksi</span>
              <div className="stat-value-row">
                <span className="stat-value">{fmtRp(globalStats.totalNilai)}</span>
              </div>
              <span className="stat-delta flat">Approved dan transfer</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Penyelesaian</span>
              <div className="stat-value-row">
                <span className="stat-value">
                  {globalStats.totalPurchases > 0 ? `${((globalStats.totalCompleted / globalStats.totalPurchases) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
              <span className="stat-delta flat">Transaksi selesai</span>
            </div>
          </div>

          {/* Komposisi lapak: satu baris, bukan tiga kartu terpisah. Hijau,
              merah, dan berkoordinat adalah pecahan dari satu angka yang
              sama, jadi lebih terbaca sebagai proporsi daripada sebagai
              tiga angka yang berdiri sendiri. */}
          <section className="section">
            <div className="section-shell-head">
              <div>
                <span className="section-eyebrow">Komposisi</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Lapak Terdaftar</h3>
              </div>
              <div className="text-right">
                <span className="field-label" style={{ marginBottom: 2 }}>Total</span>
                <span className="text-base font-extrabold" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
                  {globalStats.totalSuppliers.toLocaleString("id-ID")} lapak
                </span>
              </div>
            </div>
            <div className="section-body">
              <div className="flex h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                <div style={{ width: `${globalStats.totalSuppliers ? (globalStats.totalGreenSuppliers / globalStats.totalSuppliers) * 100 : 0}%`, background: "var(--success)" }} />
                <div style={{ width: `${globalStats.totalSuppliers ? (globalStats.totalRedSuppliers / globalStats.totalSuppliers) * 100 : 0}%`, background: "var(--danger)" }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                {/* Dua label terakhir yang masih menyebut nama warna, bukan
                    artinya. Baris lapak di tab sebelah sudah memakai
                    "Aktif"/"Belum aktif" untuk keadaan yang sama. */}
                <KomposisiItem warna="var(--success)" nilai={globalStats.totalGreenSuppliers} label="Aktif" sub="Sudah transaksi valid" />
                <KomposisiItem warna="var(--danger)" nilai={globalStats.totalRedSuppliers} label="Belum aktif" sub="Perlu aktivasi" />
                <KomposisiItem warna="var(--muted-faint)" nilai={globalStats.totalMapReadySuppliers} label="Berkoordinat" sub="Lokasi siap dipetakan" />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            {/* Keduanya memakai .rank-list -- pola daftar peringkat yang
                sudah ada di sistem desain tapi belum pernah dipakai.
                Gudang kini diurutkan menurun, jadi yang terbesar langsung
                di atas; sebelumnya urutannya mengikuti urutan data dan
                bar terbesarnya berwarna hitam pekat. */}
            <section className="section">
              <div className="section-shell-head">
                <div>
                  <span className="section-eyebrow">Per gudang</span>
                  <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Performa Gudang</h3>
                </div>
              </div>
              <div className="section-body">
                <div className="rank-list">
                  {warehouses
                    .map((warehouse) => {
                      const wSuppliers = suppliers.filter((supplier) => supplier.warehouseId === warehouse.id)
                      return {
                        warehouse,
                        jumlahLapak: wSuppliers.length,
                        kg: wSuppliers.reduce((sum, x) => sum + x.totalKg, 0),
                        nilai: wSuppliers.reduce((sum, x) => sum + x.totalNilai, 0),
                        trx: wSuppliers.reduce((sum, x) => sum + x.totalSelesai, 0),
                      }
                    })
                    .sort((a, b) => b.kg - a.kg)
                    .map((baris, idx, semua) => {
                      const maxKg = Math.max(semua[0]?.kg ?? 0, 1)
                      return (
                        <div key={baris.warehouse.id} className={`rank-row${idx === 0 && baris.kg > 0 ? " rank-first" : ""}`}>
                          <span className="rank-num">{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="rank-name truncate">{baris.warehouse.nama}</div>
                            <div className="rank-sub">{baris.jumlahLapak} lapak, {baris.trx} transaksi selesai</div>
                          </div>
                          <div className="rank-bar-track">
                            <div className="rank-bar-fill" style={{ width: `${Math.min((baris.kg / maxKg) * 100, 100)}%` }} />
                          </div>
                          <div className="rank-value">
                            {fmtKg(baris.kg)}
                            <div className="rank-sub">{fmtRp(baris.nilai)}</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </section>

            <section className="section">
              <div className="section-shell-head">
                <div>
                  <span className="section-eyebrow">Kontribusi</span>
                  <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Lapak Teratas</h3>
                </div>
              </div>
              <div className="section-body">
                <div className="rank-list">
                  {[...suppliers].sort((a, b) => b.totalKg - a.totalKg).slice(0, 5).map((supplier, idx, semua) => {
                    const maxKg = Math.max(semua[0]?.totalKg ?? 0, 1)
                    return (
                      <div key={supplier.id} className={`rank-row${idx === 0 && supplier.totalKg > 0 ? " rank-first" : ""}`}>
                        <span className="rank-num">{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="rank-name truncate">{supplier.nama}</div>
                        </div>
                        <div className="rank-bar-track">
                          <div className="rank-bar-fill" style={{ width: `${Math.min((supplier.totalKg / maxKg) * 100, 100)}%` }} />
                        </div>
                        <div className="rank-value">{fmtKg(supplier.totalKg)}</div>
                      </div>
                    )
                  })}
                </div>
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
              <div key={supplier.id} className="section section-body">
                <div className="flex items-start justify-between gap-4">
                  {/* Badge "Hijau"/"Merah" dulu cuma menyebut warnanya, jadi
                      pembacanya harus sudah tahu artinya. Sekarang warnanya
                      dibawa titik kecil di samping nama, dan artinya ditulis
                      sebagai teks abu di baris keterangan -- warna untuk
                      memindai, kata untuk memastikan. */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: supplier.transactionStatus === "GREEN" ? "var(--success)" : "var(--danger)" }}
                        aria-hidden="true"
                      />
                      <p className="truncate text-base font-black text-slate-950">{supplier.nama}</p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
                      <span>{supplier.warehouse?.nama || "-"}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{supplier.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"}</span>
                      <span aria-hidden="true">&middot;</span>
                      {/* Koordinat yang belum diisi tetap diberi nada amber:
                          itu data yang masih harus dilengkapi, bukan sekadar
                          keterangan. Tapi cukup lewat warna teks, tanpa pil
                          yang menarik perhatian lebih dari nama lapaknya. */}
                      <span style={hasResolvedSupplierCoordinates(supplier) ? undefined : { color: "var(--warning)", fontWeight: 600 }}>
                        {hasResolvedSupplierCoordinates(supplier) ? "Koordinat lengkap" : "Belum ada koordinat"}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>#{idx + 1}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label="Transaksi" value={supplier.totalTransaksi.toString()} />
                  <MiniStat label="Selesai" value={supplier.totalSelesai.toString()} />
                  <MiniStat label="Tonase" value={fmtKg(supplier.totalKg)} />
                  <MiniStat label="Nilai" value={fmtRp(supplier.totalNilai)} />
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 border-t pt-4 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                  <span>{supplier.kontak_wa ? `WA ${supplier.kontak_wa}` : "Kontak belum tersedia"}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Terakhir: {fmtDate(supplier.lastPurchase)}</span>
                    <Link href={`/dashboard/manager/suppliers/${supplier.id}`} className="font-bold transition-colors hover:opacity-80" style={{ color: "var(--brand-strong)" }}>
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
          <FormAkunBaru warehouses={warehouses} />

          <FilterBar>
            <SearchBox value={searchUser} onChange={setSearchUser} placeholder="Cari nama atau email..." />
            <ElegantSelect
              value={filterRole}
              onChange={setFilterRole}
              ariaLabel="Filter role pengguna"
              className="w-full sm:w-48"
              options={[
                { value: "all", label: "Semua Role" },
                { value: "ADMIN", label: "Admin" },
                { value: "STAFF", label: "Staff" },
              ]}
            />
          </FilterBar>

          <div className="section overflow-hidden">
            <table className="tabel-lembut text-sm">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Gudang</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center" style={{ color: "var(--muted-faint)" }}>Tidak ada pengguna yang cocok.</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="font-bold" style={{ color: "var(--foreground)" }}>{user.nama}</td>
                    <td className="font-mono text-xs" style={{ color: "var(--muted)" }}>{user.email}</td>
                    <td><span className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" style={{ borderColor: "var(--border)", background: "var(--bg-tint)", color: "var(--muted)" }}>{user.role}</span></td>
                    <td style={{ color: "var(--muted)" }}>{user.warehouse?.nama || "-"}</td>
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
                <section key={warehouse.id} className="section">
                  <div className="section-shell-head">
                    <div>
                      <span className="section-eyebrow">Standar harga</span>
                      <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>{warehouse.nama}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" style={{ color: "var(--brand-strong)" }} />
                      <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>{wSkus.length} SKU</span>
                    </div>
                  </div>
                  <table className="tabel-lembut text-sm">
                    <tbody>
                      {wSkus.map((sku) => (
                        <tr key={sku.id}>
                          <td className="font-bold" style={{ color: "var(--foreground)" }}>{sku.sku_name}</td>
                          <td className="text-right font-mono font-black" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>Rp {sku.max_price_per_kg.toLocaleString("id-ID")}</td>
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

function KomposisiItem({ warna, nilai, label, sub }: { warna: string; nilai: number; label: string; sub: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: warna }} />
        <span className="text-lg font-extrabold" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
          {nilai.toLocaleString("id-ID")}
        </span>
        <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>{label}</span>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: "var(--muted-faint)" }}>{sub}</p>
    </div>
  )
}


function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border p-3 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-sm font-black text-slate-950">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</div>
    </div>
  )
}

function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="section section-body">
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
        className="field-input field-icon"
      />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-[var(--radius-lg)] border border-dashed p-12 text-center text-sm font-semibold" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)", color: "var(--muted-faint)" }}>
      {text}
    </div>
  )
}
