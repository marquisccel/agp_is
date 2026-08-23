"use client"

import { useState } from "react"
import { fmtRp } from "@/lib/format"
import { ChevronRight } from "lucide-react"
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
          <p className="section-eyebrow">Kendali kas</p>
          <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Saldo DP per Lapak</h3>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
            Berapa DP yang sudah disetujui, berapa yang sudah terpakai di nota, dan berapa yang masih menggantung.
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

      {/* Ringkasan. Tiga kartu ini dulu masing-masing membawa kotak ikon
          berwarna yang tidak menerangkan apa pun yang belum ditulis
          labelnya, dan kartu ketiga berlatar kuning penuh sepanjang waktu.
          Bentuknya kini sama dengan baris ringkasan di dashboard Manager,
          dan warnanya hanya menyala kalau memang ada saldo menggantung. */}
      <div className="stat-strip" style={{ gridTemplateColumns: "repeat(3, 1fr)", borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)", boxShadow: "none" }}>
        <div className="stat-tile">
          <span className="stat-label">DP Disetujui</span>
          <div className="stat-value-row">
            <span className="stat-value font-mono">{fmtRp(totalApproved)}</span>
          </div>
          <span className="stat-delta flat">Total yang pernah dicairkan</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Sudah Terpakai</span>
          <div className="stat-value-row">
            <span className="stat-value font-mono">{fmtRp(totalUsed)}</span>
          </div>
          <span className="stat-delta flat">Sudah dipotongkan di nota</span>
        </div>

        <div className={`stat-tile${totalRemaining > 0 ? " tone-warning" : ""}`}>
          <span className="stat-label">Masih Menggantung</span>
          <div className="stat-value-row">
            <span className="stat-value font-mono">{fmtRp(totalRemaining)}</span>
          </div>
          <span className="stat-delta flat">
            {totalRemaining > 0 ? "Sudah keluar, belum jadi barang" : "Tidak ada yang menggantung"}
          </span>
        </div>
      </div>

      {summaryOnly && (
        <div className="px-[22px] py-4">
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
          <div className="daftar-lapak">
            {filtered.map((row, idx) => (
              /* Sorotan hover dulu memakai hover:bg-slate-50 pada baris yang
                 padding kirinya nol, jadi bidang abunya berhenti sebelum
                 tepi kartu -- terlihat seperti separuh baris saja yang
                 tersorot. Latar abu itu juga menindih warna kotak "sisa DP
                 aktif" di dalamnya. Sorotannya kini memakai warna sistem
                 dan menutupi seluruh lebar barisnya. */
              <div
                key={row.supplierId}
                className="baris-lapak flex flex-col justify-between gap-4 px-[22px] py-4 lg:flex-row lg:items-center"
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
                  <div className="kotak-angka">
                    <span className="kotak-label">DP Disetujui</span>
                    <span className="kotak-nilai font-mono">{fmtRp(row.totalDp)}</span>
                  </div>

                  <div className="kotak-angka">
                    <span className="kotak-label">Terpakai</span>
                    <span className="kotak-nilai font-mono">{fmtRp(row.totalUsed)}</span>
                  </div>

                  {/* Kuning hanya kalau memang ada yang menggantung; nol
                      berarti tidak ada yang perlu ditagih balik. */}
                  <div className={`kotak-angka${row.sisaDp > 0 ? " tone-warning" : ""}`}>
                    <span className="kotak-label">Masih Menggantung</span>
                    <span className="kotak-nilai font-mono">{fmtRp(row.sisaDp)}</span>
                  </div>
                </div>

                {/* View Detail Link to Supplier page */}
                <div className="flex items-center justify-end lg:w-40 shrink-0">
                  <a
                    href={`/dashboard/manager/suppliers/${row.supplierId}`}
                    className="btn-netral premium-button flex w-full items-center justify-center gap-1 px-4 py-2.5 text-xs sm:w-auto"
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
