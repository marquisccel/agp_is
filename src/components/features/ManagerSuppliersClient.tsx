"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  Award,
  Check,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { fmtKg, fmtRp, fmtTon } from "@/lib/format"

interface SkuPriceStandard {
  id: string
  sku_name: string
  warehouseId: string
  max_price_per_kg: number
}

interface PurchaseItem {
  id: string
  sku_name: string
  spec: string | null
  berat_lapak: number | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

interface Purchase {
  id: string
  nomor_nota: string | null
  tanggal: string
  warehouseId: string
  supplierId: string
  berat_timbangan_lapak: number | null
  berat_timbangan_gudang: number | null
  total_nilai_sebelum_retur: number | null
  total_nilai_setelah_retur: number | null
  total_dibayar: number | null
  status_approval: string
  createdAt: string
  items: PurchaseItem[]
}

interface Supplier {
  id: string
  nama: string
  kontak_wa: string | null
  link: string | null
  latitude: number | null
  longitude: number | null
  transactionStatus: string
  nama_bank: string | null
  nomor_rekening: string | null
  atas_nama: string | null
  target_bulanan_kg: number
  frekuensi_ambilan_mingguan: number
  hari_ambilan: string | null
  warehouseId: string | null
  warehouse: {
    id: string
    nama: string
  } | null
  purchases: Purchase[]
}

interface Warehouse {
  id: string
  nama: string
}

type GradeFilter = "all" | "A" | "B" | "C" | "active"
type SupplierStatusFilter = "all" | "GREEN" | "RED"

const MONTHS: { value: number | "all"; label: string }[] = [
  { value: "all", label: "Semua Bulan" },
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
]

const YEARS = [2025, 2026, 2027]

export default function ManagerSuppliersClient({
  suppliers: initialSuppliers,
  warehouses,
  skuPrices = [],
}: {
  suppliers: Supplier[]
  warehouses: Warehouse[]
  skuPrices: SkuPriceStandard[]
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<GradeFilter>("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<SupplierStatusFilter>("all")
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(currentMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingLocationSupplierId, setEditingLocationSupplierId] = useState<string | null>(null)
  const [locationLink, setLocationLink] = useState("")
  const [locationLatitude, setLocationLatitude] = useState("")
  const [locationLongitude, setLocationLongitude] = useState("")
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationError, setLocationError] = useState("")

  const handleDelete = async (id: string) => {
    if (!confirm("Hati-hati! Apakah Anda yakin ingin menghapus data lapak ini? Lapak tidak bisa dihapus jika memiliki riwayat transaksi/kasbon.")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/manager/suppliers/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menghapus data lapak")
      }
      alert("Data lapak berhasil dihapus.")
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getWaLink = (num: string | null) => {
    if (!num) return "#"
    let clean = num.replace(/\D/g, "")
    if (clean.startsWith("0")) clean = `62${clean.slice(1)}`
    else if (clean.startsWith("8")) clean = `62${clean}`
    return `https://wa.me/${clean}`
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenLocationEditor = (supplier: Supplier) => {
    setEditingLocationSupplierId(supplier.id)
    setLocationLink(supplier.link || "")
    setLocationLatitude(supplier.latitude !== null ? String(supplier.latitude) : "")
    setLocationLongitude(supplier.longitude !== null ? String(supplier.longitude) : "")
    setLocationError("")
  }

  const handleCloseLocationEditor = () => {
    setEditingLocationSupplierId(null)
    setLocationLink("")
    setLocationLatitude("")
    setLocationLongitude("")
    setLocationError("")
    setSavingLocation(false)
  }

  const handleSaveLocation = async () => {
    if (!editingLocationSupplierId) return

    setSavingLocation(true)
    setLocationError("")

    try {
      const supplier = suppliers.find((item) => item.id === editingLocationSupplierId)
      if (!supplier) {
        throw new Error("Supplier tidak ditemukan")
      }

      const res = await fetch(`/api/suppliers/${editingLocationSupplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: supplier.nama,
          kontak_wa: supplier.kontak_wa || "",
          link: locationLink,
          latitude: locationLatitude,
          longitude: locationLongitude,
          transactionStatus: supplier.transactionStatus,
          nama_bank: supplier.nama_bank || "",
          nomor_rekening: supplier.nomor_rekening || "",
          atas_nama: supplier.atas_nama || "",
          target_bulanan_kg: supplier.target_bulanan_kg,
          frekuensi_ambilan_mingguan: supplier.frekuensi_ambilan_mingguan,
          hari_ambilan: supplier.hari_ambilan || "",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menyimpan lokasi supplier")
      }

      setSuppliers((current) =>
        current.map((item) =>
          item.id === editingLocationSupplierId
            ? {
                ...item,
                link: locationLink || null,
                latitude: locationLatitude !== "" ? Number(locationLatitude) : null,
                longitude: locationLongitude !== "" ? Number(locationLongitude) : null,
              }
            : item
        )
      )

      handleCloseLocationEditor()
    } catch (error: any) {
      setLocationError(error.message || "Gagal menyimpan lokasi supplier")
      setSavingLocation(false)
    }
  }

  const getSupplierPerformance = (supplier: Supplier) => {
    const filteredPurchases = supplier.purchases.filter((purchase) => {
      const matchWarehouse = selectedWarehouseId === "all" || purchase.warehouseId === selectedWarehouseId
      const date = new Date(purchase.tanggal)
      const matchDate =
        selectedMonth === "all"
          ? date.getUTCFullYear() === selectedYear
          : date.getUTCMonth() + 1 === selectedMonth && date.getUTCFullYear() === selectedYear

      return matchWarehouse && matchDate
    })

    const totalTransactions = filteredPurchases.length
    const totalGudangWeight = filteredPurchases.reduce((sum, purchase) => sum + (purchase.berat_timbangan_gudang || 0), 0)

    let qtyScore = 0
    let targetPct = 0
    if (supplier.target_bulanan_kg > 0) {
      targetPct = (totalGudangWeight / supplier.target_bulanan_kg) * 100
      qtyScore = Math.min(targetPct, 100)
    } else if (totalGudangWeight >= 5000) qtyScore = 100
    else if (totalGudangWeight >= 2000) qtyScore = 80
    else if (totalGudangWeight >= 500) qtyScore = 60
    else if (totalGudangWeight > 0) qtyScore = 40

    let totalSusut = 0
    let totalLapakWeight = 0
    filteredPurchases.forEach((purchase) => {
      const lapak = purchase.berat_timbangan_lapak || 0
      const gudang = purchase.berat_timbangan_gudang || 0
      totalLapakWeight += lapak
      if (gudang - lapak < 0) totalSusut += Math.abs(gudang - lapak)
    })
    const pctSusut = totalLapakWeight > 0 ? (totalSusut / totalLapakWeight) * 100 : 0
    const qualityScore = totalLapakWeight > 0 ? Math.max(0, 100 - pctSusut * 25) : 100

    let totalSubtotal = 0
    let totalItemWeight = 0
    let warningCount = 0

    filteredPurchases.forEach((purchase) => {
      purchase.items.forEach((item) => {
        const itemWeight = item.berat_final_item || 0
        totalSubtotal += item.subtotal || itemWeight * item.harga_per_kg || 0
        totalItemWeight += itemWeight

        const std = skuPrices.find((price) => price.sku_name === item.sku_name && price.warehouseId === purchase.warehouseId)
        if (std && item.harga_per_kg > std.max_price_per_kg) warningCount++
      })
    })

    const avgPrice = totalItemWeight > 0 ? totalSubtotal / totalItemWeight : 0
    const priceScore = totalTransactions > 0 ? Math.max(50, 100 - warningCount * 20) : 100

    let opi = 0
    let grade = "-"
    let gradeLabel = "Belum ada data"
    let gradeColor = "border-slate-200 bg-slate-50 text-slate-500"

    if (totalTransactions > 0) {
      opi = qtyScore * 0.4 + qualityScore * 0.4 + priceScore * 0.2
      if (opi >= 85) {
        grade = "A"
        gradeLabel = "Sangat bagus"
        gradeColor = "border-emerald-200 bg-emerald-50 text-emerald-700"
      } else if (opi >= 60) {
        grade = "B"
        gradeLabel = "Stabil"
        gradeColor = "border-blue-200 bg-blue-50 text-blue-700"
      } else {
        grade = "C"
        gradeLabel = "Perlu evaluasi"
        gradeColor = "border-rose-200 bg-rose-50 text-rose-700"
      }
    }

    return {
      totalTransactions,
      totalGudangWeight,
      targetPct,
      totalSusut,
      pctSusut,
      avgPrice,
      warningCount,
      opi,
      grade,
      gradeLabel,
      gradeColor,
    }
  }

  const suppliersWithPerformance = suppliers.map((supplier) => ({
    ...supplier,
    performance: getSupplierPerformance(supplier),
  }))

  const baseFilteredSuppliers = suppliersWithPerformance.filter((supplier) => {
    const matchesWarehouse = selectedWarehouseId === "all" || supplier.warehouseId === selectedWarehouseId
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      supplier.nama.toLowerCase().includes(query) ||
      (supplier.kontak_wa && supplier.kontak_wa.toLowerCase().includes(query)) ||
      (supplier.nama_bank && supplier.nama_bank.toLowerCase().includes(query)) ||
      (supplier.nomor_rekening && supplier.nomor_rekening.toLowerCase().includes(query)) ||
      (supplier.atas_nama && supplier.atas_nama.toLowerCase().includes(query)) ||
      (supplier.warehouse?.nama && supplier.warehouse.nama.toLowerCase().includes(query))

    return matchesWarehouse && matchesSearch
  })

  const activeLapakCount = baseFilteredSuppliers.filter((supplier) => supplier.performance.totalTransactions > 0).length
  const gradeACount = baseFilteredSuppliers.filter((supplier) => supplier.performance.grade === "A").length
  const gradeBCount = baseFilteredSuppliers.filter((supplier) => supplier.performance.grade === "B").length
  const gradeCCount = baseFilteredSuppliers.filter((supplier) => supplier.performance.grade === "C").length
  const greenSupplierCount = baseFilteredSuppliers.filter((supplier) => supplier.transactionStatus === "GREEN").length
  const redSupplierCount = baseFilteredSuppliers.filter((supplier) => supplier.transactionStatus === "RED").length
  const totalWeightFiltered = baseFilteredSuppliers.reduce((sum, supplier) => sum + supplier.performance.totalGudangWeight, 0)

  const filteredSuppliers = baseFilteredSuppliers.filter((supplier) => {
    if (selectedStatusFilter === "GREEN" && supplier.transactionStatus !== "GREEN") return false
    if (selectedStatusFilter === "RED" && supplier.transactionStatus !== "RED") return false
    if (selectedGradeFilter === "A") return supplier.performance.grade === "A"
    if (selectedGradeFilter === "B") return supplier.performance.grade === "B"
    if (selectedGradeFilter === "C") return supplier.performance.grade === "C"
    if (selectedGradeFilter === "active") return supplier.performance.totalTransactions > 0
    return true
  })

  const filterCards = [
    { id: "active" as GradeFilter, label: "Lapak aktif", value: activeLapakCount, sub: `${baseFilteredSuppliers.length} total lapak`, icon: Users },
    { id: "A" as GradeFilter, label: "Kinerja A", value: gradeACount, sub: "Sangat bagus", icon: Award },
    { id: "B" as GradeFilter, label: "Kinerja B", value: gradeBCount, sub: "Stabil", icon: Activity },
    { id: "C" as GradeFilter, label: "Kinerja C", value: gradeCCount, sub: "Perlu evaluasi", icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      <section className="interactive-surface border border-slate-200/80 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">Supplier intelligence</p>
            <h3 className="mt-2 text-xl font-black tracking-[-0.02em] text-slate-950">Kinerja Lapak dan Supplier</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Filter performa berdasarkan gudang, periode, grade, dan kata kunci tanpa kehilangan konteks operasional.
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Tonase periode ini</p>
            <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{fmtKg(totalWeightFiltered)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {filterCards.map((card) => {
            const Icon = card.icon
            const active = selectedGradeFilter === card.id
            return (
              <button
                key={card.id}
                onClick={() => setSelectedGradeFilter(active ? "all" : card.id)}
                className={`premium-button group flex items-center gap-3 rounded-2xl border p-4 text-left will-change-transform ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
                    : "border-slate-200/80 bg-white/70 text-slate-900 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${active ? "bg-white/12 text-white" : "bg-slate-100 text-slate-700"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[11px] font-black uppercase tracking-[0.1em] ${active ? "text-white/60" : "text-slate-400"}`}>
                    {card.label}
                  </span>
                  <span className="mt-1 block text-xl font-black tracking-[-0.03em]">{card.value}</span>
                  <span className={`block truncate text-xs font-semibold ${active ? "text-white/60" : "text-slate-500"}`}>{card.sub}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedStatusFilter("all")}
            className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
              selectedStatusFilter === "all" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            Semua Status
          </button>
          <button
            onClick={() => setSelectedStatusFilter("GREEN")}
            className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
              selectedStatusFilter === "GREEN" ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            Hijau {greenSupplierCount}
          </button>
          <button
            onClick={() => setSelectedStatusFilter("RED")}
            className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
              selectedStatusFilter === "RED" ? "bg-rose-600 text-white" : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            Merah {redSupplierCount}
          </button>
        </div>
      </section>

      <section className="interactive-surface border border-slate-200/80 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedWarehouseId("all")}
              className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                selectedWarehouseId === "all" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white/80 text-slate-600 hover:text-slate-950"
              }`}
            >
              Semua Gudang
            </button>
            {warehouses.map((warehouse) => {
              const active = selectedWarehouseId === warehouse.id
              return (
                <button
                  key={warehouse.id}
                  onClick={() => setSelectedWarehouseId(warehouse.id)}
                  className={`premium-button rounded-xl px-4 py-2 text-xs font-black ${
                    active ? "bg-slate-950 text-white" : "border border-slate-200 bg-white/80 text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {warehouse.nama.replace(/^Gudang\s+/i, "CC ")}
                </button>
              )
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-[140px_112px_minmax(220px,280px)]">
            <ElegantSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
              ariaLabel="Filter bulan lapak"
              className="w-full"
              options={MONTHS}
            />
            <ElegantSelect
              value={selectedYear}
              onChange={setSelectedYear}
              ariaLabel="Filter tahun lapak"
              className="w-full"
              options={YEARS.map((year) => ({ value: year, label: String(year) }))}
            />
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, bank, gudang..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>
        </div>

        {(selectedGradeFilter !== "all" || selectedStatusFilter !== "all") && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <span>
              Menampilkan <strong className="text-slate-950">{filteredSuppliers.length} lapak</strong> sesuai filter performa.
            </span>
            <button
              onClick={() => {
                setSelectedGradeFilter("all")
                setSelectedStatusFilter("all")
              }}
              className="font-black text-slate-950 hover:text-teal-700"
            >
              Bersihkan filter
            </button>
          </div>
        )}
      </section>

      {filteredSuppliers.length > 0 ? (
        <div
          key={`${selectedWarehouseId}-${selectedGradeFilter}-${selectedStatusFilter}-${selectedMonth}-${selectedYear}-${searchQuery}`}
          className="grid grid-cols-1 gap-4 xl:grid-cols-2 soft-enter"
        >
          {filteredSuppliers.map((supplier) => {
            const perf = supplier.performance
            const cleanedCity = supplier.warehouse?.nama.replace(/^Gudang\s+/i, "") || "CC"
            const targetLabel = supplier.target_bulanan_kg > 0 ? `${Math.min(perf.targetPct, 999).toFixed(0)}% dari target ${fmtTon(supplier.target_bulanan_kg)}` : "Target belum diatur"

            return (
              <article key={supplier.id} className="interactive-surface border border-slate-200/80 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/manager/suppliers/${supplier.id}`} className="truncate text-lg font-black tracking-[-0.02em] text-slate-950 hover:text-teal-700">
                        {supplier.nama}
                      </Link>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                        supplier.transactionStatus === "GREEN"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}>
                        {supplier.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${perf.gradeColor}`}>
                        Grade {perf.grade} - {perf.gradeLabel}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                        supplier.latitude !== null && supplier.longitude !== null
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>
                        {supplier.latitude !== null && supplier.longitude !== null ? "Map Ready" : "Lokasi belum lengkap"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Collection Center {cleanedCity}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center md:min-w-[270px]">
                    <MiniMetric label="Volume" value={perf.totalGudangWeight > 0 ? fmtKg(perf.totalGudangWeight) : "0 KG"} />
                    <MiniMetric label="Harga Avg" value={perf.avgPrice > 0 ? `${fmtRp(perf.avgPrice)}/KG` : "-"} />
                    <MiniMetric label="Transaksi" value={String(perf.totalTransactions)} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Signal
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Kuantitas"
                    value={targetLabel}
                    tone={perf.targetPct >= 100 ? "good" : perf.targetPct >= 50 ? "neutral" : "warn"}
                  />
                  <Signal
                    icon={<Activity className="h-4 w-4" />}
                    label="Susut"
                    value={perf.totalTransactions > 0 ? (perf.pctSusut === 0 ? "Sesuai 0%" : `${perf.pctSusut.toFixed(2)}%`) : "Belum ada data"}
                    tone={perf.pctSusut <= 1 ? "good" : perf.pctSusut <= 3 ? "warn" : "bad"}
                  />
                  <Signal
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Harga"
                    value={perf.warningCount > 0 ? `${perf.warningCount} transaksi di atas limit` : "Dalam limit"}
                    tone={perf.warningCount > 0 ? "bad" : "good"}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/70 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 text-sm">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Rekening</p>
                    {supplier.nomor_rekening ? (
                      <button
                        onClick={() => handleCopy(supplier.id, supplier.nomor_rekening || "")}
                        className="mt-1 flex min-w-0 items-center gap-2 text-left font-bold text-slate-800 hover:text-teal-700"
                        title="Salin nomor rekening"
                      >
                        <span className="truncate">{supplier.nama_bank} - {supplier.nomor_rekening}</span>
                        {copiedId === supplier.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-400" />}
                      </button>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">Belum ada rekening</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/manager/suppliers/${supplier.id}`} className="premium-button rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">
                      Detail Lapak
                    </Link>
                    <button
                      onClick={() => handleOpenLocationEditor(supplier)}
                      className="premium-button flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      <MapPin className="h-4 w-4" />
                      Edit Lokasi
                    </button>
                    {supplier.kontak_wa ? (
                      <a
                        href={getWaLink(supplier.kontak_wa)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="premium-button grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-600"
                        title="Chat WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      disabled={deletingId === supplier.id}
                      className="premium-button grid h-9 w-9 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      title="Hapus Lapak"
                    >
                      {deletingId === supplier.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div
          key={`${selectedWarehouseId}-${selectedGradeFilter}-${selectedStatusFilter}-${selectedMonth}-${selectedYear}-${searchQuery}-empty`}
          className="interactive-surface border border-dashed border-slate-200/90 p-12 text-center soft-enter"
        >
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h4 className="font-black text-slate-800">Lapak tidak ditemukan</h4>
          <p className="mt-1 text-sm text-slate-400">Tidak ada mitra yang cocok dengan filter atau kata kunci pencarian.</p>
        </div>
      )}

      {editingLocationSupplierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">Quick edit lokasi</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Perbarui Lokasi Supplier</h3>
                <p className="mt-1 text-sm text-slate-500">Simpan link Maps dan koordinat tanpa meninggalkan daftar lapak.</p>
              </div>
              <button
                onClick={handleCloseLocationEditor}
                className="premium-button rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Link Google Maps</label>
                <input
                  type="text"
                  value={locationLink}
                  onChange={(event) => setLocationLink(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-cyan-500"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={locationLatitude}
                  onChange={(event) => setLocationLatitude(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-cyan-500"
                  placeholder="-7.8165"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={locationLongitude}
                  onChange={(event) => setLocationLongitude(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-cyan-500"
                  placeholder="112.0111"
                />
              </div>
            </div>

            {locationError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {locationError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={handleCloseLocationEditor}
                className="premium-button rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={savingLocation}
                className="premium-button rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingLocation ? "Menyimpan..." : "Simpan Lokasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-1 whitespace-nowrap text-sm font-black tracking-[-0.02em] text-slate-950">{value}</p>
    </div>
  )
}

function Signal({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "good" | "neutral" | "warn" | "bad"
}) {
  const toneClass = {
    good: "border-emerald-200/80 bg-emerald-50/70 text-emerald-700",
    neutral: "border-sky-200/80 bg-sky-50/70 text-sky-700",
    warn: "border-amber-200/80 bg-amber-50/70 text-amber-700",
    bad: "border-rose-200/80 bg-rose-50/70 text-rose-700",
  }[tone]

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] opacity-80">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  )
}
