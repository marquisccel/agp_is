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
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="w-8 pb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">#</th>
                <th className="pb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Lapak</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Volume</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Harga rata-rata</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => {
                const isTop = i === 0
                return (
                  <tr key={s.supplierId} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2.5 font-mono text-[11px] font-bold tabular-nums" style={{ color: isTop ? "var(--brand-strong)" : "var(--muted-faint)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800">{s.nama}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold" style={mode === "volume" ? { color: "var(--brand-strong)" } : undefined}>
                      {fmtKg(s.totalKg)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold" style={mode === "harga" ? { color: "var(--brand-strong)" } : undefined}>
                      {fmtRpPerKg(s.avgHarga)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-500">{fmtAngka(s.transaksi)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
