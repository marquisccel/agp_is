"use client"

import { useState } from "react"
import { fmtKg, fmtAngka, fmtTon, fmtRpPerKg } from "@/lib/format"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts"

interface WarehouseData {
  id: string
  nama: string
  target_harian: number
  target_mingguan: number
  target_bulanan: number
  actual_harian: number
  actual_mingguan: number
  actual_bulanan: number
  yearlyData: { label: string; weight: number }[]
  dailyData: { label: string; weight: number; target: number }[]
  weeklyData: { label: string; weight: number; target: number }[]
}

interface SkuPriceData {
  sku_name: string
  gabyuk_avg: number
  gabyuk_kg: number
  grading_avg: number
  grading_kg: number
  all_avg: number
  all_kg: number
}

type ChartMode = "harian" | "mingguan" | "bulanan"

/** Aggregate all warehouse data into a single virtual WarehouseData */
function aggregateAll(dataMap: Record<string, WarehouseData>): WarehouseData {
  const values = Object.values(dataMap)

  const target_harian   = values.reduce((s, d) => s + d.target_harian, 0)
  const target_mingguan = values.reduce((s, d) => s + d.target_mingguan, 0)
  const target_bulanan  = values.reduce((s, d) => s + d.target_bulanan, 0)
  const actual_harian   = values.reduce((s, d) => s + d.actual_harian, 0)
  const actual_mingguan = values.reduce((s, d) => s + d.actual_mingguan, 0)
  const actual_bulanan  = values.reduce((s, d) => s + d.actual_bulanan, 0)

  // Merge yearlyData by label
  const labelMap: Record<string, number> = {}
  for (const d of values) {
    for (const entry of d.yearlyData) {
      labelMap[entry.label] = (labelMap[entry.label] ?? 0) + entry.weight
    }
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  const yearlyData = Object.entries(labelMap)
    .map(([label, weight]) => ({ label, weight }))
    .sort((a, b) => {
      const parseLabel = (l: string) => {
        const [mon, yr] = l.split(" ")
        const normalizedMonth = mon.replace(".", "").toLowerCase()
        const mIdx = months.findIndex(m => m.toLowerCase() === normalizedMonth)
        return parseInt(yr, 10) * 12 + (mIdx >= 0 ? mIdx : 0)
      }
      return parseLabel(a.label) - parseLabel(b.label)
    })

  // Merge dailyData by label (same day number)
  const dailyMap: Record<string, { weight: number; target: number }> = {}
  for (const d of values) {
    for (const entry of d.dailyData) {
      if (!dailyMap[entry.label]) dailyMap[entry.label] = { weight: 0, target: 0 }
      dailyMap[entry.label].weight += entry.weight
      dailyMap[entry.label].target += entry.target
    }
  }
  const dailyData = Object.entries(dailyMap)
    .map(([label, v]) => ({ label, weight: v.weight, target: v.target }))
    .sort((a, b) => parseInt(a.label) - parseInt(b.label))

  // Merge weeklyData by label
  const weeklyMap: Record<string, { weight: number; target: number }> = {}
  for (const d of values) {
    for (const entry of d.weeklyData) {
      if (!weeklyMap[entry.label]) weeklyMap[entry.label] = { weight: 0, target: 0 }
      weeklyMap[entry.label].weight += entry.weight
      weeklyMap[entry.label].target += entry.target
    }
  }
  const weeklyData = Object.values(
    Object.entries(weeklyMap).reduce((acc, [label, v]) => {
      acc[label] = { label, ...v }
      return acc
    }, {} as Record<string, { label: string; weight: number; target: number }>)
  )

  return {
    id: "all",
    nama: "Semua Gudang",
    target_harian,
    target_mingguan,
    target_bulanan,
    actual_harian,
    actual_mingguan,
    actual_bulanan,
    yearlyData,
    dailyData,
    weeklyData,
  }
}

// Custom tooltip for chart
const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-3 text-xs min-w-[140px]">
      <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4 mb-1">
          <span style={{ color: p.color }} className="font-semibold">{p.name}</span>
          <span className="font-mono text-slate-800">{fmtAngka(Number(p.value || 0), 2)} {unit}</span>
        </div>
      ))}
    </div>
  )
}

