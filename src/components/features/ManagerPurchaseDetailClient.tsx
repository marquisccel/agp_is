"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  Shield,
  XCircle,
  AlertCircle,
  Activity,
} from "lucide-react"
import { fmtRp } from "@/lib/format"
import { formatAuditAction } from "@/lib/auditLabels"
import { getPurchaseStatus, PURCHASE_STATUS_DESCRIPTIONS, type StatusTone } from "@/lib/purchaseStatusLabels"
import StatusPill, { TONE_STYLE } from "@/components/ui/StatusPill"
import PageHeader from "@/components/ui/PageHeader"
import NumberInput from "@/components/ui/NumberInput"

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
  const [formKoreksi, setFormKoreksi] = useState(false)
  const [kurangKoreksi, setKurangKoreksi] = useState(0)
  const [alasanKoreksi, setAlasanKoreksi] = useState("")
  const [kirimKoreksi, setKirimKoreksi] = useState(false)
  const [galatKoreksi, setGalatKoreksi] = useState<string | null>(null)

  const s = getPurchaseStatus(purchase.status_approval)
  const sDesc = PURCHASE_STATUS_DESCRIPTIONS[purchase.status_approval] ?? ""
  const sStyle = TONE_STYLE[s.tone]

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
  const methodLabel = purchase.metode_pembayaran_terpilih === "TIMBANGAN_GUDANG" ? "Timbangan Gudang (CC)" : "Timbangan Lapak"
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
  const paymentTone: StatusTone = isPendingTermin ? "warning" : isTransferred ? "success" : "neutral"

  /*
   * Koreksi hanya masuk akal untuk nota yang sudah ditransfer DAN tercatat
   * lunas. Nota yang belum ditransfer sudah menampilkan kekurangannya
   * sendiri, dan nota yang masih punya sisa cukup dicatat lewat pembayaran
   * biasa.
   */
  const bisaDikoreksi = isTransferred && purchase.status_pelunasan !== "BELUM_LUNAS"

  const kirimKoreksiKekurangan = async () => {
    setKirimKoreksi(true)
    setGalatKoreksi(null)
    try {
      const res = await fetch(`/api/purchases/${purchase.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kurang: kurangKoreksi, alasan: alasanKoreksi }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mencatat kekurangan")
      setFormKoreksi(false)
      setAlasanKoreksi("")
      setKurangKoreksi(0)
      router.refresh()
    } catch (e: unknown) {
      setGalatKoreksi(e instanceof Error ? e.message : "Gagal mencatat kekurangan")
    } finally {
      setKirimKoreksi(false)
    }
  }
  /**
   * Yang benar-benar masih harus diterima lapak setelah saldo kasbonnya
   * dipotong. Pada nota termin, `total_dibayar` hanya menyimpan cicilan
   * pertama, jadi angka ini tidak bisa dibaca langsung dari satu kolom.
   */
  const kewajibanKeLapak = payableValue + remainingPayment

  return (
    <div className="premium-workflow space-y-6">
      <PageHeader
        eyebrow="Detail transaksi"
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
          {/* API menolak mengedit nota yang sudah ditransfer. Tombolnya dulu
              tetap tampil dan mengantar ke form yang seluruhnya terkunci --
              perjalanan yang tidak pernah bisa selesai. */}
          {!isTransferred && (
            <Link href={`/dashboard/manager/edit/${purchase.id}`}>
              <button className="premium-button btn-netral px-4 py-2 text-xs">
                Edit Transaksi
              </button>
            </Link>
          )}
          <button
            onClick={() => router.back()}
            className="premium-button btn-netral flex items-center gap-2 px-4 py-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          </>
        }
      />

      {/* Alert status description */}
      <div className="p-4 rounded-xl border flex gap-3 items-start" style={{ background: sStyle.bg, color: sStyle.color, borderColor: sStyle.border }}>
        {purchase.status_approval === "dibatalkan" ? (
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : purchase.status_approval === "approved" || purchase.status_approval === "sudah_transfer" ? (
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div>
          <h4 className="text-sm font-bold">Status: {s.label}</h4>
          {/* Keterangan bawaan untuk "sudah_transfer" berbunyi "Transaksi
              selesai". Pada nota termin itu tidak benar: uangnya baru
              sebagian yang berpindah dan sisanya masih utang ke lapak. */}
          <p className="mt-0.5 text-xs opacity-90">
            {isPendingTermin
              ? `Pembayaran pertama sudah ditransfer. Masih kurang ${fmtRp(remainingPayment)} ke lapak.`
              : sDesc}
          </p>
          {purchase.status_approval === "dibatalkan" && purchase.rejection_reason && (
            <div className="mt-2 rounded-lg border p-2.5 text-xs" style={{ background: "rgba(255,255,255,0.55)", borderColor: "currentColor" }}>
              <span className="font-bold">Alasan Penolakan:</span> {purchase.rejection_reason}
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2 Column - Left Main Info, Right Summary and Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Lapak Info, Items Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mitra Lapak. Semua kartu di layar ini memakai satu bentuk kepala
              yang sama (eyebrow + judul). Sebelumnya ada tiga bentuk berbeda
              berdampingan: judul kecil abu berhuruf besar di sini, judul tebal
              berikon warna di kartu item, dan .section-shell-head di kolom
              kanan -- membuat halaman terbaca seperti tempelan tiga layar. */}
          <div className="section overflow-hidden">
            <div className="section-shell-head">
              <div>
                <span className="section-eyebrow">Sumber barang</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Mitra Lapak</h3>
              </div>
            </div>
            <div className="section-body grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <span className="field-label">Nama lapak</span>
              <Link
                href={`/dashboard/manager/suppliers/${purchase.supplier.id}`}
                className="font-bold text-slate-800 text-base transition-colors block hover:text-[var(--brand-strong)]"
              >
                {purchase.supplier.nama}
              </Link>
              <span className="text-xs text-slate-400 mt-1 block">ID Supplier: {purchase.supplier.id.split("-")[0]}</span>
            </div>

            <div>
              <span className="field-label">Rekening tujuan</span>
              {purchase.supplier.nomor_rekening ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    Bank: <span className="font-bold text-slate-800">{purchase.supplier.nama_bank}</span>
                  </p>
                  <p>
                    No. Rekening: <span className="font-mono font-bold text-slate-800">{purchase.supplier.nomor_rekening}</span>
                  </p>
                  <p>
                    Atas Nama: <span className="font-semibold text-slate-700">{purchase.supplier.atas_nama || "-"}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: "var(--muted-faint)" }}>Informasi rekening bank belum diisi.</p>
              )}
            </div>
            </div>
          </div>

          {/* Rincian Item */}
          <div className="section overflow-hidden">
            <div className="section-shell-head">
              <div>
                <span className="section-eyebrow">Rincian</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Item (SKU)</h3>
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--muted-faint)" }}>
                Dasar harga: {methodLabel}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="tabel-lembut text-sm">
                <thead>
                  <tr>
                    <th>Nama SKU / Spec</th>
                    <th className="!text-right">Lapak (kg)</th>
                    <th className="!text-right">Gudang (kg)</th>
                    <th className="!text-right">Selisih</th>
                    <th className="!text-right">Harga/kg</th>
                    <th className="!text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map(item => {
                    const lWeight = item.berat_lapak ?? item.berat_final_item ?? 0
                    const gWeight = item.berat_final_item ?? 0
                    const diff = gWeight - lWeight
                    const isOver = isItemOverLimit(item.sku_name, item.harga_per_kg)
                    const maxP = getSkuMaxPrice(item.sku_name)

                    return (
                      <tr key={item.id} style={isOver ? { background: "var(--warning-soft)" } : undefined}>
                        <td>
                          <div className="font-bold" style={{ color: "var(--foreground)" }}>{item.sku_name}</div>
                          {/* Spec adalah kategori, bukan keadaan baik-buruk.
                              Dulu Grading berwarna hijau dan Gabyuk kuning,
                              jadi separuh nota terbaca seperti sedang
                              bermasalah padahal cuma beda cara penyortiran. */}
                          {item.spec && (
                            <span
                              className="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
                              style={{ background: "var(--bg-tint)", color: "var(--muted)" }}
                            >
                              {item.spec}
                            </span>
                          )}
                        </td>
                        <td className="text-right font-mono font-medium">{lWeight.toFixed(1)}</td>
                        <td className="text-right font-mono font-bold" style={{ color: "var(--foreground)" }}>{gWeight.toFixed(1)}</td>
                        <td className="text-right">
                          {diff === 0 ? (
                            <span
                              className="rounded px-2 py-0.5 text-[10px] font-bold"
                              style={{ color: "var(--success)", background: "var(--success-soft)" }}
                            >
                              Sesuai
                            </span>
                          ) : (
                            <span className="rounded px-2 py-0.5 font-mono text-[10px] font-bold"
                              style={diff < 0
                                ? { color: "var(--danger)", background: "var(--danger-soft)" }
                                : { color: "var(--warning)", background: "var(--warning-soft)" }}>
                              {diff < 0 ? diff.toFixed(1) : `+${diff.toFixed(1)}`}
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="font-mono font-semibold" style={{ color: isOver ? "var(--warning)" : "var(--foreground)" }}>
                            {fmtRp(item.harga_per_kg)}
                          </div>
                          {isOver && (
                            <span className="mt-0.5 block text-right text-[9px] font-bold" style={{ color: "var(--warning)" }}>
                              Di atas standar {fmtRp(maxP)}
                            </span>
                          )}
                        </td>
                        <td className="text-right font-mono font-bold" style={{ color: "var(--foreground)" }}>
                          {fmtRp(item.subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Ringkasan timbangan. Nadanya mengikuti keadaan, bukan
                kategori: selisih nol berarti cocok, jadi netral -- tidak
                perlu dirayakan dengan hijau di setiap nota yang normal. */}
            <div
              className="grid grid-cols-3 gap-px border-t text-center"
              style={{ borderColor: "var(--border)", background: "var(--border)" }}
            >
              <div className="px-4 py-4" style={{ background: "var(--surface-sunken)" }}>
                <span className="field-label" style={{ marginBottom: 4 }}>Timbangan Lapak</span>
                <p className="font-mono font-bold" style={{ color: "var(--foreground)" }}>{totalWeightLapak.toFixed(1)} KG</p>
              </div>
              <div className="px-4 py-4" style={{ background: "var(--surface-sunken)" }}>
                <span className="field-label" style={{ marginBottom: 4 }}>Timbangan Gudang</span>
                <p className="font-mono font-bold" style={{ color: "var(--foreground)" }}>{totalWeightGudang.toFixed(1)} KG</p>
              </div>
              <div className="px-4 py-4" style={{ background: "var(--surface-sunken)" }}>
                <span className="field-label" style={{ marginBottom: 4 }}>Selisih</span>
                <p className="font-mono font-bold"
                  style={{ color: weightDiff === 0 ? "var(--foreground)" : weightDiff < 0 ? "var(--danger)" : "var(--warning)" }}>
                  {weightDiff > 0 ? `+${weightDiff.toFixed(1)}` : weightDiff.toFixed(1)} KG
                </p>
              </div>
            </div>
          </div>

          {/* Retur Items List if Any */}
          {purchase.returs.length > 0 && (
            <div className="section overflow-hidden">
              <div className="section-shell-head">
                <div>
                  <span className="section-eyebrow">Pengembalian</span>
                  <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Retur Barang</h3>
                </div>
                <AlertCircle className="h-4 w-4" style={{ color: "var(--danger)" }} />
              </div>
              <div className="overflow-x-auto">
                <table className="tabel-lembut text-sm">
                  <thead>
                    <tr>
                      <th>Nama SKU</th>
                      <th className="!text-right">Berat Retur (kg)</th>
                      <th className="!text-right">Potongan Nilai</th>
                      <th>Alasan Retur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.returs.map(ret => (
                      <tr key={ret.id}>
                        <td className="font-bold" style={{ color: "var(--foreground)" }}>{ret.sku_name}</td>
                        <td className="text-right font-mono font-medium">{ret.berat_retur.toFixed(1)} KG</td>
                        <td className="text-right font-mono font-bold" style={{ color: "var(--danger)" }}>-{fmtRp(ret.potongan_nilai)}</td>
                        <td className="text-xs" style={{ color: "var(--muted)" }}>{ret.alasan || "Tidak ada keterangan"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Pihak Terkait */}
          <div className="section overflow-hidden">
              <div className="section-shell-head">
                <div>
                  <span className="section-eyebrow">Penanggung jawab</span>
                  <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Pihak Terkait</h3>
                </div>
                <Shield className="h-4 w-4" style={{ color: "var(--muted-faint)" }} />
              </div>
              <div className="section-body space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Staff Input (Gudang/Lapak)</span>
                  <span className="font-bold text-slate-800">{purchase.staff.nama}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Verifikasi Gudang</span>
                  <span className="font-bold text-slate-800">{purchase.admin?.nama || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Manager Approval</span>
                  <span className="font-bold text-slate-800">{purchase.manager?.nama || "-"}</span>
                </div>
            </div>
            </div>
        </div>

        {/* Right Column - Financial Summary, Transaction actors, Audit logs */}
        <div className="space-y-6">
          {/* Payment Control */}
          <div className="section overflow-hidden">
            <div className="section-shell-head">
              <div>
                <span className="section-eyebrow">Pembayaran</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>{paymentStatusLabel}</h3>
              </div>
              <StatusPill label={`${displayedPaymentPercent}% dibayar`} tone={paymentTone} />
            </div>
            <div className="px-[22px] pt-4">
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, displayedPaymentPercent))}%`,
                    background: isPendingTermin ? "var(--warning)" : "var(--success)",
                  }}
                />
              </div>
            </div>

            {/* Baris "Dibayar Awal" dan "Sisa Termin" hanya berarti untuk
                nota termin. Pada nota bayar penuh keduanya persis menyalin
                nilai transfernya, sehingga angka yang sama berdiri
                berdampingan dua kali tanpa menambah keterangan apa pun --
                cacat label yang sama dengan yang sudah dibetulkan di Rekap
                DP. "Total Tagihan" juga menyesatkan: yang ditampilkan
                adalah nilai yang ditransfer SETELAH potongan kasbon, bukan
                nilai tagihan lapaknya. */}
            <div className="mt-4 grid grid-cols-2 gap-px text-xs" style={{ background: "var(--border)" }}>
              <PaymentMetric label="Nilai Transfer" value={fmtRp(payableValue)} />
              <PaymentMetric
                label="Tanggal Transfer"
                value={purchase.tanggal_transfer ? new Date(purchase.tanggal_transfer).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }) : "-"}
              />
              {hasOpenTermin && (
                <>
                  <PaymentMetric label="Dibayar Awal" value={fmtRp(initialPayment)} />
                  <PaymentMetric label="Sisa Termin" value={fmtRp(remainingPayment)} tone={isPendingTermin ? "amber" : "slate"} />
                </>
              )}
            </div>

            {/*
              Jalur koreksi. Sekali sebuah nota ditandai lunas, tidak ada
              lagi tempat mencatat bahwa transfernya ternyata kurang: Admin
              yang memilih skema bayar penuh lalu mentransfer lebih sedikit
              tidak punya cara memperbaikinya, dan selisihnya hilang dari
              sistem sementara lapak tetap menagih.
            */}
            {bisaDikoreksi && (
              <div className="border-t p-5" style={{ borderColor: "var(--border)" }}>
                {formKoreksi ? (
                  <div className="space-y-3">
                    <div>
                      <label className="field-label">Kekurangan yang belum dibayar (Rp)</label>
                      <NumberInput
                        aria-label="Nominal kekurangan"
                        className="field-input text-right font-mono"
                        placeholder="0"
                        value={kurangKoreksi}
                        onValueChange={setKurangKoreksi}
                      />
                      <p className="mt-1.5 text-[11px]" style={{ color: "var(--muted-faint)" }}>
                        Maksimal {fmtRp(kewajibanKeLapak)}, yaitu seluruh kewajiban ke lapak setelah potongan kasbon.
                      </p>
                    </div>
                    <div>
                      <label className="field-label">Alasan koreksi</label>
                      <textarea
                        className="field-input text-sm"
                        rows={2}
                        value={alasanKoreksi}
                        onChange={(e) => setAlasanKoreksi(e.target.value)}
                        placeholder="Contoh: transfer hanya Rp 9.000.000, sisanya belum dikirim."
                      />
                      <p className="mt-1.5 text-[11px]" style={{ color: "var(--muted-faint)" }}>
                        Wajib diisi, minimal 10 karakter. Tercatat di audit log bersama nama Anda.
                      </p>
                    </div>
                    {galatKoreksi && (
                      <div className="notice tone-warning text-xs font-medium">{galatKoreksi}</div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setFormKoreksi(false); setGalatKoreksi(null) }}
                        className="btn-netral premium-button px-3 py-2 text-xs"
                      >
                        Batal
                      </button>
                      <button
                        onClick={kirimKoreksiKekurangan}
                        disabled={kirimKoreksi || kurangKoreksi <= 0 || alasanKoreksi.trim().length < 10}
                        className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        {kirimKoreksi ? "Menyimpan..." : "Buka Kembali Nota"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black" style={{ color: "var(--foreground)" }}>Pembayarannya ternyata kurang?</p>
                      <p className="mt-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
                        Buka kembali nota ini dan catat berapa yang masih harus dibayar.
                      </p>
                    </div>
                    <button
                      onClick={() => { setFormKoreksi(true); setKurangKoreksi(0) }}
                      className="btn-netral premium-button shrink-0 px-3 py-2 text-xs"
                    >
                      Koreksi
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="border-t p-5" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black" style={{ color: "var(--foreground)" }}>Bukti transfer</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {purchase.bukti_transfer ? "Bukti pembayaran sudah tersimpan." : "Belum ada bukti transfer yang diunggah."}
                  </p>
                </div>
                {purchase.bukti_transfer ? (
                  <button
                    onClick={() => setShowProof(!showProof)}
                    className="premium-button btn-netral px-3 py-2 text-xs"
                  >
                    {showProof ? "Tutup" : "Lihat bukti"}
                  </button>
                ) : (
                  <span
                    className="rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-black"
                    style={{ borderColor: "var(--border)", background: "var(--bg-tint)", color: "var(--muted)" }}
                  >
                    Belum ada
                  </span>
                )}
              </div>
              {showProof && purchase.bukti_transfer && (
                <div className="relative mt-4 h-96 w-full overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}>
                  <Image
                    src={purchase.bukti_transfer}
                    alt="Bukti Transfer"
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    className="object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Kalkulasi Keuangan */}
          <div className="section overflow-hidden">
            <div className="section-shell-head">
              <div>
                <span className="section-eyebrow">Uang</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Kalkulasi</h3>
              </div>
              <DollarSign className="h-4 w-4" style={{ color: "var(--muted-faint)" }} />
            </div>
            <div className="section-body space-y-2.5 text-xs" style={{ color: "var(--muted)" }}>
              <div className="flex justify-between">
                <span>Nilai Sebelum Potongan</span>
                <span className="font-semibold text-slate-800 font-mono">{fmtRp(purchase.total_nilai_sebelum_retur || 0)}</span>
              </div>

              {/* Deductions breakdown */}
              {(purchase.potongan_sampah || 0) > 0 && (
                <div className="flex justify-between" style={{ color: "var(--danger)" }}>
                  <span>Potongan Sampah ({purchase.berat_potongan_sampah || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_sampah || 0)}</span>
                </div>
              )}
              {(purchase.potongan_susut || 0) > 0 && (
                <div className="flex justify-between" style={{ color: "var(--danger)" }}>
                  <span>Potongan Susut ({purchase.berat_potongan_susut || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_susut || 0)}</span>
                </div>
              )}
              {(purchase.potongan_air || 0) > 0 && (
                <div className="flex justify-between" style={{ color: "var(--danger)" }}>
                  <span>Potongan Air ({purchase.berat_potongan_air || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_air || 0)}</span>
                </div>
              )}
              {(purchase.potongan_karung || 0) > 0 && (
                <div className="flex justify-between" style={{ color: "var(--danger)" }}>
                  <span>Potongan Karung ({purchase.berat_potongan_karung || 0} kg)</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.potongan_karung || 0)}</span>
                </div>
              )}
              {(purchase.total_potongan_retur || 0) > 0 && (
                <div className="flex justify-between" style={{ color: "var(--danger)" }}>
                  <span>Potongan Retur Barang</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.total_potongan_retur || 0)}</span>
                </div>
              )}

              <div className="flex justify-between border-t pt-2 font-semibold" style={{ borderColor: "var(--border)" }}>
                <span>Nilai Bersih Setelah Potongan</span>
                <span className="font-mono" style={{ color: "var(--foreground)" }}>{fmtRp(purchase.total_nilai_setelah_retur || 0)}</span>
              </div>

              {(purchase.dp_yang_digunakan || 0) > 0 && (
                <div className="flex justify-between" style={{ color: "var(--danger)" }}>
                  <span>Potongan Saldo Kasbon</span>
                  <span className="font-mono font-medium">-{fmtRp(purchase.dp_yang_digunakan || 0)}</span>
                </div>
              )}

              {/*
                Rantai hitungnya dulu putus pada nota termin. Yang tampil:
                nilai 30 juta, potongan kasbon 15 juta, lalu "Nilai Transfer
                9 juta" -- 30 dikurangi 15 tidak pernah menghasilkan 9, dan
                pembaca tidak diberi tahu bahwa 9 juta itu baru cicilan
                pertama dari 15 juta. Dua baris berikut menutup lompatan itu.
              */}
              {hasOpenTermin && (
                <>
                  <div className="flex justify-between border-t pt-2 font-semibold" style={{ borderColor: "var(--border)" }}>
                    <span>Kewajiban ke Lapak</span>
                    <span className="font-mono" style={{ color: "var(--foreground)" }}>{fmtRp(kewajibanKeLapak)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "var(--warning)" }}>
                    <span>Belum dibayar</span>
                    <span className="font-mono font-medium">-{fmtRp(remainingPayment)}</span>
                  </div>
                </>
              )}

              <div
                className="flex justify-between border-t-2 border-dashed pt-3 text-sm font-extrabold"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <span>{hasOpenTermin ? "Sudah Ditransfer" : "Nilai Transfer"}</span>
                <span className="font-mono text-base" style={{ color: "var(--brand-strong)" }}>{fmtRp(purchase.total_dibayar || 0)}</span>
              </div>
            </div>

            {/* Rincian skema pembayaran dulu diulang di sini -- "Dibayar
                Awal", "Sisa Belum Lunas", dan "Status Pelunasan" -- padahal
                ketiganya sudah tampil utuh di bagian Pembayaran di atas.
                Akibatnya angka yang sama muncul empat kali di satu layar.

                Yang lebih berat: baris "Status Pelunasan" di sini menulis
                LUNAS hanya berdasarkan ada-tidaknya sisa termin, tanpa
                memeriksa uangnya sudah ditransfer atau belum -- persis
                cacat yang sudah dibetulkan di layar Transfer dan Daftar
                Transaksi, tapi terlewat di sini. Kepala bagian Pembayaran
                di atas sudah menghitungnya dengan benar
                ("Menunggu Transfer" selama belum ditransfer), jadi blok
                ini dibuang seluruhnya, bukan ditambal. */}
          </div>
        </div>
      </div>

      {/*
        Kolom kanan dulu memuat EMPAT kartu bertumpuk -- Pembayaran,
        Kalkulasi, Pihak Terkait, dan Riwayat Perubahan -- sementara kolom
        kiri cuma dua. Panjangnya jadi timpang: kolom sempit menjulur jauh
        melewati kolom lebar di sebelahnya, dan linimasa riwayat, yang
        justru paling butuh ruang mendatar, terjepit paling sempit.

        Sekarang kanan menyisakan dua kartu yang sama-sama soal uang, dan
        dua kartu "siapa & kapan" turun ke baris sendiri selebar layar.
      */}
      {/* Riwayat Perubahan.

              Kotak "Riwayat pembayaran" yang dulu berdiri di atas linimasa
              ini menyaring tiga aksi pembayaran dari daftar yang sama, lalu
              linimasa di bawahnya menampilkan ULANG seluruh daftar termasuk
              ketiganya. Pada nota yang cuma punya satu peristiwa pembayaran,
              hasilnya baris kembar persis, berdempetan. Kartu Pembayaran di
              atas layar ini sudah memuat tanggal transfer dan buktinya, jadi
              yang tersisa di sini cukup satu linimasa utuh menurut waktu. */}
      <div className="section overflow-hidden">
            <div className="section-shell-head">
              <div>
                <span className="section-eyebrow">Jejak</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Riwayat Perubahan</h3>
              </div>
              <Activity className="h-4 w-4" style={{ color: "var(--muted-faint)" }} />
            </div>
            <div className="section-body">
            {auditLogs.length > 0 ? (
                <div className="relative space-y-4 before:absolute before:bottom-2 before:left-[6px] before:top-2 before:w-px before:bg-[var(--border)]">
                {auditLogs.map(log => (
                  <div key={log.id} className="relative space-y-1 pl-6">
                    <div
                      className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2"
                      style={{ background: "var(--surface)", borderColor: "var(--brand)" }}
                    />
                    <div className="text-xs font-bold" style={{ color: "var(--foreground)" }}>{formatAuditAction(log.action)}</div>
                    <div className="text-[10px]" style={{ color: "var(--muted-faint)" }}>
                      Oleh: <span className="font-semibold" style={{ color: "var(--muted)" }}>{log.user.nama} ({log.user.role})</span>
                    </div>
                    <div className="font-mono text-[9px]" style={{ color: "var(--muted-faint)" }}>
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta"
                      })}
                    </div>
                  </div>
                ))}
                </div>
            ) : (
              <p className="py-4 text-center text-xs italic" style={{ color: "var(--muted-faint)" }}>Tidak ada riwayat perubahan terekam.</p>
            )}
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
    <div className="p-4" style={{ background: "var(--surface)" }}>
      <span className="field-label" style={{ marginBottom: 4 }}>{label}</span>
      <p className="font-mono text-sm font-black" style={{ color: tone === "amber" ? "var(--warning)" : "var(--foreground)" }}>{value}</p>
    </div>
  )
}


