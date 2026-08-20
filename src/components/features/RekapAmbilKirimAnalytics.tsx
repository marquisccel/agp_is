"use client"

import { Truck, PackageCheck } from "lucide-react"
import { fmtAngka, fmtTon } from "@/lib/format"

export interface RekapAmbilKirimRow {
  warehouseId: string
  warehouseName: string
  ambilTransaksi: number
  ambilVolume: number
  kirimTransaksi: number
  kirimVolume: number
  belumDicatatTransaksi: number
  belumDicatatVolume: number
}

/**
 * Rekap Ambil / Kirim per Collection Center.
 *
 * Dipakai Manager untuk menilai seberapa efektif armada pengambilan bisa
 * berangkat: makin besar porsi AMBIL, makin aktif armada menjemput ke lapak.
 *
 * Transaksi yang tercatat sebelum field `jenis_pengambilan` ada bernilai null
 * dan tidak ikut jadi penyebut persentase, supaya angka efektivitas tidak
 * menyesatkan.
 */
/**
 * Terjemahkan porsi ambil-vs-kirim jadi satu kalimat pendek. Bar mini plus
 * angka persen di kolom ini terbaca sebagai hiasan, bukan informasi -- yang
 * ingin diketahui Manager sebetulnya cuma "gudang ini armadanya jalan atau
 * lapaknya yang mengantar".
 */
function ringkasRekap(ambilVolume: number, kirimVolume: number): { label: string; warna: string } {
  const totalVol = ambilVolume + kirimVolume
  if (totalVol === 0) return { label: "Belum ada", warna: "var(--muted-faint)" }

  const pct = (ambilVolume / totalVol) * 100
  if (pct === 100) return { label: "Semua diambil", warna: "var(--brand-strong)" }
  if (pct === 0) return { label: "Semua dikirim", warna: "var(--muted)" }
  if (pct >= 60) return { label: "Dominan ambil", warna: "var(--brand-strong)" }
  if (pct <= 40) return { label: "Dominan kirim", warna: "var(--muted)" }
  return { label: "Seimbang", warna: "var(--muted)" }
}

