"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Info,
  Scale,
  Shield,
  Tag,
  User,
  XCircle,
  AlertCircle,
  Activity,
  Image as ImageIcon
} from "lucide-react"
import { fmtKg, fmtRp } from "@/lib/format"
import PageHeader from "@/components/ui/PageHeader"

interface PurchaseItem {
  id: string
  sku_name: string
  spec: string | null
  berat_lapak: number | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

interface ReturItem {
  id: string
  sku_name: string
  berat_retur: number
  potongan_nilai: number
  alasan: string | null
}

interface Purchase {
  id: string
  nomor_nota: string | null
  tanggal: string
  createdAt: string
  updatedAt: string
  status_approval: string
  rejection_reason: string | null
  bukti_transfer: string | null
  tanggal_transfer: string | null
  metode_pembayaran_terpilih: string | null
  
  berat_timbangan_lapak: number | null
  berat_timbangan_gudang: number | null
  berat_final: number | null

  total_nilai_sebelum_retur: number | null
  total_potongan_retur: number | null
  total_nilai_setelah_retur: number | null
  
  potongan_sampah: number | null
  berat_potongan_sampah: number | null
  harga_potongan_sampah: number | null
  
  potongan_susut: number | null
  berat_potongan_susut: number | null
  harga_potongan_susut: number | null
  
  potongan_air: number | null
  berat_potongan_air: number | null
  harga_potongan_air: number | null
  
  potongan_karung: number | null
  berat_potongan_karung: number | null
  harga_potongan_karung: number | null
  
  dp_yang_digunakan: number | null
  total_dibayar: number | null
  persentase_pembayaran: number | null
  nominal_pembayaran_awal: number | null
  nominal_belum_lunas: number | null
  status_pelunasan: string | null

