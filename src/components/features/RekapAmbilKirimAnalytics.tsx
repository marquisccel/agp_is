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
 * berangkat: makin besar porsi AMBIL, makin aktif armada menjemput ke lapak;
 * porsi KIRIM besar berarti lapak yang mengantar sendiri.
 *
 * Transaksi yang tercatat sebelum field `jenis_pengambilan` ada bernilai null
 * dan ditampilkan terpisah sebagai "belum dicatat" -- sengaja tidak ditebak
 * atau dimasukkan ke salah satu sisi, supaya persentase efektivitas tidak
 * menyesatkan.
 */
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
  const adaData = tercatatVolume > 0 || total.belumDicatatTransaksi > 0

  return (
    <div className="section flex flex-col">
      <div className="section-shell-head">
        <div className="min-w-0">
          <p className="section-eyebrow">Fleet effectiveness</p>
          <h3 className="text-[15.5px] font-bold text-slate-950">Rekap Ambil / Kirim Barang</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Jumlah transaksi per jenis pengambilan bulan ini, seluruh gudang.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {!adaData ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Belum ada transaksi bulan ini.
          </p>
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
                <p className="mt-2 font-mono text-[26px] font-extrabold leading-none" style={{ color: "var(--brand-strong)" }}>
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
                <p className="mt-2 font-mono text-[26px] font-extrabold leading-none text-slate-900">
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

            {/* Rincian per gudang */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="pb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-slate-500">Gudang</th>
                    <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-500">Ambil</th>
                    <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-500">Kirim</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => (
                    <tr key={row.warehouseId} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2.5 font-bold text-slate-800">{row.warehouseName}</td>
                      <td className="py-2.5 text-right">
                        <span className="font-mono font-bold" style={{ color: "var(--brand-strong)" }}>
                          {fmtTon(row.ambilVolume)}
                        </span>
                        <span className="ml-1.5 text-[10.5px] text-slate-400">{row.ambilTransaksi}x</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="font-mono font-bold text-slate-700">{fmtTon(row.kirimVolume)}</span>
                        <span className="ml-1.5 text-[10.5px] text-slate-400">{row.kirimTransaksi}x</span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-2.5 text-[11px] font-black uppercase tracking-[0.05em] text-slate-500">Total</td>
                    <td className="pt-2.5 text-right">
                      <span className="font-mono font-black" style={{ color: "var(--brand-strong)" }}>
                        {fmtTon(total.ambilVolume)}
                      </span>
                      <span className="ml-1.5 text-[10.5px] text-slate-400">{total.ambilTransaksi}x</span>
                    </td>
                    <td className="pt-2.5 text-right">
                      <span className="font-mono font-black text-slate-900">{fmtTon(total.kirimVolume)}</span>
                      <span className="ml-1.5 text-[10.5px] text-slate-400">{total.kirimTransaksi}x</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {total.belumDicatatTransaksi > 0 && (
              <p className="mt-3 rounded-[var(--radius-sm)] px-3 py-2 text-[11px] leading-relaxed" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                {fmtAngka(total.belumDicatatTransaksi)} transaksi ({fmtTon(total.belumDicatatVolume)}) belum mencatat
                jenis pengambilan &mdash; tidak ikut dihitung dalam persentase di atas.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
