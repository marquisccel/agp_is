"use client"

import { fmtKg, fmtRpPerKg, fmtAngka } from "@/lib/format"

export interface SkuPriceRow {
  sku_name: string
  gabyuk_avg: number
  gabyuk_kg: number
  grading_avg: number
  grading_kg: number
  all_avg: number
  all_kg: number
}

/**
 * Harga rata-rata per SKU -- satu SKU satu baris, kolomnya sejajar.
 *
 * Versi sebelumnya menumpuk nama, volume, harga, panah, kalimat penjelas,
 * dan rincian spesifikasi dalam satu petak; enam baris teks per SKU dikali
 * belasan SKU jadi terlalu padat untuk dipindai. Di sini tiap SKU dipangkas
 * jadi satu baris sejajar, dan kalimat "di atas/di bawah rata-rata" dibuang
 * karena panah + warnanya sudah menyampaikan hal yang sama.
 *
 * Panah membandingkan harga SKU terhadap RATA-RATA PERIODE (bukan bulan
 * lalu) -- dijelaskan sekali di keterangan bawah, bukan diulang tiap baris.
 */
export default function SkuPriceChart({
  rows,
  avgPrice,
}: {
  rows: SkuPriceRow[]
  avgPrice: number
}) {
  const dipakai = rows.filter(r => r.all_kg > 0)

  if (dipakai.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Belum ada data harga SKU.</p>
  }

  const data = [...dipakai]
    .map(r => ({
      sku: r.sku_name,
      harga: r.all_avg,
      volume: r.all_kg,
      selisihPct: avgPrice > 0 ? ((r.all_avg - avgPrice) / avgPrice) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume)

  return (
    <div>
      {/* Ponsel: satu SKU satu baris dua sisi, bukan tabel empat kolom.
          Empat kolom di layar 360px menyisakan sekitar 70px per kolom, dan
          "Rp 10.259/KG" serta "19.786 KG" patah jadi dua baris dengan
          judul kolom yang juga patah. Di sini nama dan volume bertumpuk di
          kiri, harga dan selisihnya bertumpuk di kanan, jadi tidak ada
          angka yang perlu dipatah. */}
      <ul className="divide-y md:hidden" style={{ borderColor: "var(--border)" }}>
        {data.map(d => {
          const setara = Math.abs(d.selisihPct) < 0.5
          const naik = d.selisihPct > 0
          return (
            <li key={d.sku} className="flex items-center justify-between gap-3 py-3" style={{ borderColor: "var(--border)" }}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{d.sku}</p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">{fmtKg(d.volume)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="whitespace-nowrap font-mono text-sm font-bold tabular-nums text-slate-900">{fmtRpPerKg(d.harga)}</span>
                {setara ? (
                  <span className="trend flat">setara</span>
                ) : (
                  <span className={`trend ${naik ? "up" : "down"}`}>
                    {fmtAngka(Math.abs(d.selisihPct), 1)}% {naik ? "↗" : "↘"}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* table-fixed dengan lebar kolom yang ditetapkan.

          Sebelumnya kolom SKU melebar mengambil seluruh sisa ruang, sehingga
          ketiga kolom angkanya terdorong menumpuk di tepi kanan sementara
          Volume tertinggal sendirian di tengah. Yang terbaca bukan tabel,
          melainkan satu nama di kiri jauh dan segerombol angka di kanan. */}
      <table className="hidden w-full table-fixed text-left text-xs md:table">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border)" }}>
            <th className="w-[34%] pb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">SKU</th>
            <th className="w-[22%] pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Volume</th>
            <th className="w-[26%] pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">Harga rata-rata</th>
            <th className="w-[18%] pb-2 text-right text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">vs rata-rata</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => {
            // Selisih di bawah 0,5% dianggap setara -- panah untuk beda
            // pecahan persen cuma jadi derau.
            const setara = Math.abs(d.selisihPct) < 0.5
            const naik = d.selisihPct > 0
            return (
              <tr key={d.sku} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="py-2.5 font-semibold text-slate-800">{d.sku}</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-slate-500">{fmtKg(d.volume)}</td>
                <td className="py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                  {fmtRpPerKg(d.harga)}
                </td>
                <td className="py-2.5 text-right">
                  {setara ? (
                    <span className="trend flat">setara</span>
                  ) : (
                    <span className={`trend ${naik ? "up" : "down"}`}>
                      {fmtAngka(Math.abs(d.selisihPct), 1)}% {naik ? "↗" : "↘"}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {avgPrice > 0 && (
        <p className="mt-3 text-[10.5px] text-slate-400">
          <span className="md:hidden">Persentase di bawah harga membandingkan tiap SKU terhadap rata-rata periode ({fmtRpPerKg(avgPrice)}).</span>
          <span className="hidden md:inline">Kolom terakhir membandingkan harga tiap SKU terhadap rata-rata periode ({fmtRpPerKg(avgPrice)}).</span>
        </p>
      )}
    </div>
  )
}
