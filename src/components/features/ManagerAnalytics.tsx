"use client"

import { useState, type ReactNode } from "react"
import type { Warehouse } from "@prisma/client"
import { fmtKg, fmtAngka, fmtTon, fmtRpPerKg } from "@/lib/format"
import Link from "next/link"
import { Target } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import SkuPriceChart from "@/components/features/SkuPriceChart"
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
import { namaGudang } from "@/lib/namaGudang"

export interface WarehouseData {
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

const RING_RADIUS = 27
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

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
  const truePercent = hasTarget ? (actual / target) * 100 : 0
  const ringColor = isComplete ? "var(--success)" : "var(--brand)"
  const ringOffset = RING_CIRCUMFERENCE * (1 - percent / 100)

  return (
    <div className="target-card">
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${truePercent.toFixed(0)} persen tercapai`}>
        <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="var(--bg-tint)" strokeWidth="7" />
        {hasTarget && (
          <circle
            cx="32" cy="32" r={RING_RADIUS} fill="none"
            stroke={ringColor} strokeWidth="7"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        )}
        <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--foreground)">
          {hasTarget ? `${truePercent.toFixed(0)}%` : "N/A"}
        </text>
      </svg>
      <div className="target-info min-w-0">
        <p className="t-label">{label} <span className="font-normal normal-case text-slate-400">· {period}</span></p>
        <p className="t-value font-mono">{fmtTon(actual)} <span className="text-slate-400 font-sans font-semibold text-xs">/ {hasTarget ? fmtTon(target) : "-"}</span></p>
        <span className={`target-chip ${isComplete ? "ok" : hasTarget ? "warn" : "neutral"}`}>
          {hasTarget ? (isComplete ? "Target tercapai" : `Kurang ${fmtTon(remaining)} lagi`) : "Target belum diatur"}
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
  /** Daftar SKU bisa tumbuh panjang (13 SKU aktif dan bisa bertambah), dan
   * dashboard ini tugasnya meringkas. Default tampil sebagian, sisanya
   * dibuka atas permintaan. */
  const [skuExpanded, setSkuExpanded] = useState(false)

  const activeData: WarehouseData | undefined =
    selectedWarehouseId === "all"
      ? aggregateAll(dataMap)
      : dataMap[selectedWarehouseId]

  if (!activeData) {
    return (
      <div className="section section-body text-center" style={{ color: "var(--muted-faint)" }}>
        Belum ada data untuk dianalisis.
      </div>
    )
  }

  // Percentages
  const pctHarian   = activeData.target_harian   > 0 ? Math.min((activeData.actual_harian   / activeData.target_harian)   * 100, 100) : 0
  const pctMingguan = activeData.target_mingguan > 0 ? Math.min((activeData.actual_mingguan / activeData.target_mingguan) * 100, 100) : 0
  const pctBulanan  = activeData.target_bulanan  > 0 ? Math.min((activeData.actual_bulanan  / activeData.target_bulanan)  * 100, 100) : 0

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
          areaColor: "#559133",
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
          areaColor: "#559133",
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
          areaColor: "#559133",
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

  // Urutkan dari volume terbesar: SKU yang paling banyak dibeli yang paling
  // layak dilihat duluan, bukan urutan alfabet. Sisanya disembunyikan supaya
  // kartu tidak memanjang tanpa batas saat daftar SKU bertambah.
  const SKU_TAMPIL_AWAL = 5
  const skuTerurut = [...currentSkuPrices].sort((a, b) => b.all_kg - a.all_kg)
  const skuRows = skuExpanded ? skuTerurut : skuTerurut.slice(0, SKU_TAMPIL_AWAL)
  const skuTersembunyi = Math.max(skuTerurut.length - SKU_TAMPIL_AWAL, 0)

  const chartModes: { key: ChartMode; label: string }[] = [
    { key: "harian", label: "Harian" },
    { key: "mingguan", label: "Mingguan" },
    { key: "bulanan", label: "Bulanan" },
  ]
  const warehouseOptions = [
    { value: "all", label: "Semua Gudang" },
    ...warehouses.map(w => ({
      value: w.id,
      label: namaGudang(w.nama),
    })),
  ]

  return (
    <div className="space-y-5">
      {/* Performance Cockpit */}
      <div className="section">
        <div className="section-shell-head">
          <div className="min-w-0">
            <p className="section-eyebrow">Performance cockpit</p>
            <h3 className="text-[15.5px] font-bold text-slate-950">Target vs Realisasi Gudang</h3>
            <p className="mt-1 text-xs text-slate-500">
              Bandingkan realisasi tonase terhadap target operasional untuk periode aktif.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Pintu ke Setting Target ditaruh di sini, bukan di sidebar.
                Kartu ini yang memberi tahu "kurang 36 ton lagi", dan
                tindakan berikutnya memang meninjau targetnya -- pintunya
                paling berguna tepat di tempat kebutuhannya muncul.

                Diberi nada utama, dan diletakkan sebelum pemilih gudang.
                Sebagai tombol netral di sebelah kanan dropdown ia terbaca
                seperti pelengkap filter, padahal ia satu-satunya tindakan
                di kartu ini; dropdown-nya hanya mengubah apa yang dilihat. */}
            <Link
              href="/dashboard/manager/targets"
              className="premium-button btn-primer flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-bold"
            >
              <Target className="h-3.5 w-3.5" />
              Setting Target
            </Link>
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
        <div className="p-5">
          <div className="target-grid">
            <TargetMetricCard
              label="Harian"
              period="Hari ini"
              actual={activeData.actual_harian}
              target={activeData.target_harian}
              percent={pctHarian}
            />
            <TargetMetricCard
              label="Mingguan"
              period="Minggu ini"
              actual={activeData.actual_mingguan}
              target={activeData.target_mingguan}
              percent={pctMingguan}
            />
            <TargetMetricCard
              label="Bulanan"
              period="Bulan ini"
              actual={activeData.actual_bulanan}
              target={activeData.target_bulanan}
              percent={pctBulanan}
            />
          </div>
        </div>
      </div>
      {/* Chart Section - Full Width with mode toggle */}
      <div className="section">
        {/* Chart Header + Mode Toggle */}
        <div className="section-shell-head">
          <div className="min-w-0">
            <h4 className="text-[15.5px] font-bold text-slate-950">{chartConfig.title}</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">{chartConfig.description}</p>
          </div>
          {/* Toggle Buttons */}
          <div className="segmented w-full sm:w-auto grid grid-cols-3 sm:flex">
            {chartModes.map(mode => (
              <button
                key={mode.key}
                onClick={() => setChartMode(mode.key)}
                className={chartMode === mode.key ? "active" : ""}
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

      {/* SKU Price Table */}
      <div className="section">
        <div className="section-shell-head">
          <div className="min-w-0">
            <p className="section-eyebrow">SKU pricing</p>
            <h4 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Harga Rata-rata per SKU</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Rata-rata tertimbang per kilogram &middot; {selectedWarehouseId === "all" ? "semua gudang" : (dataMap[selectedWarehouseId]?.nama || "gudang")}
            </p>
          </div>
        </div>

        {hasSKUData ? (
          <div>
            {/* Pita ringkasan menempel penuh ke tepi kartu.
                Sebelumnya ia kartu bersudut membulat di dalam kartu lain,
                jadi sudutnya tampak menggantung di kiri dan kanan --
                dua lengkung bersarang tanpa alasan. */}
            <div
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-[22px] py-3"
              style={{ background: "var(--brand-soft)", borderColor: "var(--border)" }}
            >
              <span className="text-[10.5px] font-bold uppercase tracking-[0.07em]" style={{ color: "var(--brand-strong)" }}>
                Harga rata-rata periode ini
              </span>
              <span className="font-mono text-xl font-extrabold tabular-nums" style={{ color: "var(--brand-strong)" }}>
                {grandTotalAllKg > 0 ? fmtRpPerKg(grandAvgAllPrice) : "-"}
              </span>
              <span className="text-xs text-slate-500">{fmtKg(grandTotalAllKg)} total volume</span>
            </div>

            <div className="p-5">
              <SkuPriceChart rows={skuRows} avgPrice={grandAvgAllPrice} />

              {skuTersembunyi > 0 && (
                <button
                  type="button"
                  onClick={() => setSkuExpanded(v => !v)}
                  className="mt-4 text-[11.5px] font-bold"
                  style={{ color: "var(--brand-strong)" }}
                >
                  {skuExpanded ? "Tampilkan lebih sedikit" : `Tampilkan ${skuTersembunyi} SKU lainnya`}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="section-body py-12 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>Belum ada data harga SKU</p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted-faint)" }}>Data muncul setelah ada transaksi pembelian.</p>
          </div>
        )}
    </div>
    </div>
  )
}
