"use client"

import { useState } from "react"
import { fmtKg, fmtRpPerKg, fmtAngka } from "@/lib/format"
import ElegantSelect from "@/components/ui/ElegantSelect"

interface TopSupplier {
  supplierId: string
  nama: string
  totalKg: number
  avgHarga: number
  transaksi: number
}

interface WarehouseTopData {
  warehouseId: string
  warehouseName: string
  topByVolume: TopSupplier[]
  topByHarga: TopSupplier[]
}

interface Props {
  warehouseTopData: WarehouseTopData[]
}

export default function TopLapakAnalytics({ warehouseTopData }: Props) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouseTopData[0]?.warehouseId || "")
  const [mode, setMode] = useState<"volume" | "harga">("volume")

  const activeWarehouse = warehouseTopData.find(w => w.warehouseId === selectedWarehouseId)
  const suppliers = mode === "volume"
    ? activeWarehouse?.topByVolume || []
    : activeWarehouse?.topByHarga || []
  const topSupplier = suppliers[0]
  const modeTitle = mode === "volume" ? "Volume pembelian" : "Harga rata-rata"
  const warehouseOptions = warehouseTopData.map(w => ({
    value: w.warehouseId,
    label: `Gudang ${w.warehouseName}`,
  }))

  return (
    <div className="interactive-surface overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/60 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase" style={{ color: "var(--brand-strong)" }}>Lapak performance</span>
            <h3 className="mt-1 text-base font-bold text-slate-950">Top 10 Lapak / Supplier</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Peringkat supplier berdasarkan volume atau harga rata-rata per gudang.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            {/* Warehouse selector */}
            <ElegantSelect
              value={selectedWarehouseId}
              options={warehouseOptions}
              onChange={setSelectedWarehouseId}
              ariaLabel="Pilih gudang supplier"
              className="w-full sm:w-44"
              menuClassName="sm:w-52"
            />

            {/* Mode toggle (segmented control) */}
            <div className="grid grid-cols-2 rounded-lg p-1" style={{ background: "var(--bg-tint)" }}>
              <button
                onClick={() => setMode("volume")}
                className="px-3 py-2 rounded-md text-xs font-bold transition-all"
                style={mode === "volume"
                  ? { background: "var(--surface)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(20,24,26,0.12)" }
                  : { color: "var(--muted)" }}
              >
                Volume
              </button>
              <button
                onClick={() => setMode("harga")}
                className="px-3 py-2 rounded-md text-xs font-bold transition-all"
                style={mode === "harga"
                  ? { background: "var(--surface)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(20,24,26,0.12)" }
                  : { color: "var(--muted)" }}
              >
                Harga
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {suppliers.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-12">
            <p>Belum ada data transaksi untuk gudang ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topSupplier && (
              <div className="rounded-lg p-5 text-white shadow-sm" style={{ background: "var(--brand-strong)" }}>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-slate-500">{modeTitle} teratas</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-2xl font-black tracking-normal text-white">{topSupplier.nama}</h4>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-200">Rank 1</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {mode === "volume"
                        ? `Kontributor volume terbesar di ${activeWarehouse?.warehouseName || "gudang ini"}.`
                        : `Harga rata-rata tertinggi di ${activeWarehouse?.warehouseName || "gudang ini"}.`}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-500">Volume</p>
                      <p className="mt-1 whitespace-nowrap font-mono text-base font-black leading-tight text-white">{fmtKg(topSupplier.totalKg)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-500">Harga avg</p>
                      <p className="mt-1 whitespace-nowrap font-mono text-base font-black leading-tight text-white">{fmtRpPerKg(topSupplier.avgHarga)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-500">Transaksi</p>
                      <p className="mt-1 whitespace-nowrap font-mono text-base font-black leading-tight text-white">{fmtAngka(topSupplier.transaksi)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[64px_minmax(180px,1.5fr)_repeat(3,minmax(120px,1fr))] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase text-slate-500">
                <span>Rank</span>
                <span>Lapak</span>
                <span>{mode === "volume" ? "Volume" : "Harga avg"}</span>
                <span>{mode === "volume" ? "Harga avg" : "Volume"}</span>
                <span className="text-center">Transaksi</span>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {suppliers.map((s, i) => (
                  <div key={s.supplierId} className="grid gap-4 px-4 py-4 text-sm transition-colors hover:bg-slate-50 lg:grid-cols-[64px_minmax(180px,1.5fr)_repeat(3,minmax(120px,1fr))] lg:items-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black ${i === 0 ? "text-white" : "bg-slate-100 text-slate-600"}`}
                      style={i === 0 ? { background: "var(--brand-strong)" } : undefined}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-slate-950">{s.nama}</p>
                        {i === 0 && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Teratas</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{fmtAngka(s.transaksi)} transaksi tercatat</p>
                    </div>
                    <p className="font-mono font-bold text-slate-950">{mode === "volume" ? fmtKg(s.totalKg) : fmtRpPerKg(s.avgHarga)}</p>
                    <p className="font-mono font-semibold text-slate-700">{mode === "volume" ? fmtRpPerKg(s.avgHarga) : fmtKg(s.totalKg)}</p>
                    <p className="text-center font-mono font-semibold text-slate-700">{fmtAngka(s.transaksi)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
