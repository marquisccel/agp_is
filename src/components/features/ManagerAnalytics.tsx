"use client"

import { useState, type ReactNode } from "react"
import type { Warehouse } from "@prisma/client"
import { fmtKg, fmtAngka, fmtTon, fmtRpPerKg } from "@/lib/format"
import ElegantSelect from "@/components/ui/ElegantSelect"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
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
  yearlyData: { label: string; weight: number; target?: number | null }[]
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
  const labelMap: Record<string, { weight: number; target: number | null }> = {}
  for (const d of values) {
    for (const entry of d.yearlyData) {
      if (!labelMap[entry.label]) labelMap[entry.label] = { weight: 0, target: null }
      labelMap[entry.label].weight += entry.weight
      labelMap[entry.label].target = (labelMap[entry.label].target ?? 0) + (entry.target ?? 0)
    }
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  const yearlyData = Object.entries(labelMap)
    .map(([label, value]) => ({ label, weight: value.weight, target: value.target && value.target > 0 ? value.target : null }))
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

type TooltipPayloadEntry = { name: string; value: number | string; color: string }

// Custom tooltip for chart
const CustomTooltip = ({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  unit: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-3 text-xs min-w-[140px]">
      <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 mb-1">
          <span style={{ color: p.color }} className="font-semibold">{p.name}</span>
          <span className="font-mono text-slate-800">{fmtAngka(Number(p.value || 0), 2)} {unit}</span>
        </div>
      ))}
    </div>
  )
}

