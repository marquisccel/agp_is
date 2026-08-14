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
  // topByVolume/topByHarga sudah diurutkan menurun di manager/page.tsx, jadi
  // elemen pertama adalah nilai maksimum -- dipakai sebagai acuan lebar bar.
  const maxValue = suppliers[0] ? (mode === "volume" ? suppliers[0].totalKg : suppliers[0].avgHarga) : 0
  const warehouseOptions = warehouseTopData.map(w => ({
    value: w.warehouseId,
    label: `Gudang ${w.warehouseName}`,
  }))

  return (
    <div className="section">
      {/* Header */}
      <div className="section-shell-head">
        <div className="min-w-0">
          <p className="section-eyebrow">Lapak performance</p>
          <h3 className="text-[15.5px] font-bold text-slate-950">Top 10 Lapak / Supplier</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Peringkat supplier berdasarkan volume atau harga rata-rata per gudang.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <ElegantSelect
            value={selectedWarehouseId}
            options={warehouseOptions}
            onChange={setSelectedWarehouseId}
            ariaLabel="Pilih gudang supplier"
            className="w-full sm:w-44"
            menuClassName="sm:w-52"
          />
          <div className="segmented grid grid-cols-2 sm:flex">
            <button onClick={() => setMode("volume")} className={mode === "volume" ? "active" : ""}>Volume</button>
            <button onClick={() => setMode("harga")} className={mode === "harga" ? "active" : ""}>Harga</button>
          </div>
        </div>
      </div>

      <div className="p-5">
        {suppliers.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-12">
            <p>Belum ada data transaksi untuk gudang ini.</p>
          </div>
        ) : (
          <div className="rank-list">
            {suppliers.map((s, i) => {
              const value = mode === "volume" ? s.totalKg : s.avgHarga
              const widthPct = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 0
              return (
                <div key={s.supplierId} className={`rank-row ${i === 0 ? "rank-first" : ""}`}>
                  <span className="rank-num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <div className="rank-name truncate">{s.nama}</div>
                    <div className="rank-sub">
                      {fmtAngka(s.transaksi)} transaksi · {mode === "volume" ? fmtRpPerKg(s.avgHarga) : fmtKg(s.totalKg)}
                    </div>
                  </div>
                  <div className="rank-bar-track">
                    <div className="rank-bar-fill" style={{ width: `${widthPct}%` }} />
                  </div>
                  <div className="rank-value font-mono">
                    {mode === "volume" ? fmtKg(s.totalKg) : fmtRpPerKg(s.avgHarga)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
