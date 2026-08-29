"use client"

import { useState } from "react"
import { fmtRp } from "@/lib/format"
import { ChevronRight } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { namaGudang } from "@/lib/namaGudang"
import TautanRincian from "@/components/ui/TautanRincian"

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
    <>
    <div className="section overflow-hidden">
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
      <div
        className="stat-strip"
        style={{
          gridTemplateColumns: "repeat(3, 1fr)",
          borderRadius: 0,
          border: "none",
          borderBottom: summaryOnly ? "1px solid var(--border)" : "none",
          boxShadow: "none",
        }}
      >
        <div className="stat-tile">
          <span className="stat-label">DP Disetujui</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtRp(totalApproved)}</span>
          </div>
          <span className="stat-delta flat">Total yang pernah dicairkan</span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Sudah Terpakai</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtRp(totalUsed)}</span>
          </div>
          <span className="stat-delta flat">Sudah dipotongkan di nota</span>
        </div>

        <div className={`stat-tile${totalRemaining > 0 ? " tone-warning" : ""}`}>
          <span className="stat-label">Masih Menggantung</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtRp(totalRemaining)}</span>
          </div>
          <span className="stat-delta flat">
            {totalRemaining > 0 ? "Sudah keluar, belum jadi barang" : "Tidak ada yang menggantung"}
          </span>
        </div>
      </div>

      {summaryOnly && (
        <TautanRincian href="/dashboard/manager/dp" garisAtas={false}>Lihat rincian per lapak</TautanRincian>
      )}

      </div>

      {/* Daftar per lapak berdiri sebagai kartu tersendiri.
          Digabung dengan pita ringkasan di atasnya, satu kartu memuat dua
          hal yang dibaca dengan cara berbeda -- angka gabungan yang dipindai
          sekilas, dan daftar yang ditelusuri baris demi baris. Dipisah,
          keduanya punya ruang napasnya sendiri. */}
      {!summaryOnly && (
      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Rincian</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Saldo per Lapak</h3>
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--muted-faint)" }}>
            {filtered.length} lapak
          </span>
        </div>
        <div>
        {filtered.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed py-12 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--muted-faint)" }}>
            <p className="font-semibold">Belum ada data DP / Kasbon disetujui.</p>
            <p className="text-xs mt-1">Data saldo akan terisi setelah manager menyetujui pengajuan DP lapak.</p>
          </div>
        ) : (
          /* Bentuknya disamakan dengan daftar di Analisis Susut: satu baris
             tabel per lapak, bukan kartu bertumpuk.

             Isinya memang jenis yang sama -- beberapa angka sejenis untuk
             sederet lapak, yang dibaca dengan cara membandingkan lapak satu
             sama lain. Dalam bentuk kartu, tiap angka duduk di kotaknya
             sendiri dan tidak sebaris dengan angka lapak lain, jadi
             membandingkan "siapa yang paling banyak menggantung" menuntut
             membaca kotak per kotak. Berbaris menurun, jawabannya terlihat
             tanpa dibaca satu-satu.

             Dua layar yang menampilkan hal sejenis juga sebaiknya
             berbentuk sama, supaya tidak perlu dipelajari dua kali. */
          <div className="overflow-x-auto">
            <table className="tabel-lembut w-full table-fixed text-sm">
              <thead>
                <tr>
                  <th className="kolom-tengah w-12">No</th>
                  <th className="kolom-kiri w-[30%]">Lapak</th>
                  <th className="kolom-kanan w-[16%]">DP Disetujui</th>
                  <th className="kolom-kanan w-[16%]">Terpakai</th>
                  <th className="kolom-tengah w-[19%]">Masih Menggantung</th>
                  <th className="kolom-tengah w-36">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={row.supplierId}>
                    <td className="kolom-tengah font-mono text-xs" style={{ color: "var(--muted-faint)" }}>{idx + 1}</td>
                    <td className="kolom-kiri">
                      <div className="truncate font-bold" style={{ color: "var(--foreground)" }} title={row.namaLapak}>{row.namaLapak}</div>
                      <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--muted-faint)" }}>
                        {namaGudang(row.warehouseName)} &middot; {row.transaksiDp}x DP disetujui
                      </div>
                    </td>
                    <td className="kolom-kanan whitespace-nowrap font-mono tabular-nums" style={{ color: "var(--muted)" }}>{fmtRp(row.totalDp)}</td>
                    <td className="kolom-kanan whitespace-nowrap font-mono tabular-nums" style={{ color: "var(--muted)" }}>{fmtRp(row.totalUsed)}</td>
                    {/* Kuning hanya kalau memang ada yang menggantung. Nol
                        berarti seluruh DP sudah jadi barang, jadi tidak ada
                        yang perlu ditagih balik -- dan menuliskannya sebagai
                        "Rp 0" berwarna membuat baris yang justru paling
                        beres terbaca seperti perlu diperiksa. */}
                    <td
                      className="kolom-tengah whitespace-nowrap font-mono font-bold tabular-nums"
                      style={{ color: row.sisaDp > 0 ? "var(--warning)" : "var(--muted-faint)" }}
                    >
                      {row.sisaDp > 0 ? fmtRp(row.sisaDp) : "Sudah habis terpakai"}
                    </td>
                    <td className="kolom-tengah">
                      <a
                        href={`/dashboard/manager/suppliers/${row.supplierId}`}
                        className="btn-netral premium-button inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs"
                      >
                        Detail Lapak
                        <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      )}
    </>
  )
}