export default function RekapAmbilKirimAnalytics({ data }: { data: RekapAmbilKirimRow[] }) {
  const total = data.reduce(
    (acc, r) => ({
      ambilTransaksi: acc.ambilTransaksi + r.ambilTransaksi,
      ambilVolume: acc.ambilVolume + r.ambilVolume,
      kirimTransaksi: acc.kirimTransaksi + r.kirimTransaksi,
      kirimVolume: acc.kirimVolume + r.kirimVolume,
      belumDicatatTransaksi: acc.belumDicatatTransaksi + r.belumDicatatTransaksi,
      belumDicatatVolume: acc.belumDicatatVolume + r.belumDicatatVolume,
    }),
    { ambilTransaksi: 0, ambilVolume: 0, kirimTransaksi: 0, kirimVolume: 0, belumDicatatTransaksi: 0, belumDicatatVolume: 0 }
  )

  // Basis persentase = hanya transaksi yang modenya tercatat.
  const tercatatVolume = total.ambilVolume + total.kirimVolume
  const ambilPct = tercatatVolume > 0 ? (total.ambilVolume / tercatatVolume) * 100 : 0
  const kirimPct = tercatatVolume > 0 ? (total.kirimVolume / tercatatVolume) * 100 : 0
  const adaTercatat = tercatatVolume > 0

  return (
    <div className="section flex flex-col">
      <div className="section-shell-head">
        <div className="min-w-0">
          <p className="section-eyebrow">Fleet effectiveness</p>
          <h3 className="text-[15.5px] font-bold text-slate-950">Rekap Ambil / Kirim Barang</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Porsi barang yang dijemput armada vs diantar lapak, bulan ini.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {!adaTercatat ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-sm text-slate-400">
              Belum ada transaksi dengan jenis pengambilan tercatat bulan ini.
            </p>
          </div>
        ) : (
          <>
            {/* Dua sisi utama */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-md)] border p-4" style={{ background: "var(--brand-soft)", borderColor: "var(--brand-soft-strong)" }}>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" style={{ color: "var(--brand-strong)" }} />
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--brand-strong)" }}>
                    Diambil
                  </span>
                </div>
                <p className="mt-2 font-mono text-[26px] font-extrabold leading-none tabular-nums" style={{ color: "var(--brand-strong)" }}>
                  {fmtTon(total.ambilVolume)}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  {fmtAngka(total.ambilTransaksi)} transaksi
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
                  <div className="h-full rounded-full" style={{ width: `${ambilPct}%`, background: "var(--brand)" }} />
                </div>
                <p className="mt-1.5 text-[11px] font-bold" style={{ color: "var(--brand-strong)" }}>
                  {ambilPct.toFixed(1)}% dari volume tercatat
                </p>
              </div>

              <div className="rounded-[var(--radius-md)] border p-4" style={{ background: "var(--surface-sunken)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-slate-500" />
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    Dikirim
                  </span>
                </div>
                <p className="mt-2 font-mono text-[26px] font-extrabold leading-none tabular-nums text-slate-900">
                  {fmtTon(total.kirimVolume)}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  {fmtAngka(total.kirimTransaksi)} transaksi
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                  <div className="h-full rounded-full" style={{ width: `${kirimPct}%`, background: "var(--muted-faint)" }} />
                </div>
                <p className="mt-1.5 text-[11px] font-bold text-slate-500">
                  {kirimPct.toFixed(1)}% dari volume tercatat
                </p>
              </div>
            </div>

            {/* Rincian per gudang -- semua Collection Center selalu tampil,
                termasuk yang belum ada aktivitas, supaya Manager langsung
                lihat gudang mana yang armadanya sama sekali belum jalan. */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs">
                <colgroup>
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "22%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2} className="pb-2 align-bottom text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                      Gudang
                    </th>
                    {/* Label grup dirata-kanan mengikuti kolom angkanya --
                        judul di tengah tidak pernah sejajar dengan angka yang
                        rata kanan, itu yang bikin header terlihat goyah. */}
                    <th
                      colSpan={2}
                      className="border-b px-2 pb-1.5 text-right text-[10px] font-bold uppercase tracking-[0.05em]"
                      style={{ color: "var(--brand-strong)", borderColor: "var(--brand-soft-strong)" }}
                    >
                      Ambil
                    </th>
                    <th
                      colSpan={2}
                      className="border-b px-2 pb-1.5 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-500"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Kirim
                    </th>
                    <th rowSpan={2} className="pb-2 align-bottom text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                      Rekap
                    </th>
                  </tr>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="px-2 pb-2 pt-1.5 text-right text-[10px] font-medium normal-case tracking-normal text-slate-400">Trans.</th>
                    <th className="px-2 pb-2 pt-1.5 text-right text-[10px] font-medium normal-case tracking-normal text-slate-400">Volume</th>
                    <th className="px-2 pb-2 pt-1.5 text-right text-[10px] font-medium normal-case tracking-normal text-slate-400">Trans.</th>
                    <th className="px-2 pb-2 pt-1.5 text-right text-[10px] font-medium normal-case tracking-normal text-slate-400">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => {
                    const rowTercatat = row.ambilVolume + row.kirimVolume
                    const rekap = ringkasRekap(row.ambilVolume, row.kirimVolume)
                    return (
                      <tr key={row.warehouseId} className="border-b" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2.5 font-semibold text-slate-800">{row.warehouseName}</td>
                        <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-500">{fmtAngka(row.ambilTransaksi)}</td>
                        <td
                          className="px-2 py-2.5 text-right font-mono tabular-nums font-semibold"
                          style={{ color: row.ambilVolume > 0 ? "var(--brand-strong)" : "var(--muted-faint)" }}
                        >
                          {fmtTon(row.ambilVolume)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono tabular-nums text-slate-500">{fmtAngka(row.kirimTransaksi)}</td>
                        <td className={`px-2 py-2.5 text-right font-mono tabular-nums font-semibold ${row.kirimVolume > 0 ? "text-slate-700" : "text-slate-300"}`}>
                          {fmtTon(row.kirimVolume)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: rowTercatat === 0 ? "var(--muted-faint)" : rekap.warna }}
                          >
                            {rekap.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-2.5 text-[10px] font-black uppercase tracking-[0.05em] text-slate-500">Total</td>
                    <td className="px-2 pt-2.5 text-right font-mono tabular-nums font-bold text-slate-700">{fmtAngka(total.ambilTransaksi)}</td>
                    <td className="px-2 pt-2.5 text-right font-mono tabular-nums font-black" style={{ color: "var(--brand-strong)" }}>
                      {fmtTon(total.ambilVolume)}
                    </td>
                    <td className="px-2 pt-2.5 text-right font-mono tabular-nums font-bold text-slate-700">{fmtAngka(total.kirimTransaksi)}</td>
                    <td className="px-2 pt-2.5 text-right font-mono tabular-nums font-black text-slate-900">{fmtTon(total.kirimVolume)}</td>
                    <td className="pt-2.5 text-right">
                      <span className="text-[11px] font-bold" style={{ color: ringkasRekap(total.ambilVolume, total.kirimVolume).warna }}>
                        {ringkasRekap(total.ambilVolume, total.kirimVolume).label}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {total.belumDicatatTransaksi > 0 && (
              <p className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-400">
                {fmtAngka(total.belumDicatatTransaksi)} transaksi ({fmtTon(total.belumDicatatVolume)}) belum mencatat
                jenis pengambilan, jadi tidak ikut dihitung di sini.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
