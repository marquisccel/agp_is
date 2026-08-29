"use client"

import { useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { fmtKg, fmtPct } from "@/lib/format"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { namaGudang } from "@/lib/namaGudang"

export interface SkuSusutDetail {
  skuName: string
  beratLapak: number
  beratGudang: number
  selisih: number
}

export interface TransaksiSusutDetail {
  purchaseId: string
  nomorNota: string | null
  tanggal: string
  beratLapak: number
  beratGudang: number
  selisih: number
  skus: SkuSusutDetail[]
}

interface LapakSusutData {
  supplierId: string
  namaLapak: string
  warehouseId: string
  warehouseName: string
  totalLapak: number       // total timbangan lapak (kg)
  totalGudang: number      // total timbangan gudang (kg)
  selisih: number          // gudang - lapak (negatif = susut, positif = lebih)
  totalSusut: number       // total selisih negatif (penyusutan)
  totalLebih: number       // total selisih positif (kelebihan)
  transaksi: number
  pctSusut: number         // % susut dari lapak
  pctLebih: number         // % lebih dari lapak
  detailTransaksi: TransaksiSusutDetail[]
}

interface Props {
  lapakData: LapakSusutData[]
  warehouseNames: { id: string; nama: string }[]
  /** Mode ringkas untuk dashboard Manager: hanya KPI total + link ke menu
   * Analisis Susut. Rincian per lapak tetap utuh di halaman menunya. */
  summaryOnly?: boolean
}

export default function SusutLebihAnalytics({ lapakData, warehouseNames, summaryOnly = false }: Props) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"susut" | "lebih" | "volume">("susut")
  const [showMode, setShowMode] = useState<"semua" | "susut" | "lebih">("semua")
  const [selectedLapak, setSelectedLapak] = useState<LapakSusutData | null>(null)

  const filtered = lapakData.filter(d =>
    (selectedWarehouseId === "all" || d.warehouseId === selectedWarehouseId) &&
    (showMode === "semua" ||
      (showMode === "susut" && d.totalSusut > 0) ||
      (showMode === "lebih" && d.totalLebih > 0))
  )

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "susut") return b.totalSusut - a.totalSusut
    if (sortBy === "lebih") return b.totalLebih - a.totalLebih
    return b.totalLapak - a.totalLapak
  })

  // Summary for filtered data
  const filteredSummary = {
    totalLapak: sorted.reduce((s, d) => s + d.totalLapak, 0),
    totalGudang: sorted.reduce((s, d) => s + d.totalGudang, 0),
    totalSusut: sorted.reduce((s, d) => s + d.totalSusut, 0),
    totalLebih: sorted.reduce((s, d) => s + d.totalLebih, 0),
  }
  const filteredSusutPct = filteredSummary.totalLapak > 0
    ? (filteredSummary.totalSusut / filteredSummary.totalLapak) * 100 : 0
  const filteredLebihPct = filteredSummary.totalLapak > 0
    ? (filteredSummary.totalLebih / filteredSummary.totalLapak) * 100 : 0
  const warehouseOptions = [
    { value: "all", label: "Semua Gudang" },
    ...warehouseNames.map(w => ({ value: w.id, label: w.nama })),
  ]
  const sortOptions: { value: "susut" | "lebih" | "volume"; label: string }[] = [
    { value: "susut", label: "Susut Terbesar" },
    { value: "lebih", label: "Lebih Terbesar" },
    { value: "volume", label: "Volume Terbesar" },
  ]

  return (
    <>
    <div className="section overflow-hidden">
      {/* Header */}
      <div className="section-shell-head">
        <div className="min-w-0">
          <p className="section-eyebrow">Weighing variance</p>
          <h3 className="text-[15.5px] font-bold text-slate-900">Analisis Susut &amp; Lebih Timbangan per Lapak</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Selisih timbangan lapak vs timbangan gudang - susut berarti gudang lebih kecil dari lapak
          </p>
        </div>
        {/* Warehouse filter */}
        {!summaryOnly && (
          <ElegantSelect
            value={selectedWarehouseId}
            options={warehouseOptions}
            onChange={setSelectedWarehouseId}
            ariaLabel="Pilih gudang susut"
            className="w-full sm:w-44"
            menuClassName="sm:w-52"
          />
        )}
      </div>

      {/* Ringkasan. Bentuknya disamakan dengan Rekap DP dan dashboard
          Manager: satu pita menyatu, bukan empat kartu terpisah yang
          masing-masing membawa tepi dan bayangan sendiri.

          Nadanya mengikuti KEADAAN, bukan kategori. Susut nol adalah hasil
          yang justru diharapkan, jadi mewarnainya merah membuat kartu ini
          selalu terbaca gawat sekalipun tidak ada masalah. Warna baru
          muncul kalau selisihnya memang ada. */}
      <div
        className="stat-strip"
        style={{
          borderRadius: 0,
          border: "none",
          borderBottom: summaryOnly ? "1px solid var(--border)" : "none",
          boxShadow: "none",
        }}
      >
        <div className="stat-tile">
          <span className="stat-label">Ditimbang di Lapak</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtKg(filteredSummary.totalLapak)}</span>
          </div>
          <span className="stat-delta flat">Menurut timbangan lapak</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Ditimbang di Gudang</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtKg(filteredSummary.totalGudang)}</span>
          </div>
          <span className="stat-delta flat">Menurut timbangan gudang</span>
        </div>
        <div className={`stat-tile${filteredSummary.totalSusut > 0 ? " tone-danger" : ""}`}>
          <span className="stat-label">Susut</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtKg(filteredSummary.totalSusut)}</span>
          </div>
          <span className="stat-delta flat">
            {filteredSummary.totalSusut > 0 ? `${fmtPct(filteredSusutPct)} dari timbangan lapak` : "Tidak ada yang menyusut"}
          </span>
        </div>
        {/* Hijau, bukan kuning. Nada kuning dipakai sebentar karena "lebih"
            secara teknis juga selisih yang perlu diperiksa; Manager memutuskan
            barang yang datang lebih banyak dari catatan lapak bukan hal yang
            perlu diwaspadai di layar ini. */}
        <div className={`stat-tile${filteredSummary.totalLebih > 0 ? " tone-success" : ""}`}>
          <span className="stat-label">Lebih</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtKg(filteredSummary.totalLebih)}</span>
          </div>
          <span className="stat-delta flat">
            {filteredSummary.totalLebih > 0 ? `${fmtPct(filteredLebihPct)} dari timbangan lapak` : "Tidak ada kelebihan"}
          </span>
        </div>
      </div>

      {summaryOnly && (
        <div className="px-[22px] py-4">
          <Link
            href="/dashboard/manager/susut"
            className="inline-flex min-h-[38px] items-center text-[11.5px] font-bold"
            style={{ color: "var(--brand-strong)" }}
          >
            Lihat rincian per lapak →
          </Link>
        </div>
      )}

      </div>

      {/* Daftar per lapak berdiri sebagai kartu tersendiri; pita ringkasan
          dan daftar dibaca dengan cara berbeda, jadi tidak dijejalkan ke
          satu kartu. */}
      {!summaryOnly && (
      <div className="section overflow-hidden">
      <div className="section-shell-head flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Show mode toggle */}
        <div className="segmented w-full overflow-x-auto sm:w-auto flex">
          {([
            { key: "semua", label: "Semua Lapak" },
            { key: "susut", label: "Ada Susut" },
            { key: "lebih", label: "Ada Lebih" },
          ] as const).map(m => (
            <button
              key={m.key}
              onClick={() => setShowMode(m.key)}
              className={`shrink-0 ${showMode === m.key ? "active" : ""}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Urutkan:</span>
          <ElegantSelect
            value={sortBy}
            options={sortOptions}
            onChange={setSortBy}
            ariaLabel="Urutkan analisis susut"
            className="w-44"
            menuClassName="w-48"
          />
        </div>
      </div>

      {/* Daftar per lapak.

          Sebelumnya tiap lapak berupa KARTU tersendiri bertumpuk ke bawah,
          dengan kotak angka bergaya sendiri dan tombol hijau pekat. Bentuknya
          kini sama persis dengan Rekap DP: baris dalam satu kartu, dipisah
          garis tipis, dan kotak angkanya memakai kelas bersama yang warnanya
          hanya menyala kalau angkanya memang ada. */}
      <div>
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--muted-faint)" }}>
            <p>Belum ada data timbangan lapak vs gudang untuk periode ini.</p>
            <p className="mt-1 text-xs">Data muncul setelah transaksi melewati proses verifikasi gudang.</p>
          </div>
        ) : (
          <div className="daftar-lapak">
            {sorted.map((row, idx) => {
              return (
                <div
                  key={row.supplierId}
                  className="baris-lapak flex flex-col justify-between gap-4 px-[22px] py-4 lg:flex-row lg:items-center"
                >
                  {/* Info Lapak */}
                  <div className="flex min-w-0 items-start gap-3 lg:w-1/4">
                    <span className="nomor-lapak">{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
                        {row.namaLapak}
                        <span className="rounded-[8px] border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: "var(--border)", background: "var(--bg-tint)", color: "var(--muted)" }}>
                          {row.transaksi}x Transaksi
                        </span>
                      </div>
                      <span className="mt-1 block text-xs text-slate-400">
                        Gudang: <span className="font-bold text-slate-600">{namaGudang(row.warehouseName)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Rincian Timbangan */}
                  <div className="blok-angka grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="kotak-angka">
                      <span className="kotak-label">Timbang Lapak</span>
                      <span className="kotak-nilai font-mono">{fmtKg(row.totalLapak)}</span>
                    </div>

                    <div className="kotak-angka">
                      <span className="kotak-label">Timbang Gudang</span>
                      <span className="kotak-nilai font-mono">{fmtKg(row.totalGudang)}</span>
                    </div>

                    <div className={`kotak-angka${row.totalSusut > 0 ? " tone-danger" : ""}`}>
                      <span className="kotak-label">Susut</span>
                      <span className="kotak-nilai font-mono">
                        {row.totalSusut > 0 ? `${fmtKg(row.totalSusut)} (${fmtPct(row.pctSusut)})` : "Tidak ada"}
                      </span>
                    </div>

                    <div className={`kotak-angka${row.totalLebih > 0 ? " tone-success" : ""}`}>
                      <span className="kotak-label">Lebih</span>
                      <span className="kotak-nilai font-mono">
                        {row.totalLebih > 0 ? `${fmtKg(row.totalLebih)} (${fmtPct(row.pctLebih)})` : "Tidak ada"}
                      </span>
                    </div>
                  </div>

                  {/* Aksi */}
                  <div className="flex shrink-0 items-center justify-end lg:w-40">
                    <button
                      onClick={() => setSelectedLapak(row)}
                      className="btn-netral premium-button flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:w-auto"
                    >
                      Cek Detail
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
      )}

      {/* Modal Detail Susut per Lapak */}
      {typeof document !== "undefined" && selectedLapak && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in scale-in duration-200">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Detail Susut &amp; Lebih: {selectedLapak.namaLapak}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gudang: <span className="font-semibold text-slate-700">{namaGudang(selectedLapak.warehouseName)}</span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup detail susut"
                onClick={() => setSelectedLapak(null)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200/50 rounded-xl transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[64vh] scrollbar-thin scrollbar-thumb-slate-200">
              {selectedLapak.detailTransaksi && selectedLapak.detailTransaksi.length > 0 ? (
                selectedLapak.detailTransaksi.map((tx) => {
                  return (
                    <div key={tx.purchaseId} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 space-y-3">
                      {/* Tx Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <span className="font-mono font-bold text-slate-700 text-sm">
                            {tx.nomorNota || `#${tx.purchaseId.split("-")[0]}`}
                          </span>
                          <span className="text-[10px] text-slate-450 ml-2 font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {new Date(tx.tanggal).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-mono font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-600 flex items-center">
                            Lapak: {tx.beratLapak.toFixed(1)} kg / Gudang: {tx.beratGudang.toFixed(1)} kg
                          </span>
                          <span className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg border ${tx.selisih < 0 ? "bg-rose-50 text-rose-600 border-rose-100" : tx.selisih > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-650"}`}>
                            {tx.selisih === 0 ? "Sesuai" : tx.selisih < 0 ? `Susut: ${tx.selisih.toFixed(1)} kg` : `Lebih: +${tx.selisih.toFixed(1)} kg`}
                          </span>
                        </div>
                      </div>

                      {/* Sku Breakdown */}
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead>
                            <tr className="bg-slate-100 font-semibold text-slate-500">
                              <th className="px-4 py-2">Nama SKU</th>
                              <th className="px-4 py-2 text-right">Timbang Lapak</th>
                              <th className="px-4 py-2 text-right">Timbang Gudang</th>
                              <th className="px-4 py-2 text-right">Selisih</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] bg-white">
                            {tx.skus.map((sku, sIdx) => {
                              const sDiff = sku.selisih
                              return (
                                <tr key={sIdx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-2.5 font-bold text-slate-700">{sku.skuName}</td>
                                  <td className="px-4 py-2.5 text-right font-mono">{sku.beratLapak.toFixed(1)} kg</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">{sku.beratGudang.toFixed(1)} kg</td>
                                  <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                                    {sDiff === 0 ? (
                                      <span className="text-emerald-600 font-bold">0 kg</span>
                                    ) : (
                                      <span className={`font-bold ${sDiff < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                        {sDiff < 0 ? `${sDiff.toFixed(1)} kg` : `+${sDiff.toFixed(1)} kg`}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-slate-400 text-sm py-8">Tidak ada data transaksi pengiriman lapak ini.</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLapak(null)}
                className="text-white font-bold px-6 py-2.5 rounded-lg text-xs transition-colors"
                style={{ background: "var(--brand)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-strong)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
