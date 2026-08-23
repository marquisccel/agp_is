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
} from "lucide-react"
import { fmtRp } from "@/lib/format"
import { getPurchaseStatus, PURCHASE_STATUS_DESCRIPTIONS, type StatusTone } from "@/lib/purchaseStatusLabels"
import StatusPill, { TONE_STYLE } from "@/components/ui/StatusPill"
import PageHeader from "@/components/ui/PageHeader"
import KoreksiKekurangan from "@/components/features/KoreksiKekurangan"
import { kewajibanKeLapak } from "@/lib/settlement"

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

interface SkuPriceStandard {
  sku_name: string
  max_price_per_kg: number
}

export default function ManagerPurchaseDetailClient({
  purchase,
  skuPrices
}: {
  purchase: Purchase
  skuPrices: SkuPriceStandard[]
}) {
  const router = useRouter()
  const [showProof, setShowProof] = useState(false)

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
  const paymentStatusLabel = !isTransferred ? "Belum Ditransfer" : isPendingTermin ? "Belum Lunas" : "Lunas"
  const paymentTone: StatusTone = isPendingTermin ? "warning" : isTransferred ? "success" : "neutral"

  /*
   * Koreksi hanya masuk akal untuk nota yang sudah ditransfer DAN tercatat
   * lunas. Nota yang belum ditransfer sudah menampilkan kekurangannya
   * sendiri, dan nota yang masih punya sisa cukup dicatat lewat pembayaran
   * biasa.
   */
  const bisaDikoreksi = isTransferred && purchase.status_pelunasan !== "BELUM_LUNAS"

  /**
   * Yang benar-benar masih harus diterima lapak setelah saldo kasbonnya
   * dipotong. Pada nota termin, `total_dibayar` hanya menyimpan cicilan
   * pertama, jadi angka ini tidak bisa dibaca langsung dari satu kolom.
   */
  const kewajibanTampil = payableValue + remainingPayment

  /*
   * Cerita uangnya, dari nilai barang sampai yang harus dibayar. Sebelumnya
   * ini berupa daftar menurun di kolom paling sempit, dengan istilah yang
   * tidak dipakai orang saat bicara ("Nilai Bersih Setelah Potongan",
   * "Potongan Saldo DP/Kasbon", "Nilai Transfer"). Sekarang dibaca sebagai
   * satu kalimat mendatar selebar layar, dengan kata sehari-hari.
   */
  const nilaiBarang = purchase.total_nilai_sebelum_retur ?? 0
  const potonganLain =
    (purchase.potongan_sampah ?? 0) +
    (purchase.potongan_susut ?? 0) +
    (purchase.potongan_air ?? 0) +
    (purchase.potongan_karung ?? 0)
  const potonganRetur =
    purchase.total_potongan_retur ?? Math.max(0, nilaiBarang - (purchase.total_nilai_setelah_retur ?? nilaiBarang))
  const totalPotongan = potonganRetur + potonganLain
  const dibayarDiMuka = purchase.dp_yang_digunakan ?? 0
  const rincianPotongan = [
    { nama: "Sampah", berat: purchase.berat_potongan_sampah ?? 0, nilai: purchase.potongan_sampah ?? 0 },
    { nama: "Susut timbangan", berat: purchase.berat_potongan_susut ?? 0, nilai: purchase.potongan_susut ?? 0 },
    { nama: "Kadar air", berat: purchase.berat_potongan_air ?? 0, nilai: purchase.potongan_air ?? 0 },
    { nama: "Karung", berat: purchase.berat_potongan_karung ?? 0, nilai: purchase.potongan_karung ?? 0 },
    { nama: "Retur barang", berat: 0, nilai: potonganRetur },
  ].filter((r) => r.nilai > 0)

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

      {/*
        Ringkasan uang. Ini pertanyaan pertama yang dibawa Manager ke layar
        ini -- berapa nilainya, berapa yang sudah di muka, berapa yang masih
        harus dibayar -- jadi jawabannya diletakkan paling atas dan dibaca
        kiri ke kanan seperti kalimat, bukan dicari di daftar menurun pada
        kolom paling sempit.
      */}
      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Uang</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Hitungan Pembayaran</h3>
          </div>
          <DollarSign className="h-4 w-4" style={{ color: "var(--muted-faint)" }} />
        </div>
        <div
          className="grid gap-px"
          style={{ background: "var(--border)", gridTemplateColumns: `repeat(${remainingPayment > 0 ? 5 : 4}, minmax(0, 1fr))` }}
        >
          <UangTile label="Nilai barang" nilai={fmtRp(nilaiBarang)} />
          <UangTile label="Potongan" nilai={totalPotongan > 0 ? `- ${fmtRp(totalPotongan)}` : "Tidak ada"} warna={totalPotongan > 0 ? "var(--danger)" : undefined} />
          <UangTile label="Sudah dibayar di muka" nilai={dibayarDiMuka > 0 ? `- ${fmtRp(dibayarDiMuka)}` : "Tidak ada"} warna={dibayarDiMuka > 0 ? "var(--danger)" : undefined} catatan={dibayarDiMuka > 0 ? "diambil dari kasbon lapak" : undefined} />
          <UangTile label="Total yang harus dilunasi" nilai={fmtRp(kewajibanTampil)} tebal />
          {remainingPayment > 0 && (
            <UangTile label="Masih kurang" nilai={fmtRp(remainingPayment)} warna="var(--warning)" tebal />
          )}
        </div>
        {rincianPotongan.length > 0 && (
          <div
            className="flex flex-wrap gap-x-5 gap-y-1 border-t px-[22px] py-3 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            <span className="font-semibold">Rincian potongan:</span>
            {rincianPotongan.map((r) => (
              <span key={r.nama}>
                {r.nama}
                {r.berat > 0 ? ` ${r.berat} kg` : ""} &middot;{" "}
                <strong style={{ color: "var(--danger)" }}>{fmtRp(r.nilai)}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Grid: 2 Column - Left Main Info, Right Summary and Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Lapak Info, Items Table */}
        <div className="lg:col-span-2 space-y-6">
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
              <StatusPill label={`${displayedPaymentPercent}% terbayar`} tone={paymentTone} />
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
              <PaymentMetric
                label={isTransferred ? "Sudah Ditransfer" : "Akan Ditransfer"}
                value={fmtRp(payableValue)}
              />
              <PaymentMetric
                label="Tanggal Transfer"
                value={purchase.tanggal_transfer ? new Date(purchase.tanggal_transfer).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }) : "-"}
              />
              {hasOpenTermin && (
                <>
                  <PaymentMetric label="Pembayaran Pertama" value={fmtRp(initialPayment)} />
                  <PaymentMetric label="Masih Kurang" value={fmtRp(remainingPayment)} tone={isPendingTermin ? "amber" : "slate"} />
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
              <div className="flex border-t p-5" style={{ borderColor: "var(--border)" }}>
                <KoreksiKekurangan
                  purchaseId={purchase.id}
                  kewajiban={kewajibanKeLapak(purchase)}
                  namaLapak={purchase.supplier.nama}
                />
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
            <div className="section-body space-y-4">
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
              <span className="field-label" style={{ marginTop: 4 }}>Rekening tujuan</span>
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
        </div>
      </div>

      {/*
        Susunannya mengikuti urutan pertanyaan yang dibawa pembaca: berapa
        uangnya (pita di atas), apa barangnya dan siapa yang menanganinya
        (kolom lebar), lalu keadaan pembayaran dan lapaknya (kolom sempit),
        dan terakhir kapan semuanya terjadi (linimasa selebar layar).
      */}
    </div>
  )
}

function UangTile({
  label,
  nilai,
  catatan,
  warna,
  tebal = false,
}: {
  label: string
  nilai: string
  catatan?: string
  warna?: string
  tebal?: boolean
}) {
  return (
    <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
      <span className="field-label" style={{ marginBottom: 4 }}>{label}</span>
      <p
        className={`font-mono ${tebal ? "text-base font-black" : "text-sm font-bold"}`}
        style={{ color: warna ?? "var(--foreground)" }}
      >
        {nilai}
      </p>
      {catatan && <p className="mt-1 text-[11px]" style={{ color: "var(--muted-faint)" }}>{catatan}</p>}
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


