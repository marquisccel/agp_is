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
  Target,
  User,
  Wallet,
  TrendingUp,
  Warehouse as WarehouseIcon,
  ChevronRight,
  Star,
  Award,
  Activity,
  AlertTriangle
} from "lucide-react"
import { fmtKg, fmtRp, fmtTon, fmtPct } from "@/lib/format"
import PageHeader from "@/components/ui/PageHeader"
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

interface SupplierAuditLog {
  id: string
  action: string
  old_data: string | null
  new_data: string | null
  createdAt: string
  user: {
    nama: string
    role: string
  }
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
  auditLogs: SupplierAuditLog[]
}

function safeParseAuditData(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

function resolveAuditStatusLabel(value: unknown) {
  if (value === "GREEN") return "Hijau"
  if (value === "RED") return "Merah"
  return "Belum diketahui"
}

function resolveAuditTriggerLabel(value: unknown) {
  switch (value) {
    case "supervisor_verify_purchase":
      return "Aktif otomatis saat supervisor menyetujui verifikasi"
    case "admin_double_check_purchase":
      return "Aktif otomatis saat admin menyelesaikan double check"
    case "manager_approve_purchase":
      return "Aktif otomatis saat manager menyetujui transaksi"
    case "manager_approve_harga":
      return "Aktif otomatis saat manager menyetujui harga"
    default:
      return null
  }
}

export default function ManagerSupplierDetailsClient({ supplier }: { supplier: Supplier }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"transaksi" | "dp">("transaksi")

  const parsedAuditLogs = supplier.auditLogs.map((log) => {
    const oldData = log.old_data ? safeParseAuditData(log.old_data) : null
    const newData = log.new_data ? safeParseAuditData(log.new_data) : null
    return {
      ...log,
      oldData,
      newData,
    }
  })

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
  const namaBulanIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ][currentMonthNum - 1]

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
  let mStars = 0

  if (mTransactions > 0) {
    mOpi = (mQtyScore * 0.5) + (mQualityScore * 0.5)
    if (mOpi >= 85) {
      mGrade = "A"
      mGradeLabel = "Sangat Bagus"
      mGradeColor = "bg-emerald-50 text-emerald-700 border-emerald-250 border-emerald-200"
      mStars = 3
    } else if (mOpi >= 60) {
      mGrade = "B"
      mGradeLabel = "Bagus/Cukup"
      mGradeColor = "bg-blue-50 text-blue-700 border-blue-200"
      mStars = 2
    } else {
      mGrade = "C"
      mGradeLabel = "Perlu Evaluasi"
      mGradeColor = "bg-rose-50 text-rose-700 border-rose-200"
      mStars = 1
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

  // Status map badges
  const statusMap: Record<string, { label: string; cls: string }> = {
    menunggu_verifikasi_supervisor: { label: "Menunggu Verifikasi Supervisor", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    menunggu_double_cek: { label: "Menunggu Cek", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    menunggu_approval_harga: { label: "Menunggu Approval", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    approved: { label: "Disetujui", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    sudah_transfer: { label: "Sudah Transfer", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-200" },
    dibatalkan: { label: "Dibatalkan", cls: "bg-slate-50 text-slate-500 border-slate-200" }
  }

  const dpStatusMap: Record<string, { label: string; cls: string }> = {
    menunggu_approval_admin: { label: "Menunggu Admin", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    menunggu_approval_manager: { label: "Menunggu Manager", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" }
  }

  const resolvedCoordinates = resolveSupplierCoordinates(supplier)
  const mapHref = getSupplierMapHref({
    ...supplier,
    warehouseName: supplier.warehouse?.nama || null,
  })

  return (
    <div className="premium-workflow space-y-6">
      <PageHeader
        eyebrow="Supplier detail"
        title={`Detail Lapak ${supplier.nama}`}
        description={`Collection Center ${supplier.warehouse?.nama.replace(/^Gudang\s+/i, "") || "CC"}`}
        actions={
          <button
            onClick={() => router.back()}
            className="premium-button flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        }
      />

      {/* Profile & Info Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="workflow-card overflow-hidden p-0 lg:col-span-2">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">Profil lapak</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">{supplier.nama}</h3>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                supplier.transactionStatus === "GREEN"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}>
                {supplier.transactionStatus === "GREEN" ? "Supplier aktif" : "Belum aktif"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Kontak, target, dan jadwal ambilan supplier dalam satu panel.</p>
          </div>

          <div className="grid grid-cols-1 gap-px bg-slate-100 text-sm md:grid-cols-2">
            <div className="bg-white/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Collection Center</span>
              <span className="mt-1 block font-bold text-slate-950">{supplier.warehouse?.nama || "-"}</span>
            </div>
            <div className="bg-white/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Kontak WhatsApp</span>
              <span className="mt-1 block font-bold text-slate-950">{supplier.kontak_wa || "Belum ada kontak"}</span>
            </div>
            <div className="bg-white/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Target Bulanan</span>
              <span className="mt-1 block font-bold text-slate-950">
                {supplier.target_bulanan_kg > 0 ? fmtTon(supplier.target_bulanan_kg) : "-"}
                {supplier.target_bulanan_kg > 0 && (
                  <span className="ml-1 text-xs font-medium text-slate-500">({fmtKg(supplier.target_bulanan_kg)})</span>
                )}
              </span>
            </div>
            <div className="bg-white/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Jadwal Ambilan</span>
              <span className="mt-1 block font-bold text-slate-950">
                {supplier.frekuensi_ambilan_mingguan}x seminggu{supplier.hari_ambilan ? ` (${supplier.hari_ambilan})` : ""}
              </span>
            </div>
            <div className="bg-white/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Koordinat</span>
              <span className="mt-1 block font-bold text-slate-950">
                {resolvedCoordinates
                  ? `${resolvedCoordinates.latitude}, ${resolvedCoordinates.longitude}`
                  : "Belum diisi"}
              </span>
            </div>
            <div className="bg-white/90 p-5">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Sumber Peta</span>
              <span className="mt-1 block font-bold text-slate-950">
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
              className="premium-button flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              Lokasi Maps
            </a>
          </div>
        </div>

        <div className="workflow-card space-y-4 p-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">Rekening</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Informasi Pembayaran</h3>
          </div>
          {supplier.nomor_rekening ? (
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(20,184,166,0.24),transparent_36%)]" />
              <div className="relative space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bank</span>
                  <p className="text-base font-extrabold text-white">{supplier.nama_bank}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nomor Rekening</span>
                  <p className="font-mono text-xl font-bold tracking-tight text-white">{supplier.nomor_rekening}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atas Nama</span>
                  <p className="text-sm font-semibold text-slate-200">{supplier.atas_nama || "-"}</p>
                </div>
                <button
                  onClick={() => handleCopy(supplier.nomor_rekening || "")}
                  className="premium-button flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-xs font-bold text-slate-950 hover:bg-slate-100"
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
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs italic text-slate-500">Data bank belum dilengkapi oleh admin.</p>
            </div>
          )}
        </div>
      </div>

      <div className="workflow-card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">Location preview</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Titik Lapak</h3>
          <p className="mt-1 text-sm text-slate-500">Preview peta akan tampil ketika koordinat sudah diisi. Link Maps tetap tersedia sebagai fallback.</p>
        </div>

        {resolvedCoordinates ? (
          <div className="grid gap-px bg-slate-100 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="bg-white p-3">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
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
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Latitude</span>
                <span className="mt-1 block font-mono text-sm font-bold text-slate-950">{resolvedCoordinates.latitude}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Longitude</span>
                <span className="mt-1 block font-mono text-sm font-bold text-slate-950">{resolvedCoordinates.longitude}</span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Sumber</span>
                <span className="mt-1 block text-sm font-bold text-slate-950">
                  {resolvedCoordinates.source === "manual" ? "Field latitude/longitude" : "Terbaca dari link Maps"}
                </span>
              </div>
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-button flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
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
              className="premium-button mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <MapPin className="h-4 w-4" />
              Buka link Maps
            </a>
          </div>
        )}
      </div>

      <div className="workflow-card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">Status history</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Riwayat Perubahan Status Supplier</h3>
          <p className="mt-1 text-sm text-slate-500">Jejak perubahan manual dan aktivasi otomatis setelah transaksi valid pertama.</p>
        </div>

        {parsedAuditLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {parsedAuditLogs.map((log) => {
              const fromStatus = resolveAuditStatusLabel(log.oldData?.transactionStatus)
              const toStatus = resolveAuditStatusLabel(log.newData?.transactionStatus)
              const trigger = resolveAuditTriggerLabel(log.newData?.trigger)

              return (
                <div key={log.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                        log.action === "SUPPLIER_STATUS_AUTO_GREEN"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}>
                        {log.action === "SUPPLIER_STATUS_AUTO_GREEN" ? "Auto hijau" : "Update manual"}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        {log.user.role}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-slate-950">
                      {log.user.nama} mengubah status dari{" "}
                      <span className="text-slate-500">{fromStatus}</span>{" "}
                      ke{" "}
                      <span className={toStatus === "Hijau" ? "text-emerald-700" : "text-rose-600"}>{toStatus}</span>
                    </p>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      {trigger ? <span>{trigger}</span> : null}
                      {log.newData?.purchaseId ? <span>Trigger transaksi: {String(log.newData.purchaseId).slice(0, 8)}</span> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-800">
                      {new Date(log.createdAt).toLocaleDateString("id-ID", {
                        dateStyle: "medium",
                        timeZone: "Asia/Jakarta",
                      })}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jakarta",
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <Activity className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Belum ada perubahan status tercatat</p>
            <p className="mt-1 text-sm text-slate-500">Riwayat akan muncul saat status supplier diubah manual atau saat supplier otomatis aktif karena transaksi valid.</p>
          </div>
        )}
      </div>
      {/* Monthly Performance Dashboard Card */}
      <div className="workflow-card space-y-5 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">Performance report</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              Rapor Kinerja Bulan Ini
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Evaluasi kinerja berjalan untuk bulan aktif berdasarkan data timbangan lapak vs CC.
            </p>
          </div>
          {mTransactions > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-3 py-1 rounded-xl text-xs font-black border tracking-wide shadow-sm ${mGradeColor}`}>
                Grade {mGrade} ({mGradeLabel})
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < mStars ? "fill-amber-400 text-amber-400 animate-pulse" : "text-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {mTransactions === 0 ? (
          <div className="text-center text-slate-400 text-xs py-8 border border-dashed border-slate-200 rounded-2xl">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold">Belum ada transaksi di bulan ini.</p>
            <p className="mt-0.5">Penilaian performa berjalan akan muncul setelah ada pengiriman yang disetujui bulan ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Indicator 1: Kuantitas (Volume) */}
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  Kuantitas (Volume)
                </span>
                <span className="text-xs font-extrabold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded">
                  Bobot 50%
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-2xl font-black text-slate-950 font-mono">
                  {fmtKg(mGudangWeight)}
                  <span className="text-xs text-slate-405 block font-semibold font-sans mt-0.5">({fmtTon(mGudangWeight)}) dikirim</span>
                </p>
                {supplier.target_bulanan_kg > 0 ? (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          mTargetPct >= 100 ? "bg-emerald-500" : mTargetPct >= 50 ? "bg-cyan-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(mTargetPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Target: {fmtTon(supplier.target_bulanan_kg)}</span>
                      <span className="text-slate-650">{mTargetPct.toFixed(1)}% Tercapai</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-450 italic font-semibold text-slate-400">Target bulanan belum dikonfigurasi.</p>
                )}
              </div>
            </div>

            {/* Indicator 2: Kualitas (Susut Timbangan) */}
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Kualitas (Susut)
                </span>
                <span className="text-xs font-extrabold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded">
                  Bobot 50%
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-2xl font-black text-slate-800 font-mono">
                  {mPctSusut === 0 ? "0%" : `${mPctSusut.toFixed(2)}%`}
                  <span className="text-xs text-slate-405 block font-semibold font-sans mt-0.5">Rerata penyusutan timbangan</span>
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase border ${
                    mPctSusut <= 1.0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : mPctSusut <= 3.0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    Grade {mPctSusut <= 1.0 ? "A - Rendah" : mPctSusut <= 3.0 ? "B - Normal" : "C - Tinggi"}
                  </span>
                  <span className="text-[10px] text-slate-450 font-bold font-mono">({fmtKg(mTotalSusut)} susut)</span>
                </div>
              </div>
            </div>

            {/* Indicator 3: Harga Beli Rata-rata */}
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-violet-600" />
                  Harga Rata-rata
                </span>
                <span className="text-xs font-extrabold text-slate-550 bg-slate-200/50 px-2 py-0.5 rounded text-slate-550">
                  Rerata Beli
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-2xl font-black text-slate-800 font-mono">
                  {fmtRp(mAvgPrice)}
                  <span className="text-xs text-slate-405 block font-semibold font-sans mt-0.5">Per kilogram (Rerata Tertimbang)</span>
                </p>
                <div className="text-[10px] text-slate-450 font-bold flex items-center gap-1 text-slate-500">
                  <span>Frekuensi: <strong>{mTransactions}x pengiriman</strong> disetujui</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 shadow-inner">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Volume</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {fmtKg(totalVolumeKg)}
              <span className="text-[10px] text-slate-400 block font-normal">({fmtTon(totalVolumeKg)})</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Transaksi</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalTransactions} kali</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Nilai Pembelian</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{fmtRp(totalValue)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sisa Saldo DP</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{fmtRp(remainingDp)}</p>
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("transaksi")}
            className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 ${
              activeTab === "transaksi"
                ? "border-cyan-600 text-cyan-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/30"
            }`}
          >
            Riwayat Pembelian ({supplier.purchases.length})
          </button>
          <button
            onClick={() => setActiveTab("dp")}
            className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 ${
              activeTab === "dp"
                ? "border-cyan-600 text-cyan-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/30"
            }`}
          >
            Saldo &amp; Kasbon DP ({supplier.downPayments.length})
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-800 transition-all font-medium"
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
                        const badge = statusMap[p.status_approval] ?? {
                          label: p.status_approval,
                          cls: "bg-slate-50 text-slate-600 border-slate-200"
                        }

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
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="inline-flex gap-2">
                                <Link
                                  href={`/dashboard/manager/purchases/${p.id}`}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg text-xs font-bold transition-all"
                                >
                                  Detail
                                </Link>
                                <Link
                                  href={`/dashboard/manager/edit/${p.id}`}
                                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-lg text-xs font-bold transition-all"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-12 text-center border border-dashed border-slate-200">
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
                        const badge = dpStatusMap[dp.status_approval] ?? {
                          label: dp.status_approval,
                          cls: "bg-slate-50 text-slate-600 border-slate-200"
                        }

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
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-12 text-center border border-dashed border-slate-200">
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
