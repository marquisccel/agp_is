"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  Search,
} from "lucide-react"
import { fmtKg, fmtRp, fmtTon } from "@/lib/format"
import PageHeader from "@/components/ui/PageHeader"
import StatusPill from "@/components/ui/StatusPill"
import { getPurchaseStatus, getDpStatus } from "@/lib/purchaseStatusLabels"
import { getSupplierMapHref, resolveSupplierCoordinates } from "@/lib/supplierLocation"

interface PurchaseItem {
  id: string
  sku_name: string
  spec: string | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

interface Purchase {
  id: string
  nomor_nota: string | null
  createdAt: string
  status_approval: string
  total_nilai_setelah_retur: number | null
  total_nilai_sebelum_retur: number | null
  total_dibayar: number | null
  berat_timbangan_lapak: number | null
  berat_timbangan_gudang: number | null
  staff: {
    nama: string
  }
  warehouse: {
    nama: string
  }
  items: PurchaseItem[]
}

interface DownPayment {
  id: string
  nominal_diajukan: number
  nominal_disetujui: number | null
  dp_used_amount: number
  status_approval: string
  sisa_dp: number | null
  tanggal_permintaan: string
  keterangan: string | null
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
  warehouse: {
    nama: string
  } | null
  purchases: Purchase[]
  downPayments: DownPayment[]
}


export default function ManagerSupplierDetailsClient({ supplier }: { supplier: Supplier }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"transaksi" | "dp">("transaksi")


  // Copy bank info helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // WA Link helper
  const getWaLink = (num: string | null) => {
    if (!num) return "#"
    let clean = num.replace(/\D/g, "")
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1)
    } else if (clean.startsWith("8")) {
      clean = "62" + clean
    }
    return `https://wa.me/${clean}`
  }

  // Calculate stats
  const totalTransactions = supplier.purchases.length
  const totalVolumeKg = supplier.purchases.reduce((sum, p) => {
    const pVolume = p.items.reduce((s, i) => s + (i.berat_final_item || 0), 0)
    return sum + pVolume
  }, 0)
  const totalValue = supplier.purchases.reduce((sum, p) => {
    const val = p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0
    return sum + val
  }, 0)
  const remainingDp = supplier.downPayments
    .filter(dp => dp.status_approval === "approved")
    .reduce((sum, dp) => sum + (dp.sisa_dp || 0), 0)

  // Monthly Performance Calculations
  const now = new Date()
  const currentMonthNum = now.getMonth() + 1
  const currentYearNum = now.getFullYear()
  const thisMonthPurchases = supplier.purchases.filter(p => {
    if (p.status_approval !== "approved" && p.status_approval !== "sudah_transfer") return false
    const pDate = new Date(p.createdAt)
    return (pDate.getUTCMonth() + 1) === currentMonthNum && pDate.getUTCFullYear() === currentYearNum
  })

  const mTransactions = thisMonthPurchases.length
  const mGudangWeight = thisMonthPurchases.reduce((sum, p) => sum + (p.berat_timbangan_gudang || 0), 0)

  let mQtyScore = 0
  let mTargetPct = 0
  if (supplier.target_bulanan_kg > 0) {
    mTargetPct = (mGudangWeight / supplier.target_bulanan_kg) * 100
    mQtyScore = Math.min(mTargetPct, 100)
  } else {
    if (mGudangWeight >= 5000) mQtyScore = 100
    else if (mGudangWeight >= 2000) mQtyScore = 80
    else if (mGudangWeight >= 500) mQtyScore = 60
    else if (mGudangWeight > 0) mQtyScore = 40
    else mQtyScore = 0
  }

  let mTotalSusut = 0
  let mTotalLapakWeight = 0
  thisMonthPurchases.forEach(p => {
    const lapak = p.berat_timbangan_lapak || 0
    const gudang = p.berat_timbangan_gudang || 0
    mTotalLapakWeight += lapak
    const selisih = gudang - lapak
    if (selisih < 0) {
      mTotalSusut += Math.abs(selisih)
    }
  })
  const mPctSusut = mTotalLapakWeight > 0 ? (mTotalSusut / mTotalLapakWeight) * 100 : 0
  let mQualityScore = 100
  if (mTotalLapakWeight > 0) {
    mQualityScore = Math.max(0, 100 - (mPctSusut * 25))
  }

  let mTotalSubtotal = 0
  let mTotalItemWeight = 0
  thisMonthPurchases.forEach(p => {
    p.items.forEach(item => {
      const itemWeight = item.berat_final_item || 0
      const itemSubtotal = item.subtotal || (itemWeight * item.harga_per_kg) || 0
      mTotalSubtotal += itemSubtotal
      mTotalItemWeight += itemWeight
    })
  })
  const mAvgPrice = mTotalItemWeight > 0 ? mTotalSubtotal / mTotalItemWeight : 0

  let mOpi = 0
  let mGrade = "-"
  let mGradeLabel = "Belum Ada Data"
  let mGradeColor = "bg-slate-50 text-slate-400 border-slate-200"

  if (mTransactions > 0) {
    mOpi = (mQtyScore * 0.5) + (mQualityScore * 0.5)
    if (mOpi >= 85) {
      mGrade = "A"
      mGradeLabel = "Sangat Bagus"
      mGradeColor = "bg-emerald-50 text-emerald-700"
    } else if (mOpi >= 60) {
      mGrade = "B"
      mGradeLabel = "Bagus/Cukup"
      mGradeColor = "bg-[color:var(--bg-tint)] text-[color:var(--muted)]"
    } else {
      mGrade = "C"
      mGradeLabel = "Perlu Evaluasi"
      mGradeColor = "bg-rose-50 text-rose-700"
    }
  }


  // Filtered purchases
  const filteredPurchases = supplier.purchases.filter(p => {
    const query = searchQuery.toLowerCase()
    return (
      (p.nomor_nota && p.nomor_nota.toLowerCase().includes(query)) ||
      p.id.toLowerCase().includes(query) ||
      p.warehouse.nama.toLowerCase().includes(query) ||
      p.staff.nama.toLowerCase().includes(query)
    )
  })

  const resolvedCoordinates = resolveSupplierCoordinates(supplier)
  const mapHref = getSupplierMapHref({
    ...supplier,
    warehouseName: supplier.warehouse?.nama || null,
  })

  return (
    <div className="premium-workflow space-y-6">
      <PageHeader
        eyebrow="Profil lapak"
        title={`Detail Lapak ${supplier.nama}`}
        description={`Collection Center ${supplier.warehouse?.nama.replace(/^Gudang\s+/i, "") || "CC"}`}
        actions={
          <button
            onClick={() => router.back()}
            className="premium-button btn-netral flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        }
      />

      {/* Profile & Info Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="section overflow-hidden lg:col-span-2">
          <div className="section-shell-head">
            <div>
            <p className="section-eyebrow">Profil lapak</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>{supplier.nama}</h3>
              <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: supplier.transactionStatus === "GREEN" ? "var(--success)" : "var(--danger)" }}
                  aria-hidden="true"
                />
                {supplier.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Kontak, target, dan jadwal ambilan lapak dalam satu tempat.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px text-sm md:grid-cols-2" style={{ background: "var(--border)" }}>
            <div className="p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Collection Center</span>
              <span className="block font-bold" style={{ color: "var(--foreground)" }}>{supplier.warehouse?.nama || "-"}</span>
            </div>
            <div className="p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Kontak WhatsApp</span>
              <span className="block font-bold" style={{ color: "var(--foreground)" }}>{supplier.kontak_wa || "Belum ada kontak"}</span>
            </div>
            <div className="p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Target Bulanan</span>
              <span className="block font-bold" style={{ color: "var(--foreground)" }}>
                {supplier.target_bulanan_kg > 0 ? fmtTon(supplier.target_bulanan_kg) : "-"}
                {supplier.target_bulanan_kg > 0 && (
                  <span className="ml-1 text-xs font-medium text-slate-500">({fmtKg(supplier.target_bulanan_kg)})</span>
                )}
              </span>
            </div>
            <div className="p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Jadwal Ambilan</span>
              <span className="block font-bold" style={{ color: "var(--foreground)" }}>
                {supplier.frekuensi_ambilan_mingguan}x seminggu{supplier.hari_ambilan ? ` (${supplier.hari_ambilan})` : ""}
              </span>
            </div>
            <div className="p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Koordinat</span>
              <span className="block font-bold" style={{ color: "var(--foreground)" }}>
                {resolvedCoordinates
                  ? `${resolvedCoordinates.latitude}, ${resolvedCoordinates.longitude}`
                  : "Belum diisi"}
              </span>
            </div>
            <div className="p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Sumber Peta</span>
              <span className="block font-bold" style={{ color: "var(--foreground)" }}>
                {resolvedCoordinates?.source === "manual"
                  ? "Koordinat GPS"
                  : resolvedCoordinates?.source === "link"
                    ? "Koordinat terdeteksi dari link"
                    : supplier.link
                      ? "Link Google Maps"
                      : "Belum ada lokasi"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-6 py-5">
            {supplier.kontak_wa ? (
              <a
                href={getWaLink(supplier.kontak_wa)}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-button flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                Chat WhatsApp
              </a>
            ) : (
              <button disabled className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-400">
                <MessageCircle className="h-4 w-4 shrink-0" />
                Tidak Ada Kontak WA
              </button>
            )}

            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="premium-button btn-netral flex items-center justify-center gap-1.5 px-4 py-2 text-xs"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              Lokasi Maps
            </a>
          </div>
        </div>

        <div className="section section-body space-y-4">
          <div>
            <p className="section-eyebrow">Rekening</p>
            <h3 className="mt-1 text-base font-bold" style={{ color: "var(--foreground)" }}>Informasi Pembayaran</h3>
          </div>
          {supplier.nomor_rekening ? (
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] p-5 text-white" style={{ background: "var(--brand-strong)" }}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_38%)]" />
              <div className="relative space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Bank</span>
                  <p className="text-base font-extrabold text-white">{supplier.nama_bank}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Nomor Rekening</span>
                  <p className="font-mono text-xl font-bold tracking-tight text-white">{supplier.nomor_rekening}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Atas Nama</span>
                  <p className="text-sm font-semibold text-white/90">{supplier.atas_nama || "-"}</p>
                </div>
                <button
                  onClick={() => handleCopy(supplier.nomor_rekening || "")}
                  className="premium-button flex w-full items-center justify-center gap-2 rounded-[10px] bg-white py-2.5 text-xs font-bold hover:bg-slate-100" style={{ color: "var(--brand-strong)" }}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Berhasil Disalin
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      Salin Nomor Rekening
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs italic text-slate-500">Data bank belum dilengkapi oleh admin.</p>
            </div>
          )}
        </div>
      </div>

      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <p className="section-eyebrow">Lokasi</p>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Titik Lapak</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Peta muncul begitu koordinatnya diisi. Tautan Maps tetap bisa dipakai.</p>
          </div>
        </div>

        {resolvedCoordinates ? (
          <div className="grid gap-px bg-slate-100 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="bg-white p-3">
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-slate-50">
                <iframe
                  title={`Peta ${supplier.nama}`}
                  src={`https://maps.google.com/maps?q=${resolvedCoordinates.latitude},${resolvedCoordinates.longitude}&z=15&output=embed`}
                  className="h-[320px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
            <div className="space-y-4 bg-white p-6">
              <div>
                <span className="field-label">Latitude</span>
                <span className="mt-1 block font-mono text-sm font-bold text-slate-950">{resolvedCoordinates.latitude}</span>
              </div>
              <div>
                <span className="field-label">Longitude</span>
                <span className="mt-1 block font-mono text-sm font-bold text-slate-950">{resolvedCoordinates.longitude}</span>
              </div>
              <div>
                <span className="field-label">Sumber</span>
                <span className="mt-1 block text-sm font-bold text-slate-950">
                  {resolvedCoordinates.source === "manual" ? "Field latitude/longitude" : "Terbaca dari link Maps"}
                </span>
              </div>
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-button btn-primer flex items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-sm font-bold"
              >
                <MapPin className="h-4 w-4" />
                Buka di Google Maps
              </a>
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Koordinat belum tersedia</p>
            <p className="mt-1 text-sm text-slate-500">Isi `latitude` dan `longitude`, atau gunakan link Maps yang menyimpan koordinat agar preview peta langsung tampil di sini.</p>
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="premium-button btn-netral mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <MapPin className="h-4 w-4" />
              Buka link Maps
            </a>
          </div>
        )}
      </div>

      {/* Rapor kinerja bulan berjalan */}
      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Rapor bulan ini</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Kinerja Lapak</h3>
          </div>
          {/* Tiga bintang berdenyut di samping grade dulu mengulang hal yang
              sama dengan huruf gradenya, cuma dalam bentuk lain -- dan
              denyutnya menarik mata ke keterangan yang paling sedikit
              artinya di layar ini. */}
          {mTransactions > 0 && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${mGradeColor}`}>
              Grade {mGrade} &mdash; {mGradeLabel}
            </span>
          )}
        </div>

        {mTransactions === 0 ? (
          <div className="section-body text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Belum ada transaksi bulan ini.</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Penilaiannya muncul setelah ada pengiriman yang disetujui.
            </p>
          </div>
        ) : (
          <div className="grid gap-px md:grid-cols-3" style={{ background: "var(--border)" }}>
            {/* Barang masuk */}
            <div className="space-y-3 p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Barang masuk</span>
              <p className="font-mono text-2xl font-black" style={{ color: "var(--foreground)" }}>{fmtKg(mGudangWeight)}</p>
              {supplier.target_bulanan_kg > 0 ? (
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(mTargetPct, 100)}%`,
                        background: mTargetPct >= 100 ? "var(--success)" : mTargetPct >= 50 ? "var(--brand)" : "var(--warning)",
                      }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {mTargetPct.toFixed(0)}% dari target {fmtTon(supplier.target_bulanan_kg)}
                  </p>
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: "var(--muted-faint)" }}>Target bulanan belum diatur.</p>
              )}
            </div>

            {/* Susut timbangan. Kartu ini dulu memuat grade keduanya
                ("Grade A - Rendah") di dalam kartu yang kepalanya sudah
                memuat grade keseluruhan -- dua huruf grade untuk dua hal
                berbeda, berdampingan, tanpa penjelasan bedanya. */}
            <div className="space-y-3 p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Susut timbangan</span>
              <p
                className="font-mono text-2xl font-black"
                style={{ color: mTotalSusut > 0 ? "var(--danger)" : "var(--foreground)" }}
              >
                {mPctSusut === 0 ? "0%" : `${mPctSusut.toFixed(2)}%`}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {mTotalSusut > 0 ? `${fmtKg(mTotalSusut)} menyusut di gudang` : "Tidak ada selisih timbangan"}
              </p>
            </div>

            {/* Harga rata-rata */}
            <div className="space-y-3 p-5" style={{ background: "var(--surface)" }}>
              <span className="field-label">Harga rata-rata per kg</span>
              <p className="font-mono text-2xl font-black" style={{ color: "var(--foreground)" }}>{fmtRp(mAvgPrice)}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Dari {mTransactions} pengiriman yang disetujui bulan ini
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Ringkasan sepanjang waktu.

          Empat kartu ini dulu masing-masing membawa kotak ikon berwarna di
          sebelah kiri angkanya. Ikonnya tidak menerangkan apa pun yang
          belum ditulis labelnya, tapi memakan sepertiga lebar kartu dan
          membuat keempat angkanya tidak sejajar. Bentuknya kini sama
          dengan baris ringkasan di dashboard Manager. */}
      <div className="section overflow-hidden">
      <div className="stat-strip" style={{ borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)", boxShadow: "none" }}>
        <div className="stat-tile">
          <span className="stat-label">Total Volume</span>
          <div className="stat-value-row">
            <span className="stat-value font-mono">{fmtKg(totalVolumeKg)}</span>
          </div>
          <span className="stat-delta flat">{fmtTon(totalVolumeKg)}</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Total Transaksi</span>
          <div className="stat-value-row">
            <span className="stat-value font-mono">{totalTransactions}</span>
            <span className="stat-unit">kali</span>
          </div>
          <span className="stat-delta flat">Sejak lapak terdaftar</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Nilai Pembelian</span>
          <div className="stat-value-row">
            <span className="stat-value font-mono">{fmtRp(totalValue)}</span>
          </div>
          <span className="stat-delta flat">Sudah dibayar ke lapak</span>
        </div>

        {/* Saldo kasbon yang masih tersisa adalah uang yang sudah keluar
            tapi belum jadi barang -- nadanya perhatian, sama seperti di
            Rekap DP. Nol berarti tidak ada yang menggantung, jadi netral. */}
        <div className={`stat-tile${remainingDp > 0 ? " tone-warning" : ""}`}>
          <span className="stat-label">Sisa Saldo Kasbon</span>
          <div className="stat-value-row">
            <span className="stat-value font-mono">{fmtRp(remainingDp)}</span>
          </div>
          <span className="stat-delta flat">
            {remainingDp > 0 ? "Belum dipakai di nota mana pun" : "Tidak ada saldo menggantung"}
          </span>
        </div>
      </div>

      {/* Tab langsung menempel di bawah pita ringkasan, dalam kartu yang
          sama. */}
        <div className="flex border-b" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}>
          <button
            onClick={() => setActiveTab("transaksi")}
            className={`flex-1 border-b-2 py-4 text-center text-sm font-bold transition-all ${
              activeTab === "transaksi"
                ? "border-[color:var(--brand)] bg-white text-[color:var(--brand-strong)]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Riwayat Pembelian ({supplier.purchases.length})
          </button>
          <button
            onClick={() => setActiveTab("dp")}
            className={`flex-1 border-b-2 py-4 text-center text-sm font-bold transition-all ${
              activeTab === "dp"
                ? "border-[color:var(--brand)] bg-white text-[color:var(--brand-strong)]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Saldo DP ({supplier.downPayments.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === "transaksi" ? (
            <div className="space-y-4">
              {/* Search Purchases */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari transaksi (No. Nota, CC, Staff)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft-strong)] focus:bg-white text-slate-800 transition-all font-medium"
                />
              </div>

              {filteredPurchases.length > 0 ? (
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Tanggal / Waktu</th>
                        <th className="px-6 py-4">Nomor Nota / Draft</th>
                        <th className="px-6 py-4">Gudang / CC</th>
                        <th className="px-6 py-4 text-right">Berat Final</th>
                        <th className="px-6 py-4 text-right">Total Bayar</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredPurchases.map(p => {
                        const totalBerat = p.items.reduce((s, i) => s + (i.berat_final_item || 0), 0)
                        const totalNilai = p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0
                        const badge = getPurchaseStatus(p.status_approval)

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {new Date(p.createdAt).toLocaleDateString("id-ID", {
                                  dateStyle: "medium",
                                  timeZone: "Asia/Jakarta"
                                })}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {new Date(p.createdAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700">
                              {p.nomor_nota || `#${p.id.split("-")[0]}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700">
                              {p.warehouse.nama}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-slate-800">
                              {totalBerat.toFixed(1)} KG
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                              {fmtRp(totalNilai)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusPill label={badge.label} tone={badge.tone} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="inline-flex gap-2">
                                {/* Dua tombol yang berdampingan dulu memakai
                                    dua warna berbeda tanpa ada bedanya
                                    tingkat kepentingan; keduanya sama-sama
                                    aksi pendamping. */}
                                <Link href={`/dashboard/manager/purchases/${p.id}`} className="btn-netral premium-button px-3 py-1.5 text-xs">
                                  Detail
                                </Link>
                                {p.status_approval !== "sudah_transfer" && (
                                  <Link href={`/dashboard/manager/edit/${p.id}`} className="btn-netral premium-button px-3 py-1.5 text-xs">
                                    Edit
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-[var(--radius-md)] p-12 text-center border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs">Tidak ada riwayat pembelian untuk lapak ini.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {supplier.downPayments.length > 0 ? (
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Tanggal Diajukan</th>
                        <th className="px-6 py-4">Keterangan</th>
                        <th className="px-6 py-4 text-right">Diajukan</th>
                        <th className="px-6 py-4 text-right">Disetujui</th>
                        <th className="px-6 py-4 text-right">Terpakai</th>
                        <th className="px-6 py-4 text-right">Sisa DP</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {supplier.downPayments.map(dp => {
                        const badge = getDpStatus(dp.status_approval)

                        return (
                          <tr key={dp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900">
                                {new Date(dp.tanggal_permintaan).toLocaleDateString("id-ID", {
                                  dateStyle: "medium",
                                  timeZone: "Asia/Jakarta"
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">
                              {dp.keterangan || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-slate-600">
                              {fmtRp(dp.nominal_diajukan)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-semibold text-slate-700">
                              {dp.nominal_disetujui ? fmtRp(dp.nominal_disetujui) : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-slate-600">
                              {fmtRp(dp.dp_used_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-slate-800">
                              {dp.sisa_dp !== null ? fmtRp(dp.sisa_dp) : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusPill label={badge.label} tone={badge.tone} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-[var(--radius-md)] p-12 text-center border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs">Tidak ada riwayat pengajuan DP/kasbon untuk lapak ini.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
