"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { fmtKg, fmtPct } from "@/lib/format"
import ElegantSelect from "@/components/ui/ElegantSelect"

interface SkuSusutDetail {
  skuName: string
  beratLapak: number
  beratGudang: number
  selisih: number
}

interface TransaksiSusutDetail {
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

interface SusutLebihSummary {
  totalLapakAll: number
  totalGudangAll: number
  totalSusutAll: number
  totalLebihAll: number
  totalSelisihBersih: number
  pctSusutAll: number
  pctLebihAll: number
  transaksiDenganData: number
}

interface Props {
  lapakData: LapakSusutData[]
  summary: SusutLebihSummary
  warehouseNames: { id: string; nama: string }[]
}

export default function SusutLebihAnalytics({ lapakData, summary, warehouseNames }: Props) {
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
    <div className="interactive-surface bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">Analisis Susut &amp; Lebih Timbangan per Lapak</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Selisih timbangan lapak vs timbangan gudang - susut berarti gudang lebih kecil dari lapak
            </p>
          </div>
          {/* Warehouse filter */}
          <ElegantSelect
            value={selectedWarehouseId}
            options={warehouseOptions}
            onChange={setSelectedWarehouseId}
            ariaLabel="Pilih gudang susut"
            className="w-full sm:w-44"
            menuClassName="sm:w-52"
          />
        </div>
      </div>

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-5 border-b border-slate-100">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Lapak</p>
          <p className="text-xl font-extrabold text-slate-800">{fmtKg(filteredSummary.totalLapak)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Timbangan lapak</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Gudang</p>
          <p className="text-xl font-extrabold text-slate-800">{fmtKg(filteredSummary.totalGudang)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Timbangan gudang</p>
        </div>
        <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
          <p className="text-xs text-rose-500 font-semibold uppercase tracking-wider mb-1">Total Susut</p>
          <p className="text-xl font-extrabold text-rose-700">{fmtKg(filteredSummary.totalSusut)}</p>
          <p className="text-xs text-rose-400 mt-0.5 font-semibold">{fmtPct(filteredSusutPct)} dari lapak</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Total Lebih</p>
          <p className="text-xl font-extrabold text-emerald-700">{fmtKg(filteredSummary.totalLebih)}</p>
          <p className="text-xs text-emerald-500 mt-0.5 font-semibold">{fmtPct(filteredLebihPct)} dari lapak</p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Show mode toggle */}
        <div className="flex w-full overflow-x-auto bg-slate-100 rounded-lg p-1 gap-1 sm:w-auto">
          {([
            { key: "semua", label: "Semua Lapak" },
            { key: "susut", label: "Ada Susut" },
            { key: "lebih", label: "Ada Lebih" },
          ] as const).map(m => (
            <button
              key={m.key}
              onClick={() => setShowMode(m.key)}
              className={`flex shrink-0 items-center gap-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                showMode === m.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
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

      {/* Table */}
      <div className="p-5">
        {sorted.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-12">
            <p>Belum ada data timbangan lapak vs gudang untuk periode ini.</p>
            <p className="text-xs mt-1">Data muncul setelah transaksi melewati proses verifikasi gudang.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((row, idx) => {
              return (
                <div
                  key={row.supplierId}
                  className="interactive-surface bg-white hover:bg-slate-50/50 rounded-lg p-4 border border-slate-200 shadow-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  {/* Info Lapak */}
                  <div className="flex items-start gap-3 lg:w-1/4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-extrabold text-sm shrink-0 shadow-inner">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                        {row.namaLapak}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                          {row.transaksi}x Transaksi
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 mt-1 block">
                        CC: <span className="font-bold text-slate-600">{row.warehouseName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Rincian Timbangan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
                    {/* Lapak */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Timbang Lapak</span>
                      <span className="font-mono text-slate-700 font-bold text-sm block mt-1">{fmtKg(row.totalLapak)}</span>
                    </div>

                    {/* Gudang */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Timbang Gudang</span>
                      <span className="font-mono text-slate-800 font-bold text-sm block mt-1">{fmtKg(row.totalGudang)}</span>
                    </div>

                    {/* Susut */}
                    <div className="bg-rose-50/40 rounded-xl p-3 border border-rose-100/50">
                      <span className="text-[10px] text-rose-500 font-semibold uppercase block">Susut (KG)</span>
                      {row.totalSusut > 0 ? (
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-mono text-rose-600 font-extrabold text-sm">{fmtKg(row.totalSusut)}</span>
                          <span className="text-[9px] font-bold text-rose-500">({fmtPct(row.pctSusut)})</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs block mt-1.5">-</span>
                      )}
                    </div>

                    {/* Lebih */}
                    <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-100/50">
                      <span className="text-[10px] text-emerald-600 font-semibold uppercase block">Lebih (KG)</span>
                      {row.totalLebih > 0 ? (
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="font-mono text-emerald-600 font-extrabold text-sm">{fmtKg(row.totalLebih)}</span>
                          <span className="text-[9px] font-bold text-emerald-550 text-emerald-600">({fmtPct(row.pctLebih)})</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs block mt-1.5">-</span>
                      )}
                    </div>
                  </div>

                  {/* Aksi */}
                  <div className="flex items-center justify-end lg:w-40 shrink-0">
                    <button
                      onClick={() => setSelectedLapak(row)}
                      className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 font-bold px-4 py-2.5 rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
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

      {/* Modal Detail Susut per Lapak */}
      {typeof document !== "undefined" && selectedLapak && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in scale-in duration-200">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Detail Susut &amp; Lebih: {selectedLapak.namaLapak}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Collection Center: <span className="font-semibold text-slate-700">{selectedLapak.warehouseName}</span>
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
                          <tbody className="divide-y divide-slate-100 bg-white">
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
                                      <span className={`font-bold ${sDiff < 0 ? "text-rose-600" : "text-cyan-600"}`}>
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
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-lg text-xs transition-all shadow-md shadow-slate-900/10"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
