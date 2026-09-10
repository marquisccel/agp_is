"use client"

import { useState } from "react"
import { fmtKg, fmtRpPerKg, fmtAngka } from "@/lib/format"
import ElegantSelect from "@/components/ui/ElegantSelect"
import TautanRincian from "@/components/ui/TautanRincian"

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
  /*
   * "Semua Gudang" jadi pilihan bawaan.
   *
   * Sebelumnya penyaringnya hanya memuat gudang satu per satu, dan yang
   * terpilih saat halaman dibuka adalah gudang pertama menurut urutan
   * data. Akibatnya peringkat lapak terbaik yang dilihat Manager selalu
   * peringkat SATU gudang, tanpa ada yang menyebutkan gudang mana --
   * padahal seluruh layar Manager lainnya memang bekerja lintas gudang.
   */
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("all")
  const [mode, setMode] = useState<"volume" | "harga">("volume")

  const gabungLintasGudang = (ambil: (w: WarehouseTopData) => TopSupplier[]) => {
    const semua = warehouseTopData.flatMap(ambil)
    const urut = mode === "volume"
      ? [...semua].sort((a, b) => b.totalKg - a.totalKg)
      : [...semua].sort((a, b) => b.avgHarga - a.avgHarga)
    return urut.slice(0, 10)
  }

  const activeWarehouse = warehouseTopData.find(w => w.warehouseId === selectedWarehouseId)
  const suppliers = selectedWarehouseId === "all"
    ? gabungLintasGudang((w) => (mode === "volume" ? w.topByVolume : w.topByHarga))
    : mode === "volume"
      ? activeWarehouse?.topByVolume || []
      : activeWarehouse?.topByHarga || []

  const warehouseOptions = [
    { value: "all", label: "Semua Gudang" },
    ...warehouseTopData.map(w => ({
      value: w.warehouseId,
      label: `Gudang ${w.warehouseName}`,
    })),
  ]

  return (
    <div className="section">
      {/* Header */}
      <div className="section-shell-head">
        <div className="min-w-0">
          <p className="section-eyebrow">Lapak performance</p>
          <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Top 10 Lapak</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Peringkat supplier berdasarkan volume atau harga rata-rata per gudang.</p>
        </div>
        {/* Ponsel: dua pemilih berdampingan dengan bentuk yang sama persis,
            gudang di kiri dan urutan di kanan. Dua deret pil yang sempat
            dipakai memakan dua baris penuh dan terbaca sebagai dua jenis
            kontrol berbeda, padahal keduanya sama-sama penyaring daftar. */}
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2 md:hidden">
          <ElegantSelect
            value={selectedWarehouseId}
            options={[
              { value: "all", label: "Semua gudang" },
              ...warehouseTopData.map(w => ({ value: w.warehouseId, label: w.warehouseName })),
            ]}
            onChange={setSelectedWarehouseId}
            ariaLabel="Pilih gudang supplier"
            className="w-full"
          />
          <ElegantSelect
            value={mode}
            options={[
              { value: "volume" as const, label: "Volume" },
              { value: "harga" as const, label: "Harga" },
            ]}
            onChange={setMode}
            ariaLabel="Urutkan lapak"
            className="w-full"
          />
        </div>
        <div className="hidden w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center md:flex">
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

      <div className="px-4 py-2 md:p-5">
        {suppliers.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-12">
            <p>Belum ada data transaksi untuk pilihan ini.</p>
          </div>
        ) : (
          <>
          {/* Ponsel: tiap lapak satu baris grid tiga lajur (peringkat,
              identitas, angka). Tabel lima kolom di layar 360px memaksa nama
              lapak patah jadi tiga baris dan "Rp 8.910/KG" patah di tengah,
              sehingga barisnya berbeda-beda tinggi dan angkanya tidak lagi
              berbaris. Angka yang sedang dipakai mengurutkan tampil paling
              tebal di kanan; angka lainnya menjadi keterangan kecil. */}
          <ol className="md:hidden">
            {suppliers.map((s, i) => {
              const isTop = i === 0
              const utama = mode === "volume" ? fmtKg(s.totalKg) : fmtRpPerKg(s.avgHarga)
              const kedua = mode === "volume" ? fmtRpPerKg(s.avgHarga) : fmtKg(s.totalKg)
              return (
                <li
                  key={s.supplierId}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 border-b py-3 last:border-b-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: isTop ? "var(--brand-strong)" : "var(--muted-faint)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{s.nama}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{fmtAngka(s.transaksi)} transaksi</span>
                  </span>
                  <span className="text-right">
                    <span className="block whitespace-nowrap font-mono text-[13px] font-bold tabular-nums" style={{ color: "var(--brand-strong)" }}>{utama}</span>
                    <span className="mt-0.5 block whitespace-nowrap font-mono text-[11px] tabular-nums text-slate-500">{kedua}</span>
                  </span>
                </li>
              )
            })}
          </ol>

          <table className="hidden w-full text-left text-xs md:table">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="w-10 pb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">No</th>
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
          </>
        )}
      </div>
      <TautanRincian href="/dashboard/manager/suppliers">
        Lihat semua lapak
      </TautanRincian>
    </div>
  )
}