export default function ManagerAnalytics({
  warehouses,
  dataMap,
  skuPricesMap
}: {
  warehouses: any[]
  dataMap: Record<string, WarehouseData>
  skuPricesMap?: Record<string, SkuPriceData[]>
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all")
  const [chartMode, setChartMode] = useState<ChartMode>("bulanan")

  const activeData: WarehouseData | undefined =
    selectedWarehouseId === "all"
      ? aggregateAll(dataMap)
      : dataMap[selectedWarehouseId]

  if (!activeData) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-slate-400">
        Belum ada data untuk dianalisis.
      </div>
    )
  }

  // Percentages
  const pctHarian   = activeData.target_harian   > 0 ? Math.min((activeData.actual_harian   / activeData.target_harian)   * 100, 100) : 0
  const pctMingguan = activeData.target_mingguan > 0 ? Math.min((activeData.actual_mingguan / activeData.target_mingguan) * 100, 100) : 0
  const pctBulanan  = activeData.target_bulanan  > 0 ? Math.min((activeData.actual_bulanan  / activeData.target_bulanan)  * 100, 100) : 0

  // Comparison Bar Chart (Target vs Realisasi summary)
  const comparisonData = [
    { name: "Harian",   Target: activeData.target_harian   / 1000, Realisasi: activeData.actual_harian   / 1000 },
    { name: "Mingguan", Target: activeData.target_mingguan / 1000, Realisasi: activeData.actual_mingguan / 1000 },
    { name: "Bulanan",  Target: activeData.target_bulanan  / 1000, Realisasi: activeData.actual_bulanan  / 1000 },
  ]

  // Chart data & config based on selected mode
  const chartConfig: {
    data: any[]
    xKey: string
    unit: string
    title: string
    description: string
    gradientId: string
    barColor: string
    lineColor: string
    showTarget: boolean
    targetKey: string
  } = (() => {
    switch (chartMode) {
      case "harian":
        return {
          data: (activeData.dailyData || []).map(d => ({
            label: d.label,
            Pembelian: d.weight / 1000,
            Target: d.target / 1000,
          })),
          xKey: "label",
          unit: "ton",
          title: "Pembelian Harian",
          description: `Realisasi pembelian per hari dalam bulan ini (ton) vs target harian`,
          gradientId: "colorHarian",
          barColor: "#06b6d4",
          lineColor: "#f59e0b",
          showTarget: activeData.target_harian > 0,
          targetKey: "Target",
        }
      case "mingguan":
        return {
          data: (activeData.weeklyData || []).map(d => ({
            label: d.label,
            Pembelian: d.weight / 1000,
            Target: d.target / 1000,
          })),
          xKey: "label",
          unit: "ton",
          title: "Pembelian Mingguan",
          description: `Realisasi pembelian per minggu dalam 8 minggu terakhir (ton) vs target mingguan`,
          gradientId: "colorMingguan",
          barColor: "#8b5cf6",
          lineColor: "#f59e0b",
          showTarget: activeData.target_mingguan > 0,
          targetKey: "Target",
        }
      case "bulanan":
      default:
        return {
          data: (activeData.yearlyData || []).map(d => ({
            label: d.label,
            Pembelian: d.weight / 1000,
            Target: activeData.target_bulanan / 1000,
          })),
          xKey: "label",
          unit: "ton",
          title: "Tren Pembelian Bulanan",
          description: `Total pembelian PET per bulan dalam 12 bulan terakhir (ton)`,
          gradientId: "colorBulanan",
          barColor: "#6366f1",
          lineColor: "#f59e0b",
          showTarget: activeData.target_bulanan > 0,
          targetKey: "Target",
        }
    }
  })()

  const currentSkuPrices = skuPricesMap ? (skuPricesMap[selectedWarehouseId] || []) : []
  const hasSKUData = currentSkuPrices.length > 0

  // Reconstruct and calculate grand totals for the table footer
  const grandTotalAllKg = currentSkuPrices.reduce((sum, item) => sum + item.all_kg, 0)
  const grandTotalGabyukKg = currentSkuPrices.reduce((sum, item) => sum + item.gabyuk_kg, 0)
  const grandTotalGradingKg = currentSkuPrices.reduce((sum, item) => sum + item.grading_kg, 0)

  const grandTotalAllVal = currentSkuPrices.reduce((sum, item) => sum + (item.all_avg * item.all_kg), 0)
  const grandTotalGabyukVal = currentSkuPrices.reduce((sum, item) => sum + (item.gabyuk_avg * item.gabyuk_kg), 0)
  const grandTotalGradingVal = currentSkuPrices.reduce((sum, item) => sum + (item.grading_avg * item.grading_kg), 0)

  const grandAvgAllPrice = grandTotalAllKg > 0 ? grandTotalAllVal / grandTotalAllKg : 0
  const grandAvgGabyukPrice = grandTotalGabyukKg > 0 ? grandTotalGabyukVal / grandTotalGabyukKg : 0
  const grandAvgGradingPrice = grandTotalGradingKg > 0 ? grandTotalGradingVal / grandTotalGradingKg : 0

  const chartModes: { key: ChartMode; label: string; icon: string }[] = [
    { key: "harian",   label: "Harian",   icon: "📅" },
    { key: "mingguan", label: "Mingguan", icon: "📆" },
    { key: "bulanan",  label: "Bulanan",  icon: "📊" },
  ]

  return (
    <div className="space-y-6">
      {/* Selector Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Pilih Collection Center
          </span>
          <h3 className="text-lg font-bold text-slate-800">
            Analisis Target vs Realisasi
          </h3>
        </div>
        <select
          value={selectedWarehouseId}
          onChange={(e) => setSelectedWarehouseId(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none text-slate-700 font-semibold cursor-pointer transition-all"
        >
          <option value="all">Semua Gudang</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              Collection Center {w.nama.replace(/^Gudang\s+/i, "")}
            </option>
          ))}
        </select>
      </div>

      {/* Target Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Harian */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Harian</p>
                <p className="text-xs text-slate-400 mt-0.5">Hari ini</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pctHarian >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-cyan-50 text-cyan-700"}`}>
                {pctHarian.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-extrabold text-slate-900">{fmtTon(activeData.actual_harian)}</span>
              <span className="text-slate-400 text-sm mb-1">/ {activeData.target_harian > 0 ? fmtTon(activeData.target_harian) : "—"}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${pctHarian >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-500 to-blue-500"}`}
                style={{ width: `${pctHarian}%` }}
              />
            </div>
          </div>
          <div>
            {activeData.target_harian > 0 ? (
              activeData.target_harian > activeData.actual_harian ? (
                <p className="text-xs text-orange-600 font-medium">Kurang {fmtTon(activeData.target_harian - activeData.actual_harian)} lagi</p>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">🎉 Target harian tercapai!</p>
              )
            ) : (
              <p className="text-xs text-slate-400 italic">Target belum diatur</p>
            )}
          </div>
        </div>

        {/* Mingguan */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Mingguan</p>
                <p className="text-xs text-slate-400 mt-0.5">Minggu ini</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pctMingguan >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>
                {pctMingguan.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-extrabold text-slate-900">{fmtTon(activeData.actual_mingguan)}</span>
              <span className="text-slate-400 text-sm mb-1">/ {activeData.target_mingguan > 0 ? fmtTon(activeData.target_mingguan) : "—"}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${pctMingguan >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-purple-500"}`}
                style={{ width: `${pctMingguan}%` }}
              />
            </div>
          </div>
          <div>
            {activeData.target_mingguan > 0 ? (
              activeData.target_mingguan > activeData.actual_mingguan ? (
                <p className="text-xs text-violet-600 font-medium">Kurang {fmtTon(activeData.target_mingguan - activeData.actual_mingguan)} lagi</p>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">🎉 Target mingguan tercapai!</p>
              )
            ) : (
              <p className="text-xs text-slate-400 italic">Target belum diatur</p>
            )}
          </div>
        </div>

        {/* Bulanan */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Bulanan</p>
                <p className="text-xs text-slate-400 mt-0.5">Bulan ini</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pctBulanan >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>
                {pctBulanan.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-extrabold text-slate-900">{fmtTon(activeData.actual_bulanan)}</span>
              <span className="text-slate-400 text-sm mb-1">/ {activeData.target_bulanan > 0 ? fmtTon(activeData.target_bulanan) : "—"}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${pctBulanan >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                style={{ width: `${pctBulanan}%` }}
              />
            </div>
          </div>
          <div>
            {activeData.target_bulanan > 0 ? (
              activeData.target_bulanan > activeData.actual_bulanan ? (
                <p className="text-xs text-indigo-600 font-medium">Kurang {fmtTon(activeData.target_bulanan - activeData.actual_bulanan)} lagi</p>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">🎉 Target bulanan tercapai!</p>
              )
            ) : (
              <p className="text-xs text-slate-400 italic">Target belum diatur</p>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section — Full Width with mode toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Chart Header + Mode Toggle */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-slate-800 font-bold text-base mb-1">{chartConfig.title}</h4>
            <p className="text-xs text-slate-500">{chartConfig.description}</p>
          </div>
          {/* Toggle Buttons */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 self-start sm:self-auto">
            {chartModes.map(mode => (
              <button
                key={mode.key}
                onClick={() => setChartMode(mode.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                  chartMode === mode.key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span>{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="p-6">
          {chartConfig.data.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Belum ada data transaksi untuk periode ini
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartConfig.data} margin={{ left: -5, right: 10 }}>
                  <defs>
                    <linearGradient id={chartConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartConfig.barColor} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={chartConfig.barColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey={chartConfig.xKey}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    interval={chartMode === "harian" ? 2 : 0}
                  />
                  <YAxis
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(v) => `${fmtAngka(v, v % 1 === 0 ? 0 : 1)}`}
                  />
                  <Tooltip
                    content={<CustomTooltip unit="ton" />}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  />
                  <Bar
                    dataKey="Pembelian"
                    fill={chartConfig.barColor}
                    radius={[4, 4, 0, 0]}
                    barSize={chartMode === "harian" ? 12 : chartMode === "mingguan" ? 28 : 20}
                    opacity={0.85}
                  />
                  {chartConfig.showTarget && (
                    <Line
                      type="monotone"
                      dataKey="Target"
                      stroke={chartConfig.lineColor}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                      name="Target"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend info */}
          {chartConfig.showTarget && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
              <span className="inline-block w-6 border-t-2 border-dashed border-amber-400" />
              Garis kuning = target {chartMode === "harian" ? "harian" : chartMode === "mingguan" ? "mingguan" : "bulanan"}
            </p>
          )}
        </div>
      </div>

      {/* Target vs Realisasi Summary Bar Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h4 className="text-slate-800 font-bold text-base mb-1">Ringkasan Target vs Realisasi</h4>
        <p className="text-xs text-slate-500 mb-5">Perbandingan performa target harian, mingguan, dan bulanan (ton)</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={comparisonData} margin={{ left: -5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                formatter={(value) => {
                  const val = Number(value || 0)
                  return [`${fmtAngka(val, 2)} ton`]
                }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="Target"    fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={32} />
              <Bar dataKey="Realisasi" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SKU Price Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-slate-800 font-bold text-base mb-1">
              Rata-rata Harga Pembelian per SKU &amp; Spesifikasi ({selectedWarehouseId === "all" ? "Semua Gudang" : (dataMap[selectedWarehouseId]?.nama || "Gudang")})
            </h4>
            <p className="text-xs text-slate-500">
              Harga rata-rata tertimbang per kilogram berdasarkan spesifikasi pembelian untuk {selectedWarehouseId === "all" ? "seluruh gudang" : (dataMap[selectedWarehouseId]?.nama || "gudang")}
            </p>
          </div>
        </div>

        {hasSKUData ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="sticky left-0 z-10 bg-slate-800 text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">SKU</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">All — Avg/KG</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">All — Total KG</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap text-cyan-400">% Vol</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap border-l border-slate-600">Gabyuk — Avg/KG</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Gabyuk — Total KG</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap border-l border-slate-600">Grading — Avg/KG</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Grading — Total KG</th>
                </tr>
              </thead>
              <tbody>
                {currentSkuPrices.map((row, idx) => {
                  const pctVol = grandTotalAllKg > 0 ? (row.all_kg / grandTotalAllKg) * 100 : 0
                  return (
                    <tr
                      key={row.sku_name}
                      className={`transition-colors hover:bg-cyan-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                    >
                      <td className={`sticky left-0 z-10 px-4 py-3 font-semibold text-slate-800 whitespace-nowrap ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                        {row.sku_name}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {row.all_kg > 0 ? fmtRpPerKg(row.all_avg) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                        {row.all_kg > 0 ? fmtKg(row.all_kg) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-cyan-600 whitespace-nowrap">
                        {row.all_kg > 0 ? `${pctVol.toFixed(1)}%` : "0%"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap border-l border-slate-100">
                        {row.gabyuk_kg > 0 ? fmtRpPerKg(row.gabyuk_avg) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                        {row.gabyuk_kg > 0 ? fmtKg(row.gabyuk_kg) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap border-l border-slate-100">
                        {row.grading_kg > 0 ? fmtRpPerKg(row.grading_avg) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                        {row.grading_kg > 0 ? fmtKg(row.grading_kg) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-350">
                  <td className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left text-slate-800">TOTAL / AVG TERTEMBANG</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">{grandTotalAllKg > 0 ? fmtRpPerKg(grandAvgAllPrice) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">{grandTotalAllKg > 0 ? fmtKg(grandTotalAllKg) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">{grandTotalAllKg > 0 ? "100.0%" : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-800 border-l border-slate-200 font-mono">{grandTotalGabyukKg > 0 ? fmtRpPerKg(grandAvgGabyukPrice) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">{grandTotalGabyukKg > 0 ? fmtKg(grandTotalGabyukKg) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-800 border-l border-slate-200 font-mono">{grandTotalGradingKg > 0 ? fmtRpPerKg(grandAvgGradingPrice) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">{grandTotalGradingKg > 0 ? fmtKg(grandTotalGradingKg) : "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">Belum ada data harga SKU</p>
            <p className="text-xs text-slate-300 mt-1">Data akan muncul setelah ada transaksi pembelian</p>
          </div>
        )}
      </div>
    </div>
  )
}