const DotLegend = ({
  items,
  className = "",
}: {
  items: { label: string; color: string }[]
  className?: string
}) => (
  <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 ${className}`}>
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5 leading-none">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
        {item.label}
      </span>
    ))}
  </div>
)

const DashedLineNote = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex min-w-0 items-center gap-2 text-xs leading-none text-slate-400">
    <span className="inline-block w-6 border-t-2 border-dashed border-amber-400" />
    <span className="truncate">{children}</span>
  </span>
)

const TargetMetricCard = ({
  label,
  period,
  actual,
  target,
  percent,
}: {
  label: string
  period: string
  actual: number
  target: number
  percent: number
}) => {
  const hasTarget = target > 0
  const remaining = Math.max(target - actual, 0)
  const isComplete = hasTarget && actual >= target

  return (
    <div className="bg-white p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-1 text-xs text-slate-400">{period}</p>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-bold ${
            isComplete
              ? "bg-emerald-50 text-emerald-700"
              : hasTarget
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {hasTarget ? `${percent.toFixed(0)}%` : "N/A"}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-950">{fmtTon(actual)}</span>
        <span className="mb-1 text-sm font-semibold text-slate-400">/ {hasTarget ? fmtTon(target) : "-"}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isComplete ? "bg-emerald-500" : "bg-teal-600"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={`mt-3 text-xs font-medium ${isComplete ? "text-emerald-600" : hasTarget ? "text-amber-700" : "text-slate-400"}`}>
        {hasTarget ? (isComplete ? "Target tercapai" : `Kurang ${fmtTon(remaining)} lagi`) : "Target belum diatur"}
      </p>
    </div>
  )
}

const TargetSummaryCard = ({
  name,
  target,
  realisasi,
}: {
  name: string
  target: number
  realisasi: number
}) => {
  const percent = target > 0 ? Math.min((realisasi / target) * 100, 100) : 0
  const gap = Math.max(target - realisasi, 0)
  const isComplete = target > 0 && realisasi >= target

  return (
    <div className="grid gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)_120px] sm:items-center">
      <div>
        <p className="text-sm font-bold text-slate-950">{name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {isComplete ? "Target tercapai" : target > 0 ? `Kurang ${fmtAngka(gap, 2)} ton` : "Target belum diatur"}
        </p>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="font-mono font-bold text-slate-950">{fmtAngka(realisasi, 2)} ton</span>
          <span className="font-mono font-semibold text-slate-400">{fmtAngka(target, 2)} ton</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isComplete ? "bg-emerald-500" : "bg-sky-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="sm:text-right">
        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${isComplete ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {target > 0 ? `${percent.toFixed(0)}%` : "N/A"}
        </span>
      </div>
    </div>
  )
}

export default function ManagerAnalytics({
  warehouses,
  dataMap,
  skuPricesMap
}: {
  warehouses: Warehouse[]
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
  ].map((item) => ({
    ...item,
    Max: Math.max(item.Target, item.Realisasi, 1),
  }))

  // Chart data & config based on selected mode
  const chartConfig: {
    data: { label: string; Pembelian: number; Target: number }[]
    xKey: string
    unit: string
    title: string
    description: string
    gradientId: string
    areaColor: string
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
          areaColor: "#0f766e",
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
          areaColor: "#0f766e",
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
          areaColor: "#0f766e",
          lineColor: "#f59e0b",
          showTarget: activeData.target_bulanan > 0,
          targetKey: "Target",
        }
    }
  })()
  const currentSkuPrices = skuPricesMap ? (skuPricesMap[selectedWarehouseId] || []) : []
  const hasSKUData = currentSkuPrices.length > 0

  // Reconstruct and calculate grand totals for the SKU pricing summary
  const grandTotalAllKg = currentSkuPrices.reduce((sum, item) => sum + item.all_kg, 0)

  const grandTotalAllVal = currentSkuPrices.reduce((sum, item) => sum + (item.all_avg * item.all_kg), 0)

  const grandAvgAllPrice = grandTotalAllKg > 0 ? grandTotalAllVal / grandTotalAllKg : 0

  const chartModes: { key: ChartMode; label: string }[] = [
    { key: "harian", label: "Harian" },
    { key: "mingguan", label: "Mingguan" },
    { key: "bulanan", label: "Bulanan" },
  ]
  const warehouseOptions = [
    { value: "all", label: "Semua Gudang" },
    ...warehouses.map(w => ({
      value: w.id,
      label: `Collection Center ${w.nama.replace(/^Gudang\s+/i, "")}`,
    })),
  ]

  return (
    <div className="space-y-5">
      {/* Performance Cockpit */}
      <div className="interactive-surface overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase text-teal-700">Performance cockpit</span>
              <h3 className="mt-1 text-lg font-bold text-slate-950">Target vs Realisasi Collection Center</h3>
              <p className="mt-1 text-sm text-slate-500">
                Bandingkan realisasi tonase terhadap target operasional untuk periode aktif.
              </p>
            </div>
            <ElegantSelect
              value={selectedWarehouseId}
              options={warehouseOptions}
              onChange={setSelectedWarehouseId}
              ariaLabel="Pilih collection center"
              className="w-full sm:w-64"
              menuClassName="sm:w-72"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <TargetMetricCard
            label="Target Harian"
            period="Hari ini"
            actual={activeData.actual_harian}
            target={activeData.target_harian}
            percent={pctHarian}
          />
          <TargetMetricCard
            label="Target Mingguan"
            period="Minggu ini"
            actual={activeData.actual_mingguan}
            target={activeData.target_mingguan}
            percent={pctMingguan}
          />
          <TargetMetricCard
            label="Target Bulanan"
            period="Bulan ini"
            actual={activeData.actual_bulanan}
            target={activeData.target_bulanan}
            percent={pctBulanan}
          />
        </div>
      </div>
      {/* Chart Section - Full Width with mode toggle */}
      <div className="interactive-surface overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Chart Header + Mode Toggle */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/60 p-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h4 className="mb-1 text-base font-bold text-slate-950">{chartConfig.title}</h4>
            <p className="text-xs leading-5 text-slate-500">{chartConfig.description}</p>
          </div>
          {/* Toggle Buttons */}
          <div className="grid w-full grid-cols-3 items-center gap-1 self-start rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:w-auto sm:flex sm:self-auto sm:shrink-0">
            {chartModes.map(mode => (
              <button
                key={mode.key}
                onClick={() => setChartMode(mode.key)}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                  chartMode === mode.key
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="p-4 sm:p-6">
          {chartConfig.data.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center sm:h-80">
              <div className="max-w-sm">
                <p className="text-sm font-bold text-slate-700">Belum ada data tren untuk periode ini</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Grafik akan muncul setelah ada transaksi pembelian atau target yang tercatat pada rentang periode aktif.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative h-64 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartConfig.data} margin={{ top: 6, right: 36, left: 8, bottom: 10 }}>
                  <defs>
                    <linearGradient id={chartConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartConfig.areaColor} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={chartConfig.areaColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey={chartConfig.xKey}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickMargin={8}
                    padding={{ left: 18, right: 18 }}
                    interval={chartMode === "harian" ? 2 : 0}
                  />
                  <YAxis
                    width={36}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(v) => `${fmtAngka(v, v % 1 === 0 ? 0 : 1)}`}
                  />
                  <Tooltip
                    content={<CustomTooltip unit="ton" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="Pembelian"
                    stroke={chartConfig.areaColor}
                    strokeWidth={2.5}
                    fill={`url(#${chartConfig.gradientId})`}
                    fillOpacity={1}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: chartConfig.areaColor }}
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

          <div className="mt-4 grid grid-cols-1 items-start gap-3 pr-9 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            {chartConfig.showTarget ? (
              <DashedLineNote>
                Garis kuning = target {chartMode === "harian" ? "harian" : chartMode === "mingguan" ? "mingguan" : "bulanan"}
              </DashedLineNote>
            ) : (
              <span />
            )}
            <DotLegend
              className="justify-end whitespace-nowrap"
              items={[
                { label: "Pembelian", color: chartConfig.areaColor },
                ...(chartConfig.showTarget ? [{ label: "Target", color: chartConfig.lineColor }] : []),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Target vs Realisasi Summary */}
      <div className="interactive-surface overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 p-5">
          <h4 className="mb-1 text-base font-bold text-slate-950">Ringkasan Target vs Realisasi</h4>
          <p className="text-xs leading-5 text-slate-500">Status pencapaian target dalam bahasa operasional yang mudah dibaca.</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="divide-y divide-slate-100">
            {comparisonData.map((item) => (
              <TargetSummaryCard
                key={item.name}
                name={item.name}
                target={item.Target}
                realisasi={item.Realisasi}
              />
            ))}
          </div>
        </div>
      </div>

      {/* SKU Price Table */}
      <div className="interactive-surface overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 p-5">
          <div>
            <span className="text-xs font-bold uppercase text-teal-700">SKU pricing</span>
            <h4 className="mt-1 text-base font-bold text-slate-950">
              Rata-rata Harga Pembelian per SKU &amp; Spesifikasi ({selectedWarehouseId === "all" ? "Semua Gudang" : (dataMap[selectedWarehouseId]?.nama || "Gudang")})
            </h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Harga rata-rata tertimbang per kilogram berdasarkan spesifikasi pembelian untuk {selectedWarehouseId === "all" ? "seluruh gudang" : (dataMap[selectedWarehouseId]?.nama || "gudang")}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
        {hasSKUData ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Harga rata-rata periode ini</p>
                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="font-mono text-3xl font-bold">{grandTotalAllKg > 0 ? fmtRpPerKg(grandAvgAllPrice) : "-"}</span>
                  <span className="pb-1 text-sm font-semibold text-slate-400">{fmtKg(grandTotalAllKg)} total volume</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[minmax(150px,1.2fr)_minmax(150px,1fr)_minmax(220px,1.4fr)] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase text-slate-500">
                <span>SKU</span>
                <span>Harga & volume</span>
                <span>Breakdown spesifikasi</span>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
              {currentSkuPrices.map((row) => {
                const pctVol = grandTotalAllKg > 0 ? (row.all_kg / grandTotalAllKg) * 100 : 0
                return (
                  <div key={row.sku_name} className="grid gap-4 px-4 py-4 text-sm lg:grid-cols-[minmax(150px,1.2fr)_minmax(150px,1fr)_minmax(220px,1.4fr)] lg:items-center">
                    <div>
                      <p className="font-bold text-slate-950">{row.sku_name}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{pctVol.toFixed(1)}% dari total volume periode ini</p>
                    </div>
                    <div>
                      <p className="font-mono text-base font-bold text-slate-950">{row.all_kg > 0 ? fmtRpPerKg(row.all_avg) : "-"}</p>
                      <p className="text-xs font-medium text-slate-400">{row.all_kg > 0 ? fmtKg(row.all_kg) : "Tidak ada transaksi"}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase text-slate-500">Gabyuk</p>
                          <p className="font-mono text-sm font-bold text-slate-950">{row.gabyuk_kg > 0 ? fmtRpPerKg(row.gabyuk_avg) : "-"}</p>
                          <p className="text-xs text-slate-500">{row.gabyuk_kg > 0 ? fmtKg(row.gabyuk_kg) : "0 KG"}</p>
                        </div>
                        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase text-slate-500">Grading</p>
                          <p className="font-mono text-sm font-bold text-slate-950">{row.grading_kg > 0 ? fmtRpPerKg(row.grading_avg) : "-"}</p>
                          <p className="text-xs text-slate-500">{row.grading_kg > 0 ? fmtKg(row.grading_kg) : "0 KG"}</p>
                        </div>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
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
    </div>
  )
}
