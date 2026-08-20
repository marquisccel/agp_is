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


/**
 * Donat proporsi ambil-vs-kirim.
 *
 * Dua busur dipisahkan celah kecil berwarna permukaan supaya batas antar
 * bagian tetap terbaca walau salah satunya sangat tipis. Angka total
 * ditaruh di tengah karena itu konteks yang bikin kedua bagian bermakna.
 */
function Donat({ ambil, kirim }: { ambil: number; kirim: number }) {
  const R = 88
  const STROKE = 28
  const C = 2 * Math.PI * R
  const totalNilai = ambil + kirim
  const ambilRasio = totalNilai > 0 ? ambil / totalNilai : 0

  // Celah pemisah hanya masuk akal kalau memang ada dua bagian.
  const adaDuaBagian = ambil > 0 && kirim > 0
  const gap = adaDuaBagian ? 3 : 0
  const ambilPanjang = Math.max(C * ambilRasio - gap, 0)
  const kirimPanjang = Math.max(C * (1 - ambilRasio) - gap, 0)

  // Angka dan satuan dipisah supaya satuannya bisa dibuat jauh lebih kecil.
  // Kalau digabung sebagai satu string besar ("15,50 ton"), teksnya melebihi
  // lubang donat begitu nilainya mencapai ratusan ton.
  const ton = totalNilai / 1000
  const desimal = ton % 1 === 0 ? 0 : (ton % 0.1 === 0 ? 1 : 2)
  const angka = fmtAngka(ton, desimal)

  // Lubang donat = 2 * (R - STROKE/2). Ukuran font diturunkan bertahap untuk
  // angka yang panjang supaya tetap muat tanpa perlu mengukur teks.
  const fontAngka = angka.length <= 5 ? 36 : angka.length <= 7 ? 30 : 25

  return (
    <svg
      width={228}
      height={228}
      viewBox="0 0 212 212"
      role="img"
      aria-label={`Porsi diambil ${Math.round(ambilRasio * 100)} persen dari total ${angka} ton`}
      className="shrink-0"
    >
      <circle cx="106" cy="106" r={R} fill="none" stroke="var(--bg-tint)" strokeWidth={STROKE} />
      {kirim > 0 && (
        <circle
          cx="106" cy="106" r={R} fill="none"
          stroke="var(--border-strong)" strokeWidth={STROKE}
          strokeDasharray={`${kirimPanjang} ${C - kirimPanjang}`}
          strokeDashoffset={-(C * ambilRasio + gap / 2)}
          transform="rotate(-90 106 106)"
          strokeLinecap="butt"
        />
      )}
      {ambil > 0 && (
        <circle
          cx="106" cy="106" r={R} fill="none"
          stroke="var(--brand)" strokeWidth={STROKE}
          strokeDasharray={`${ambilPanjang} ${C - ambilPanjang}`}
          strokeDashoffset={-(gap / 2)}
          transform="rotate(-90 106 106)"
          strokeLinecap="butt"
        />
      )}
      <text x="106" y="104" textAnchor="middle" fill="var(--foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
        <tspan fontSize={fontAngka} fontWeight="800">{angka}</tspan>
        <tspan fontSize="14" fontWeight="700" fill="var(--muted)" dx="4">ton</tspan>
      </text>
      <text x="106" y="126" textAnchor="middle" fontSize="10.5" fontWeight="700" letterSpacing="0.07em" fill="var(--muted-faint)">
        TOTAL MASUK
      </text>
    </svg>
  )
}

export default function RekapAmbilKirimAnalytics({
  data,
  prevAmbilPct = null,
}: {
  data: RekapAmbilKirimRow[]
  /** Porsi ambil bulan lalu; null kalau bulan lalu belum ada data tercatat. */
  prevAmbilPct?: number | null
}) {
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
            {/* Donat, bukan dua kotak sejajar. Ambil dan Kirim adalah dua
                bagian dari SATU keseluruhan, dan bentuk yang menyatakan
                "bagian dari keseluruhan" itu lingkaran terbagi -- dua kotak
                datar berdampingan justru terbaca sebagai dua angka lepas
                yang kebetulan bersebelahan, sehingga sulit dibedakan mana
                yang lebih besar tanpa membaca angkanya satu per satu. */}
            <div className="flex flex-wrap items-center gap-6">
              <Donat ambil={total.ambilVolume} kirim={total.kirimVolume} />

              <ul className="min-w-[170px] flex-1 space-y-6">
                <li className="flex items-start gap-2.5">
                  <span className="mt-[5px] h-3 w-3 shrink-0 rounded-full" style={{ background: "var(--brand)" }} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--brand-strong)" }}>
                      <Truck className="h-4 w-4" /> Diambil
                    </span>
                    <span className="mt-1.5 block font-mono text-[26px] font-extrabold leading-none tabular-nums" style={{ color: "var(--brand-strong)" }}>
                      {fmtTon(total.ambilVolume)}
                    </span>
                    <span className="mt-1.5 block text-[12px] text-slate-400">
                      {fmtAngka(total.ambilTransaksi)} transaksi
                    </span>
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="mt-[5px] h-3 w-3 shrink-0 rounded-full" style={{ background: "var(--border-strong)" }} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
                      <PackageCheck className="h-4 w-4" /> Dikirim
                    </span>
                    <span className="mt-1.5 block font-mono text-[26px] font-extrabold leading-none tabular-nums text-slate-800">
                      {fmtTon(total.kirimVolume)}
                    </span>
                    <span className="mt-1.5 block text-[12px] text-slate-400">
                      {fmtAngka(total.kirimTransaksi)} transaksi
                    </span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Perbandingan bulan lalu -- menjawab "efektivitas armada
                membaik atau menurun?", bukan cuma memotret bulan ini. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              {prevAmbilPct === null ? (
                <span className="text-slate-400">
                  Belum ada data bulan lalu untuk dibandingkan.
                </span>
              ) : (
                (() => {
                  const selisih = ambilPct - prevAmbilPct
                  const stabil = Math.abs(selisih) < 0.5
                  return (
                    <>
                      <span className="text-slate-500">Porsi ambil bulan lalu</span>
                      <span className="font-mono font-bold tabular-nums text-slate-700">
                        {Math.round(prevAmbilPct)}%
                      </span>
                      {stabil ? (
                        <span className="trend flat">stabil</span>
                      ) : (
                        <span className={`trend ${selisih > 0 ? "up" : "down"}`}>
                          {selisih > 0 ? "+" : "−"}{fmtAngka(Math.abs(selisih), 1)} poin {selisih > 0 ? "↗" : "↘"}
                        </span>
                      )}
                    </>
                  )
                })()
              )}
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
              <p className="pt-3 text-[11px] leading-relaxed text-slate-400">
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
