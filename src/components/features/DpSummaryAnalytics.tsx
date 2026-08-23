"use client"

import { useState } from "react"
import { fmtRp } from "@/lib/format"
import { Wallet, CreditCard, ChevronRight } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"

interface DpSupplierRow {
  supplierId: string
  namaLapak: string
  warehouseId: string
  warehouseName: string
  totalDp: number
  totalUsed: number
  sisaDp: number
  transaksiDp: number
}

interface DpSummaryAnalyticsProps {
  dpData: DpSupplierRow[]
  warehouseNames: { id: string; nama: string }[]
  /** Mode ringkas untuk dashboard Manager: hanya metrik total + link ke
   * menu Rekap DP. Rincian per lapak tetap utuh di halaman menunya. */
  summaryOnly?: boolean
}

export default function DpSummaryAnalytics({ dpData, warehouseNames, summaryOnly = false }: DpSummaryAnalyticsProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all")

  // Filter data based on warehouse dropdown
  const filtered = dpData.filter(d => 
    selectedWarehouseId === "all" || d.warehouseId === selectedWarehouseId
  )

  // Calculations for filtered data
  const totalApproved = filtered.reduce((s, d) => s + d.totalDp, 0)
  const totalUsed = filtered.reduce((s, d) => s + d.totalUsed, 0)
  const totalRemaining = filtered.reduce((s, d) => s + d.sisaDp, 0)
  const warehouseOptions = [
    { value: "all", label: "Semua Gudang" },
    ...warehouseNames.map(w => ({ value: w.id, label: w.nama })),
  ]

  return (
    <div className="section">
      {/* Header */}
      <div className="section-shell-head">
        <div className="min-w-0">
          <p className="section-eyebrow">Cashflow control</p>
          <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-slate-950">
            <Wallet className="h-5 w-5" style={{ color: "var(--brand-strong)" }} />
            Rekap Saldo DP &amp; Kasbon per Lapak
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Pantau total dana uang muka (down payment) disetujui, terpakai, dan sisa saldo aktif supplier.
          </p>
        </div>
        {/* Warehouse filter */}
        {!summaryOnly && (
          <ElegantSelect
            value={selectedWarehouseId}
            options={warehouseOptions}
            onChange={setSelectedWarehouseId}
            ariaLabel="Pilih gudang DP"
            className="w-full sm:w-44"
            menuClassName="sm:w-52"
          />
        )}
      </div>

      {/* Global Summary Card Metrics */}
      <div className={`grid grid-cols-1 gap-3 p-4 sm:p-5 md:grid-cols-3${summaryOnly ? "" : " border-b border-slate-100"}`}>
        {/* Metric 1: Total Approved DP */}
        <div className="section section-body flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Total DP Disetujui</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5 break-all">{fmtRp(totalApproved)}</p>
          </div>
        </div>

        {/* Metric 2: Total Used DP */}
        <div className="section section-body flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Total DP Terpakai</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5 break-all">{fmtRp(totalUsed)}</p>
          </div>
        </div>

        {/* Metric 3: Total Remaining DP */}
        <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase">Sisa Saldo DP Aktif</p>
            <p className="text-base font-bold text-emerald-700 font-mono mt-0.5 break-all">{fmtRp(totalRemaining)}</p>
          </div>
        </div>
      </div>

      {summaryOnly && (
        <div className="px-4 pb-5 sm:px-5">
          <a
            href="/dashboard/manager/dp"
            className="inline-block text-[11.5px] font-bold"
            style={{ color: "var(--brand-strong)" }}
          >
            Lihat rincian per lapak →
          </a>
        </div>
      )}

      {!summaryOnly && (
      /* List Card Section (No Horizontal Scroll) */
      <div className="space-y-4 p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed py-12 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--muted-faint)" }}>
            <p className="font-semibold">Belum ada data DP / Kasbon disetujui.</p>
            <p className="text-xs mt-1">Data saldo akan terisi setelah manager menyetujui pengajuan DP lapak.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row, idx) => (
              <div
                key={row.supplierId}
                className="group flex flex-col justify-between gap-4 py-4 transition-colors hover:bg-slate-50 lg:flex-row lg:items-center"
              >
                {/* Supplier Info */}
                <div className="flex items-start gap-3 lg:w-1/4 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-extrabold text-slate-600">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                      {row.namaLapak}
                      <span className="rounded-[8px] border px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: "var(--border)", background: "var(--bg-tint)", color: "var(--muted)" }}>
                        {row.transaksiDp}x DP disetujui
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-slate-400">
                      CC: <span className="font-bold text-slate-600">{row.warehouseName}</span>
                    </span>
                  </div>
                </div>

                {/* Timbangan / DP values */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                  {/* Total DP */}
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total DP Disetujui</span>
                    <span className="font-mono text-slate-700 font-bold text-sm block mt-1">{fmtRp(row.totalDp)}</span>
                  </div>

                  {/* DP Terpakai */}
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Terpakai</span>
                    <span className="font-mono text-slate-600 font-semibold text-sm block mt-1">{fmtRp(row.totalUsed)}</span>
                  </div>

                  {/* Sisa DP */}
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase block">Sisa DP Aktif</span>
                    <span className="font-mono text-emerald-700 font-extrabold text-sm block mt-1">{fmtRp(row.sisaDp)}</span>
                  </div>
                </div>

                {/* View Detail Link to Supplier page */}
                <div className="flex items-center justify-end lg:w-40 shrink-0">
                  <a
                    href={`/dashboard/manager/suppliers/${row.supplierId}`}
                    className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 font-bold px-4 py-2.5 rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    Detail Lapak
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