  supplier: {
    id: string
    nama: string
    nama_bank: string | null
    nomor_rekening: string | null
    atas_nama: string | null
  }
  staff: {
    nama: string
  }
  admin: {
    nama: string
  } | null
  manager: {
    nama: string
  } | null
  warehouse: {
    nama: string
  }
  items: PurchaseItem[]
  returs: ReturItem[]
}

interface AuditLog {
  id: string
  action: string
  createdAt: string
  user: {
    nama: string
    role: string
    email: string
  }
}

interface SkuPriceStandard {
  sku_name: string
  max_price_per_kg: number
}

export default function ManagerPurchaseDetailClient({
  purchase,
  auditLogs,
  skuPrices
}: {
  purchase: Purchase
  auditLogs: AuditLog[]
  skuPrices: SkuPriceStandard[]
}) {
  const router = useRouter()
  const [showProof, setShowProof] = useState(false)

  // Status mapping
  const statusMap: Record<string, { label: string; cls: string; desc: string }> = {
    menunggu_verifikasi_supervisor: {
      label: "Menunggu Verifikasi Supervisor",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      desc: "Menunggu verifikasi penerimaan barang dari Supervisor gudang."
    },
    menunggu_double_cek: {
      label: "Menunggu Cek",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      desc: "Menunggu pemeriksaan ulang (double check) dari Admin."
    },
    menunggu_approval_harga: {
      label: "Menunggu Approval",
      cls: "bg-orange-50 text-orange-700 border-orange-200",
      desc: "Menunggu persetujuan harga dari Manager."
    },
    approved: {
      label: "Disetujui",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      desc: "Telah disetujui manager. Menunggu transfer pembayaran dari Admin."
    },
    sudah_transfer: {
      label: "Sudah Transfer",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      desc: "Pembayaran telah ditransfer oleh Admin ke rekening supplier."
    },
    rejected: {
      label: "Ditolak",
      cls: "bg-red-50 text-red-700 border-red-200",
      desc: "Transaksi ditolak oleh Manager / Admin."
    },
    dibatalkan: {
      label: "Dibatalkan",
      cls: "bg-slate-50 text-slate-500 border-slate-200",
      desc: "Transaksi dibatalkan."
    }
  }

  const s = statusMap[purchase.status_approval] || {
    label: purchase.status_approval,
    cls: "bg-slate-50 text-slate-600 border-slate-200",
    desc: ""
  }

  // Calculate stats
  const totalWeightLapak = purchase.items.reduce((sum, item) => sum + (item.berat_lapak || item.berat_final_item || 0), 0)
  const totalWeightGudang = purchase.items.reduce((sum, item) => sum + (item.berat_final_item || 0), 0)
  const weightDiff = totalWeightGudang - totalWeightLapak

  // Check limits
  const isItemOverLimit = (itemName: string, price: number) => {
    const standard = skuPrices.find(p => p.sku_name === itemName)
    return standard ? price > standard.max_price_per_kg : false
  }

  const getSkuMaxPrice = (itemName: string) => {
    const standard = skuPrices.find(p => p.sku_name === itemName)
    return standard ? standard.max_price_per_kg : 0
  }

  // Render method label
  const methodLabel = purchase.metode_pembayaran_terpilih === "TIMBANGAN_GUDANG" ? "Timbangan Gudang (CC)" : "Timbangan Lapak (Supplier)"
  const netValue = purchase.total_nilai_setelah_retur || purchase.total_dibayar || 0
  const payableValue = purchase.total_dibayar || netValue
  const initialPayment = purchase.nominal_pembayaran_awal ?? payableValue
  const remainingPayment = purchase.nominal_belum_lunas || 0
  const paymentPercent = purchase.persentase_pembayaran ?? (remainingPayment > 0 && payableValue > 0 ? Math.round((initialPayment / payableValue) * 100) : 100)
  const isTransferred = purchase.status_approval === "sudah_transfer"
  const hasOpenTermin = purchase.status_pelunasan === "BELUM_LUNAS" && remainingPayment > 0
  const isPendingTermin = isTransferred && hasOpenTermin
  const displayedPaymentPercent = !isTransferred ? 0 : isPendingTermin ? paymentPercent : 100
  const paymentStatusLabel = !isTransferred ? "Menunggu Transfer" : isPendingTermin ? "Termin Belum Lunas" : "Sudah Transfer"
  const paymentStatusClass = isPendingTermin
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : isTransferred
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-600"
  const paymentAuditLogs = auditLogs.filter(log =>
    ["UPLOAD_TRANSFER_PROOF", "REPLACE_TRANSFER_PROOF", "SETTLE_TERMIN"].includes(log.action)
  )

  return (
    <div className="premium-workflow space-y-6">
      <PageHeader
        eyebrow="Transaction detail"
        title={`Transaksi ${purchase.nomor_nota || `#${purchase.id.split("-")[0]}`}`}
        description={
          <>
            <span className="font-semibold text-slate-700">{purchase.warehouse.nama}</span>
            {" · "}
            <span className="font-semibold text-slate-700">
              {new Date(purchase.tanggal).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" })}
            </span>
          </>
        }
        actions={
          <>
          <Link href={`/dashboard/manager/edit/${purchase.id}`}>
            <button className="premium-button rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Edit Transaksi
            </button>
          </Link>
          <button
            onClick={() => router.back()}
            className="premium-button flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          </>
        }
      />

      {/* Alert status description */}
      <div className={`p-4 rounded-xl border flex gap-3 items-start ${s.cls}`}>
        {purchase.status_approval === "rejected" ? (
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : purchase.status_approval === "approved" || purchase.status_approval === "sudah_transfer" ? (
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div>
          <h4 className="font-bold text-sm">Status: {s.label}</h4>
          <p className="text-xs opacity-90 mt-0.5">{s.desc}</p>
          {purchase.status_approval === "rejected" && purchase.rejection_reason && (
            <div className="mt-2 bg-white/50 p-2.5 rounded-lg border border-red-200/50 text-xs">
              <span className="font-bold">Alasan Penolakan:</span> {purchase.rejection_reason}
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2 Column - Left Main Info, Right Summary and Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Lapak Info, Items Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Info */}
          <div className="workflow-card grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Mitra Lapak (Supplier)
              </h3>
              <Link
                href={`/dashboard/manager/suppliers/${purchase.supplier.id}`}
                className="font-bold text-slate-800 text-base hover:text-cyan-600 transition-colors block"
              >
                {purchase.supplier.nama}
              </Link>
              <span className="text-xs text-slate-400 mt-1 block">ID Supplier: {purchase.supplier.id.split("-")[0]}</span>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Informasi Pembayaran
              </h3>
              {purchase.supplier.nomor_rekening ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    Bank: <span className="font-bold text-slate-800">{purchase.supplier.nama_bank}</span>
                  </p>
                  <p>
                    No. Rekening: <span className="font-mono font-bold text-slate-800">{purchase.supplier.nomor_rekening}</span>
                  </p>
                  <p>
                    Atas Nama: <span className="font-semibold text-slate-700">{purchase.supplier.atas_nama || "—"}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Informasi rekening bank belum diisi.</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="workflow-card space-y-4 p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-600" />
              Rincian Item (SKU)
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Nama SKU / Spec</th>
                    <th className="px-4 py-3 text-right">Lapak (kg)</th>
                    <th className="px-4 py-3 text-right">Gudang (kg)</th>
                    <th className="px-4 py-3 text-right">Selisih</th>
                    <th className="px-4 py-3 text-right">Harga/kg</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchase.items.map(item => {
                    const lWeight = item.berat_lapak ?? item.berat_final_item ?? 0
                    const gWeight = item.berat_final_item ?? 0
                    const diff = gWeight - lWeight
                    const isOver = isItemOverLimit(item.sku_name, item.harga_per_kg)
                    const maxP = getSkuMaxPrice(item.sku_name)

                    return (
                      <tr key={item.id} className={isOver ? "bg-orange-50/20" : "bg-white hover:bg-slate-50/30"}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{item.sku_name}</div>
                          {item.spec && (
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${item.spec === "Grading" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {item.spec}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{lWeight.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{gWeight.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right">
                          {diff === 0 ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-100">Sesuai</span>
                          ) : (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${diff < 0 ? "text-rose-600 bg-rose-50 border-rose-100" : "text-cyan-600 bg-cyan-50 border-cyan-100"}`}>
                              {diff < 0 ? diff.toFixed(1) : `+${diff.toFixed(1)}`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-mono font-semibold ${isOver ? "text-orange-600" : "text-slate-700"}`}>
                            {fmtRp(item.harga_per_kg)}
                          </div>
                          {isOver && (
                            <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold block text-right mt-0.5">
                              Standard: {fmtRp(maxP)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          {fmtRp(item.subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Timbangan Comparison */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Timbangan Lapak</span>
                <p className="font-mono font-bold text-slate-700 mt-1">{totalWeightLapak.toFixed(1)} KG</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Timbangan Gudang</span>
                <p className="font-mono font-bold text-slate-800 mt-1">{totalWeightGudang.toFixed(1)} KG</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Selisih Timbangan</span>
                <p className={`font-mono font-bold mt-1 ${weightDiff === 0 ? "text-emerald-600" : weightDiff < 0 ? "text-rose-600" : "text-cyan-600"}`}>
                  {weightDiff > 0 ? `+${weightDiff.toFixed(1)}` : weightDiff.toFixed(1)} KG
                </p>
              </div>
            </div>
          </div>

          {/* Retur Items List if Any */}
          {purchase.returs.length > 0 && (
            <div className="workflow-card space-y-4 p-6">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Retur Barang (Pengembalian)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-rose-100">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-rose-50/40 text-xs uppercase text-slate-500 font-semibold border-b border-rose-100">
                    <tr>
                      <th className="px-4 py-3">Nama SKU</th>
                      <th className="px-4 py-3 text-right">Berat Retur (kg)</th>
                      <th className="px-4 py-3 text-right">Potongan Nilai</th>
                      <th className="px-4 py-3">Alasan Retur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50/50 bg-white">
                    {purchase.returs.map(ret => (
                      <tr key={ret.id} className="hover:bg-rose-50/10">
                        <td className="px-4 py-3 font-bold text-slate-800">{ret.sku_name}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">{ret.berat_retur.toFixed(1)} KG</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">-{fmtRp(ret.potongan_nilai)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{ret.alasan || "Tidak ada keterangan"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Financial Summary, Transaction actors, Audit logs */}
        <div className="space-y-6">
          {/* Payment Control */}
          <div className="interactive-surface overflow-hidden border border-slate-200/80 bg-white p-0">
            <div className="bg-slate-950 p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Payment control</p>
                  <h3 className="mt-1 text-lg font-black">{paymentStatusLabel}</h3>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${paymentStatusClass}`}>
                  {displayedPaymentPercent}%
                </span>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isPendingTermin ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(100, Math.max(0, displayedPaymentPercent))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-100 text-xs md:grid-cols-2">
              <PaymentMetric label="Total Tagihan" value={fmtRp(payableValue)} />
              <PaymentMetric label="Dibayar Awal" value={fmtRp(initialPayment)} />
              <PaymentMetric label="Sisa Termin" value={fmtRp(remainingPayment)} tone={isPendingTermin ? "amber" : "slate"} />
              <PaymentMetric label="Tanggal Transfer" value={purchase.tanggal_transfer ? new Date(purchase.tanggal_transfer).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }) : "-"} />
            </div>

            <div className="border-t border-slate-100 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-900">Bukti transfer</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {purchase.bukti_transfer ? "Bukti pembayaran sudah tersimpan." : "Belum ada bukti transfer yang diunggah."}
                  </p>
                </div>
                {purchase.bukti_transfer ? (
                  <button
                    onClick={() => setShowProof(!showProof)}
                    className="premium-button rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    {showProof ? "Tutup" : "Lihat bukti"}
                  </button>
                ) : (
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
                    Pending
                  </span>
                )}
              </div>
              {showProof && purchase.bukti_transfer && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={purchase.bukti_transfer} alt="Bukti Transfer" className="max-h-96 w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <DollarSign className="w-4 h-4 text-cyan-600" />
              Kalkulasi Keuangan
            </h3>
            
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Nilai Sebelum Potongan</span>
                <span className="font-semibold text-slate-800 font-mono">{fmtRp(purchase.total_nilai_sebelum_retur || 0)}</span>
              </div>

              {/* Deductions breakdown */}
              {(purchase.potongan_sampah || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Potongan Sampah ({purchase.berat_potongan_sampah || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_sampah || 0)}</span>
                </div>
              )}
              {(purchase.potongan_susut || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Potongan Susut ({purchase.berat_potongan_susut || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_susut || 0)}</span>
                </div>
              )}
              {(purchase.potongan_air || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Potongan Air ({purchase.berat_potongan_air || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_air || 0)}</span>
                </div>
              )}
              {(purchase.potongan_karung || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Potongan Karung ({purchase.berat_potongan_karung || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_karung || 0)}</span>
                </div>
              )}
              {(purchase.total_potongan_retur || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Potongan Retur Barang</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.total_potongan_retur || 0)}</span>
                </div>
              )}
              
              <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold">
                <span>Nilai Bersih Setelah Potongan</span>
                <span className="font-mono text-slate-800">{fmtRp(purchase.total_nilai_setelah_retur || 0)}</span>
              </div>

              {(purchase.dp_yang_digunakan || 0) > 0 && (
                <div className="flex justify-between text-indigo-600">
                  <span>Potongan Saldo DP/Kasbon</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.dp_yang_digunakan || 0)}</span>
                </div>
              )}

              <div className="border-t-2 border-dashed border-slate-200 pt-3 flex justify-between text-sm font-extrabold text-slate-800">
                <span>Grand Total Dibayar</span>
                <span className="font-mono text-cyan-600 text-base">{fmtRp(purchase.total_dibayar || 0)}</span>
              </div>
            </div>

            {/* Payment Percentage Details */}
            {(purchase.persentase_pembayaran !== null || remainingPayment > 0) && (
              <div className={`${isPendingTermin ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"} border rounded-xl p-3 text-xs space-y-1 text-slate-700`}>
                <div className="flex justify-between font-semibold">
                  <span>Skema Pembayaran</span>
                  <span className={isPendingTermin ? "text-amber-800" : "text-emerald-700"}>{paymentPercent}% Awal</span>
                </div>
                <div className="flex justify-between">
                  <span>Dibayar Awal</span>
                  <span className="font-mono">{fmtRp(initialPayment)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Sisa Belum Lunas</span>
                  <span className={`font-mono ${isPendingTermin ? "text-rose-600" : "text-emerald-600"}`}>{fmtRp(remainingPayment)}</span>
                </div>
                <div className={`flex justify-between pt-1 border-t ${isPendingTermin ? "border-amber-200/50" : "border-emerald-200/50"}`}>
                  <span>Status Pelunasan</span>
                  <span className={`font-bold uppercase ${isPendingTermin ? "text-rose-600" : "text-emerald-600"}`}>
                    {isPendingTermin ? "BELUM LUNAS" : "LUNAS"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Actors */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Shield className="w-4 h-4 text-cyan-600" />
              Pihak Terkait
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Staff Input (Gudang/Lapak)</span>
                <span className="font-bold text-slate-800">{purchase.staff.nama}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Verifikasi Gudang</span>
                <span className="font-bold text-slate-800">{purchase.admin?.nama || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Manager Approval</span>
                <span className="font-bold text-slate-800">{purchase.manager?.nama || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Metode Timbangan</span>
                <span className="font-semibold text-slate-700 text-right">{methodLabel}</span>
              </div>
            </div>
          </div>

          {/* Audit Logs Timeline */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              Audit Log (Riwayat Perubahan)
            </h3>

            {auditLogs.length > 0 ? (
              <div className="space-y-5">
                {paymentAuditLogs.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Riwayat pembayaran</p>
                    <div className="mt-3 space-y-3">
                      {paymentAuditLogs.map(log => (
                        <div key={log.id} className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-black text-slate-900">{formatAuditAction(log.action)}</p>
                            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                              {log.user.nama} ({log.user.role})
                            </p>
                          </div>
                          <span className="shrink-0 text-right font-mono text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                              timeZone: "Asia/Jakarta"
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {auditLogs.map(log => (
                  <div key={log.id} className="relative pl-6 space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-cyan-100 border-2 border-white ring-2 ring-cyan-500/10 flex items-center justify-center" />
                    <div className="text-xs font-bold text-slate-800">{formatAuditAction(log.action)}</div>
                    <div className="text-[10px] text-slate-400">
                      Oleh: <span className="font-semibold text-slate-600">{log.user.nama} ({log.user.role})</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta"
                      })}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">Tidak ada riwayat perubahan terekam.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentMetric({
  label,
  value,
  tone = "slate",
}: {
  label: string
  value: string
  tone?: "slate" | "amber"
}) {
  return (
    <div className="bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-sm font-black ${tone === "amber" ? "text-amber-700" : "text-slate-950"}`}>{value}</p>
    </div>
  )
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    UPLOAD_TRANSFER_PROOF: "Bukti transfer diunggah",
    REPLACE_TRANSFER_PROOF: "Bukti transfer diganti",
    SETTLE_TERMIN: "Termin ditandai lunas",
    CREATE_DRAFT: "Draft transaksi dibuat",
    SUPERVISOR_VERIFY_PURCHASE: "Penerimaan diverifikasi supervisor",
    ADMIN_DOUBLE_CHECK: "Double check admin selesai",
    MANAGER_APPROVE_PRICE: "Harga disetujui manager",
    MANAGER_REJECT_PRICE: "Harga ditolak manager",
  }

  return labels[action] || action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}
