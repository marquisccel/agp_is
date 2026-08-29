"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  Award,
  Check,
  Copy,
  MessageCircle,
  Search,
  Trash2,
  Users,
} from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { fmtKg, fmtRp, fmtTon } from "@/lib/format"
import { hasResolvedSupplierCoordinates, isShortGoogleMapsLink, parseCoordinatesFromMapLink } from "@/lib/supplierLocation"
import { namaGudang } from "@/lib/namaGudang"
import { hitungGradeLapak } from "@/lib/gradeLapak"

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
  const { confirm, dialog } = useConfirm()
  const { toast, host: toastHost } = useToast()
  const router = useRouter()
  const [editingLocationSupplierId, setEditingLocationSupplierId] = useState<string | null>(null)
  const [locationLink, setLocationLink] = useState("")
  const [locationLatitude, setLocationLatitude] = useState("")
  const [locationLongitude, setLocationLongitude] = useState("")
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importCsvText, setImportCsvText] = useState("")
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState("")
  const [importResults, setImportResults] = useState<{ rowNumber: number; nama: string; status: "updated" | "skipped"; message: string }[] | null>(null)
  const inferredLocation =
    locationLatitude === "" && locationLongitude === ""
      ? parseCoordinatesFromMapLink(locationLink)
      : null
  const needsManualLocationCoordinates =
    isShortGoogleMapsLink(locationLink) && !inferredLocation && locationLatitude === "" && locationLongitude === ""

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Hapus data lapak ini?",
      description: "Lapak tidak bisa dihapus jika memiliki riwayat transaksi/kasbon.",
      tone: "danger",
      confirmLabel: "Ya, hapus",
    })
    if (!ok) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/manager/suppliers/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menghapus data lapak")
      }
      // `suppliers` disalin ke state lokal (bukan dibaca langsung dari prop),
      // jadi router.refresh() saja tidak menghapusnya dari tampilan -- state
      // lokalnya juga harus di-update di sini, tidak cukup andalkan re-fetch.
      setSuppliers((current) => current.filter((s) => s.id !== id))
      toast("Data lapak berhasil dihapus.")
      router.refresh()
    } catch (err: any) {
      toast(err.message, "error")
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
        throw new Error("Lapak tidak ditemukan")
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

      const savedSupplier = await res.json()

      setSuppliers((current) =>
        current.map((item) =>
          item.id === editingLocationSupplierId
            ? {
                ...item,
                link: savedSupplier.link,
                latitude: savedSupplier.latitude,
                longitude: savedSupplier.longitude,
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

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true)
    setImportCsvText("")
    setImportError("")
    setImportResults(null)
  }

  const handleCloseImportModal = () => {
    const hadUpdates = !!importResults?.some((r) => r.status === "updated")
    setIsImportModalOpen(false)
    setImporting(false)
    if (hadUpdates) {
      window.location.reload()
    }
  }

  const handleImportFile = async (file: File) => {
    const text = await file.text()
    setImportCsvText(text)
  }

  const handleRunImport = async () => {
    if (!importCsvText.trim()) {
      setImportError("Tempel isi CSV atau pilih berkas terlebih dahulu.")
      return
    }
    setImporting(true)
    setImportError("")
    setImportResults(null)

    try {
      const res = await fetch("/api/manager/suppliers/import-coordinates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importCsvText }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses import koordinat.")
      }
      setImportResults(data.results)
    } catch (error: any) {
      setImportError(error.message || "Gagal memproses import koordinat.")
    } finally {
      setImporting(false)
    }
  }

  /*
   * Rumus gradenya sekarang ada di src/lib/gradeLapak.ts. Sebelumnya
   * ditulis di sini, dan salinan keduanya di Detail Lapak sudah terlanjur
   * memakai bobot yang berbeda -- satu lapak yang sama bisa tampil B di
   * halaman ini dan A di halaman detailnya.
   *
   * Yang tetap di sini cuma penyaringan gudang dan periode, karena itu
   * memang milik halaman ini: pilihan bulan dan gudang di atas layar.
   */
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

    const hasil = hitungGradeLapak(filteredPurchases, supplier.target_bulanan_kg, skuPrices)

    return {
      totalTransactions: hasil.totalTransaksi,
      totalGudangWeight: hasil.totalBeratGudang,
      targetPct: hasil.persenTarget,
      totalSusut: hasil.totalSusut,
      pctSusut: hasil.persenSusut,
      avgPrice: hasil.hargaRataRata,
      warningCount: hasil.jumlahPeringatanHarga,
      opi: hasil.opi,
      grade: hasil.grade,
      gradeLabel: hasil.label,
      gradeTone: hasil.nada,
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
      {dialog}
      {toastHost}
      <section className="section">
        <div className="section-shell-head">
          <div className="min-w-0">
            <p className="section-eyebrow">Lapak intelligence</p>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Kinerja Lapak</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Filter performa berdasarkan gudang, periode, grade, dan kata kunci tanpa kehilangan konteks operasional.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">Tonase periode ini</p>
            <p className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-slate-900">{fmtKg(totalWeightFiltered)}</p>
          </div>
        </div>

        {/* Bentuknya disamakan dengan pita ringkasan di layar lain: satu
            deret menyatu tanpa kotak ikon. Ikonnya tidak menerangkan apa
            pun yang belum ditulis labelnya, tapi memakan sepertiga lebar
            tiap kartu dan membuat keempat angkanya tidak sejajar.

            Keempatnya tetap berfungsi sebagai penyaring; yang aktif
            ditandai latar brand-soft. */}
        <div className="stat-strip" style={{ borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)", boxShadow: "none" }}>
          {filterCards.map((card) => {
            const active = selectedGradeFilter === card.id
            return (
              <button
                key={card.id}
                onClick={() => setSelectedGradeFilter(active ? "all" : card.id)}
                className="stat-tile text-left"
                style={active ? { background: "var(--brand-soft)" } : undefined}
              >
                <span className="stat-label" style={active ? { color: "var(--brand-strong)" } : undefined}>
                  {card.label}
                </span>
                <div className="stat-value-row">
                  <span className="stat-value" style={active ? { color: "var(--brand-strong)" } : undefined}>
                    {card.value}
                  </span>
                </div>
                <span className="stat-delta flat">{card.sub}</span>
              </button>
            )
          })}
        </div>

        <div className="p-5">

          {/* Label penyaringnya dulu berbunyi "Hijau" dan "Merah" -- nama
              warna, bukan artinya -- padahal daftar di bawahnya sudah
              menyebut keadaannya "Aktif"/"Belum aktif". Satu layar, dua
              nama untuk hal yang sama. Warnanya tetap dipakai sebagai
              penanda, tapi kata yang membawa artinya. */}
          {/* Tombol Import Koordinat turun ke baris ini, sebaris dengan
              deret penyaring status. Di kepala kartu ia berdiri sendirian di
              pojok kanan atas, jauh dari apa pun yang berhubungan dengannya,
              sementara ruang di kanan deret penyaring ini melompong. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="segmented inline-flex">
            <button
              onClick={() => setSelectedStatusFilter("all")}
              className={selectedStatusFilter === "all" ? "active" : ""}
            >
              Semua Status
            </button>
            <button
              onClick={() => setSelectedStatusFilter("GREEN")}
              className={selectedStatusFilter === "GREEN" ? "active" : ""}
              style={selectedStatusFilter === "GREEN" ? { color: "var(--success)" } : undefined}
            >
              Aktif ({greenSupplierCount})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("RED")}
              className={selectedStatusFilter === "RED" ? "active" : ""}
              style={selectedStatusFilter === "RED" ? { color: "var(--danger)" } : undefined}
            >
              Belum aktif ({redSupplierCount})
            </button>
          </div>

          <button
            onClick={handleOpenImportModal}
            className="premium-button btn-netral px-4 py-2 text-xs"
          >
            Import Koordinat
          </button>
          </div>
        </div>
      </section>

      <section className="section section-body">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="segmented flex flex-wrap">
            <button
              onClick={() => setSelectedWarehouseId("all")}
              className={selectedWarehouseId === "all" ? "active" : ""}
            >
              Semua Gudang
            </button>
            {warehouses.map((warehouse) => (
              <button
                key={warehouse.id}
                onClick={() => setSelectedWarehouseId(warehouse.id)}
                className={selectedWarehouseId === warehouse.id ? "active" : ""}
              >
                {namaGudang(warehouse.nama)}
              </button>
            ))}
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
                className="field-input field-icon"
              />
            </div>
          </div>
        </div>

        {(selectedGradeFilter !== "all" || selectedStatusFilter !== "all") && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <span>
              Menampilkan <strong className="text-slate-950">{filteredSuppliers.length} lapak</strong> sesuai filter performa.
            </span>
            <button
              onClick={() => {
                setSelectedGradeFilter("all")
                setSelectedStatusFilter("all")
              }}
              className="font-black text-slate-950 hover:text-[color:var(--brand-strong)]"
            >
              Bersihkan filter
            </button>
          </div>
        )}
      </section>

      {filteredSuppliers.length > 0 ? (
        <div
          key={`${selectedWarehouseId}-${selectedGradeFilter}-${selectedStatusFilter}-${selectedMonth}-${selectedYear}-${searchQuery}`}
          /* Satu lapak per baris (permintaan Manager). Dua kolom membuat
             tiap kartu cuma dapat separuh lebar layar, sehingga nama lapak,
             tiga kotak nilai, dan lima tombol aksinya berdesakan -- di
             tangkapan layar yang dikirim, nama gudang dan keterangan
             koordinat bahkan patah ke baris berikutnya. */
          className="grid grid-cols-1 gap-4 soft-enter"
        >
          {filteredSuppliers.map((supplier) => {
            const perf = supplier.performance
            const labelGudang = namaGudang(supplier.warehouse?.nama)
            const targetLabel = supplier.target_bulanan_kg > 0 ? `${Math.min(perf.targetPct, 999).toFixed(0)}% dari target ${fmtTon(supplier.target_bulanan_kg)}` : "Target belum diatur"

            return (
              <article key={supplier.id} className="section section-body">
                {/* Empat pil berjejar di baris nama -- status, grade, dan
                    koordinat -- membuat nama lapaknya sendiri tenggelam.
                    Warnanya kini dibawa satu titik di samping nama, dan
                    keterangannya turun ke baris teks abu di bawahnya:
                    warna untuk memindai, kata untuk memastikan. Grade tetap
                    diberi nada karena ia memang penilaian, tapi cuma lewat
                    warna hurufnya. */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: supplier.transactionStatus === "GREEN" ? "var(--success)" : "var(--danger)" }}
                        aria-hidden="true"
                      />
                      <Link
                        href={`/dashboard/manager/suppliers/${supplier.id}`}
                        className="truncate text-lg font-black tracking-[-0.02em] text-slate-950 hover:text-[color:var(--brand-strong)]"
                      >
                        {supplier.nama}
                      </Link>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
                      <span>{labelGudang}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{supplier.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span style={hasResolvedSupplierCoordinates(supplier) ? undefined : { color: "var(--warning)", fontWeight: 600 }}>
                        {hasResolvedSupplierCoordinates(supplier) ? "Koordinat lengkap" : "Belum ada koordinat"}
                      </span>
                    </div>
                  </div>
                  {/* Grade berdiri sebagai angka keempat di sini, bukan
                      diselipkan di baris keterangan bersama nama gudang dan
                      status. Di baris itu ia satu-satunya yang berwarna,
                      jadi menarik mata lebih dulu daripada nama lapaknya --
                      padahal ia kesimpulan dari ketiga angka di sebelahnya
                      dan paling masuk akal dibaca bersama mereka. */}
                  <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 md:min-w-[340px]">
                    <MiniMetric label="Volume" value={perf.totalGudangWeight > 0 ? fmtKg(perf.totalGudangWeight) : "0 KG"} />
                    <MiniMetric label="Harga Avg" value={perf.avgPrice > 0 ? `${fmtRp(perf.avgPrice)}/KG` : "-"} />
                    <MiniMetric label="Transaksi" value={String(perf.totalTransactions)} />
                    <MiniMetric
                      label="Grade"
                      value={perf.grade === "-" ? "-" : `${perf.grade} (${perf.gradeLabel})`}
                      warna={perf.grade === "-" ? undefined : perf.gradeTone}
                    />
                  </div>
                </div>

                <div
                  className="mt-4 grid gap-px overflow-hidden rounded-[var(--radius-md)] border md:grid-cols-3"
                  style={{ background: "var(--border)", borderColor: "var(--border)" }}
                >
                  <Signal
                    label="Kuantitas"
                    value={targetLabel}
                    tone={perf.totalTransactions === 0 ? "neutral" : perf.targetPct >= 100 ? "good" : perf.targetPct >= 50 ? "neutral" : "warn"}
                  />
                  {/* Lapak tanpa transaksi sebelumnya menampilkan Susut dan
                      Harga berlatar hijau -- susutnya 0 dan pelanggaran
                      harganya 0, jadi rumusnya menyimpulkan "baik". Padahal
                      yang benar bukan baik, melainkan belum ada datanya.
                      Hijau di situ menyesatkan: Manager membaca lapak yang
                      belum pernah bertransaksi seolah sudah lolos evaluasi. */}
                  {/* Susut yang kecil dulu diberi nada "good" alias hijau --
                      padahal susut berapa pun berarti barang yang dibayar
                      tidak sampai utuh di gudang; itu kerugian, bukan
                      prestasi. Hijau hanya benar untuk "lebih". Nol berarti
                      cocok, jadi netral -- sama dengan Analisis Susut. */}
                  <Signal
                    label="Susut"
                    value={perf.totalTransactions > 0 ? (perf.pctSusut === 0 ? "Tidak ada" : `${perf.pctSusut.toFixed(2)}%`) : "Belum ada data"}
                    tone={perf.totalTransactions === 0 || perf.pctSusut === 0 ? "neutral" : perf.pctSusut <= 3 ? "warn" : "bad"}
                  />
                  <Signal
                    label="Harga"
                    value={perf.totalTransactions === 0 ? "Belum ada data" : perf.warningCount > 0 ? `${perf.warningCount} transaksi di atas limit` : "Dalam limit"}
                    tone={perf.totalTransactions === 0 ? "neutral" : perf.warningCount > 0 ? "bad" : "good"}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: "var(--border)" }}>
                  <div className="min-w-0 text-sm">
                    <span className="field-label">Rekening</span>
                    {supplier.nomor_rekening ? (
                      <button
                        onClick={() => handleCopy(supplier.id, supplier.nomor_rekening || "")}
                        className="flex min-w-0 items-center gap-2 text-left font-bold text-slate-800 hover:text-[color:var(--brand-strong)]"
                        title="Salin nomor rekening"
                      >
                        <span className="truncate">{supplier.nama_bank} - {supplier.nomor_rekening}</span>
                        {copiedId === supplier.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-400" />}
                      </button>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--muted-faint)" }}>Belum ada rekening</p>
                    )}
                  </div>

                  {/* Lima tombol dengan empat bentuk berbeda: hijau pekat,
                      netral berikon, ikon telanjang, dan ikon merah. Yang
                      terakhir -- hapus, satu-satunya yang tidak bisa
                      dibatalkan -- justru paling kecil dan paling mudah
                      tersenggol. Sekarang semuanya satu bentuk, dan hapus
                      baru memerah saat disentuh. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/manager/suppliers/${supplier.id}`} className="premium-button btn-netral px-3 py-2 text-xs">
                      Detail
                    </Link>
                    <button
                      onClick={() => handleOpenLocationEditor(supplier)}
                      className="premium-button btn-netral px-3 py-2 text-xs"
                    >
                      Lokasi
                    </button>
                    {/* Dua aksi ini jadi ikon: keduanya jarang dipakai
                        dibanding Detail dan Lokasi, dan sebagai teks
                        keempatnya tampak sama pentingnya. Judulnya tetap
                        ada untuk pembaca layar dan tooltip. */}
                    {supplier.kontak_wa ? (
                      <a
                        href={getWaLink(supplier.kontak_wa)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="premium-button btn-netral grid h-[34px] w-[34px] place-items-center"
                        title="Chat WhatsApp"
                        aria-label={`Chat WhatsApp ${supplier.nama}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      disabled={deletingId === supplier.id}
                      className="premium-button btn-netral tone-danger grid h-[34px] w-[34px] place-items-center disabled:opacity-50"
                      title="Hapus lapak"
                      aria-label={`Hapus lapak ${supplier.nama}`}
                    >
                      {deletingId === supplier.id
                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        : <Trash2 className="h-4 w-4" />}
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
          className="section section-body border-dashed p-12 text-center soft-enter"
        >
          <h4 className="font-bold" style={{ color: "var(--foreground)" }}>Lapak tidak ditemukan</h4>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Tidak ada lapak yang cocok dengan penyaring atau kata kunci pencarian.</p>
        </div>
      )}

      {editingLocationSupplierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[var(--radius-lg)] border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "0 24px 60px -20px rgba(20, 40, 26, 0.28)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--brand-strong)]">Quick edit lokasi</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Perbarui Lokasi Lapak</h3>
                <p className="mt-1 text-sm text-slate-500">Simpan link Maps dan koordinat tanpa meninggalkan daftar lapak.</p>
              </div>
              <button
                onClick={handleCloseLocationEditor}
                className="premium-button btn-netral px-3 py-2 text-sm"
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
                  className="field-input"
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
                  className="field-input"
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
                  className="field-input"
                  placeholder="112.0111"
                />
              </div>
            </div>

            {locationError && (
              <div className="notice tone-warning mt-4 text-sm font-semibold">
                {locationError}
              </div>
            )}

            {inferredLocation && (
              <div className="mt-4 rounded-[var(--radius-md)] border px-4 py-3 text-sm" style={{ borderColor: "var(--brand-soft-strong)", background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <p className="font-semibold">Koordinat terdeteksi otomatis dari link Maps.</p>
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--brand-strong)" }}>
                  Latitude {inferredLocation.latitude}, longitude {inferredLocation.longitude}. Simpan lokasi untuk langsung mengaktifkan preview peta.
                </p>
              </div>
            )}
            {needsManualLocationCoordinates && (
              <div className="mt-4 rounded-[var(--radius-md)] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                Link pendek Google Maps tidak menyimpan koordinat di URL. Isi latitude dan longitude agar preview peta aktif.
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={handleCloseLocationEditor}
                className="premium-button btn-netral px-4 py-3 text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={savingLocation}
                className="premium-button btn-primer rounded-[10px] px-5 py-3 text-sm font-bold disabled:opacity-60"
              >
                {savingLocation ? "Menyimpan..." : "Simpan Lokasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[var(--radius-lg)] border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "0 24px 60px -20px rgba(20, 40, 26, 0.28)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--brand-strong)]">Fase 6 - Kualitas Data</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Import Koordinat Lapak (CSV)</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Kolom wajib: <code className="rounded bg-slate-100 px-1">nama</code>, <code className="rounded bg-slate-100 px-1">gudang</code>.
                  Isi <code className="rounded bg-slate-100 px-1">latitude</code>/<code className="rounded bg-slate-100 px-1">longitude</code> atau{" "}
                  <code className="rounded bg-slate-100 px-1">link</code> Google Maps. Delimiter <code className="rounded bg-slate-100 px-1">;</code> atau{" "}
                  <code className="rounded bg-slate-100 px-1">,</code>. Pencocokan berdasarkan nama lapak persis/mirip di gudang yang disebutkan --
                  baris yang ambigu atau tidak ketemu akan dilewati, bukan ditebak.
                </p>
              </div>
              <button
                onClick={handleCloseImportModal}
                className="premium-button btn-netral px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImportFile(file)
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[color:var(--brand)] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
              />
              <textarea
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                rows={6}
                placeholder={"nama;gudang;latitude;longitude\nPengepul A;Kediri;-7.8;112.0"}
                className="field-input font-mono text-xs"
              />
            </div>

            {importError && (
              <div className="notice tone-warning mt-4 text-sm font-semibold">
                {importError}
              </div>
            )}

            {importResults && (
              <div className="mt-4 max-h-64 overflow-y-auto rounded-[var(--radius-md)] border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.map((r, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{r.rowNumber}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{r.nama}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full px-2 py-0.5 font-black" style={r.status === "updated" ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--bg-tint)", color: "var(--muted)" }}>
                            {r.status === "updated" ? "Diperbarui" : "Dilewati"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={handleCloseImportModal}
                className="premium-button btn-netral px-4 py-3 text-sm"
              >
                {importResults?.some((r) => r.status === "updated") ? "Tutup & Refresh" : "Batal"}
              </button>
              <button
                onClick={handleRunImport}
                disabled={importing}
                className="premium-button btn-primer rounded-[10px] px-5 py-3 text-sm font-bold disabled:opacity-60"
              >
                {importing ? "Memproses..." : "Proses Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniMetric({ label, value, warna }: { label: string; value: string; warna?: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p
        className="mt-1 whitespace-nowrap text-sm font-black tracking-[-0.02em]"
        style={{ fontVariantNumeric: "tabular-nums", color: warna ?? "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * Satu indikator kinerja di kartu lapak.
 *
 * Sebelumnya tiap indikator berupa blok berwarna penuh selebar sepertiga
 * kartu. Tiga blok berjajar itu jadi benda paling berat di kartunya --
 * lebih menarik mata daripada nama lapaknya sendiri -- dan latarnya
 * menyala hijau bahkan untuk lapak yang cuma "belum ada data". Sekarang
 * latarnya rata dan warna hanya dipakai pada angkanya, yaitu satu-satunya
 * bagian yang memang berubah menurut keadaan.
 */
function Signal({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "good" | "neutral" | "warn" | "bad"
}) {
  const warna = {
    good: "var(--success)",
    neutral: "var(--muted)",
    warn: "var(--warning)",
    bad: "var(--danger)",
  }[tone]

  return (
    <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
      <span className="field-label">{label}</span>
      <p className="text-sm font-bold" style={{ color: warna }}>{value}</p>
    </div>
  )
}
