"use client"

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
 * Porsi ambil-vs-kirim ditampilkan sebagai SATU bar terbagi, bukan dua bar
 * terpisah -- dua bar yang masing-masing menunjukkan persentase dari total
 * yang sama itu mengulang informasi yang persis sama dua kali.
 *
 * Transaksi yang tercatat sebelum field `jenis_pengambilan` ada bernilai null
 * dan tidak ikut jadi penyebut persentase, supaya angka efektivitas tidak
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
  const adaTercatat = tercatatVolume > 0
  // Baris gudang tanpa aktivitas apa pun tidak perlu memenuhi tabel.
  const barisAktif = data.filter(r => r.ambilTransaksi > 0 || r.kirimTransaksi > 0)

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

      <div className="flex flex-1 flex-col gap-5 p-5">
        {!adaTercatat ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Belum ada transaksi dengan jenis pengambilan tercatat bulan ini.
          </p>
        ) : (
          <>
            {/* Dua angka utama + satu bar terbagi */}
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-500">Diambil</p>
                  <p className="mt-1.5 font-mono text-[26px] font-extrabold leading-none tabular-nums" style={{ color: "var(--brand-strong)" }}>
                    {fmtTon(total.ambilVolume)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{fmtAngka(total.ambilTransaksi)} transaksi</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-500">Dikirim</p>
                  <p className="mt-1.5 font-mono text-[26px] font-extrabold leading-none tabular-nums text-slate-800">
                    {fmtTon(total.kirimVolume)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{fmtAngka(total.kirimTransaksi)} transaksi</p>
                </div>
              </div>

              <div className="mt-3.5 flex h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                <div style={{ width: `${ambilPct}%`, background: "var(--brand)" }} />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                <span style={{ color: "var(--brand-strong)" }}>{ambilPct.toFixed(0)}% dijemput armada</span>
                {" · "}
                {(100 - ambilPct).toFixed(0)}% diantar lapak
              </p>
            </div>

            {/* Rincian per gudang */}
            {barisAktif.length > 0 && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="pb-2 font-bold uppercase tracking-[0.05em] text-[10px] text-slate-400">Gudang</th>
                    <th className="pb-2 text-right font-bold uppercase tracking-[0.05em] text-[10px] text-slate-400">Ambil</th>
                    <th className="pb-2 text-right font-bold uppercase tracking-[0.05em] text-[10px] text-slate-400">Kirim</th>
                    <th className="pb-2 text-right font-bold uppercase tracking-[0.05em] text-[10px] text-slate-400">% Ambil</th>
                  </tr>
                </thead>
                <tbody>
                  {barisAktif.map(row => {
                    const rowTercatat = row.ambilVolume + row.kirimVolume
                    const rowPct = rowTercatat > 0 ? (row.ambilVolume / rowTercatat) * 100 : 0
                    return (
                      <tr key={row.warehouseId} className="border-b" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2.5 font-semibold text-slate-800">{row.warehouseName}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold" style={{ color: "var(--brand-strong)" }}>
                          {fmtTon(row.ambilVolume)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-700">
                          {fmtTon(row.kirimVolume)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-slate-500">
                          {rowPct.toFixed(0)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {total.belumDicatatTransaksi > 0 && (
          <p className="mt-auto text-[11px] leading-relaxed text-slate-400">
            {fmtAngka(total.belumDicatatTransaksi)} transaksi ({fmtTon(total.belumDicatatVolume)}) belum mencatat
            jenis pengambilan, jadi tidak ikut dihitung di sini.
          </p>
        )}
      </div>
    </div>
  )
}
