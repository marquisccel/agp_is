"use client"

import { Truck, PackageCheck } from "lucide-react"
import { fmtAngka, fmtTon } from "@/lib/format"
import KeadaanKosong from "@/components/ui/KeadaanKosong"
import PanahTren from "@/components/ui/PanahTren"

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
 * Rekap Ambil / Kirim per gudang.
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
  const R = 94
  const STROKE = 21
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
  const fontAngka = angka.length <= 5 ? 40 : angka.length <= 7 ? 33 : 27

  // Posisi baseline dihitung dari tinggi blok teksnya, bukan angka tetap:
  // ukuran font angka berubah mengikuti panjang nilai, jadi baseline tetap
  // akan membuat teks naik-turun dari titik pusat.
  //
  // ASCENT/DESCENT di bawah adalah rasio terhadap ukuran font yang DIUKUR
  // dari getBBox pada font yang dipakai aplikasi ini, bukan perkiraan tinggi
  // huruf kapital -- getBBox mengembalikan kotak em penuh, sehingga tebakan
  // 0,7em sempat membuat teksnya naik ~4,5px dari pusat lingkaran.
  const FONT_LABEL = 10.5
  const ASCENT = 1.005
  const DESCENT = 0.305
  const PUSAT = 114

  const jarakBaseline = fontAngka * 0.3 + FONT_LABEL * 0.32
  const baselineAngka =
    PUSAT - (jarakBaseline + DESCENT * FONT_LABEL - ASCENT * fontAngka) / 2
  const baselineLabel = baselineAngka + jarakBaseline

  return (
    <svg
      viewBox="0 0 228 228"
      role="img"
      aria-label={`Porsi diambil ${Math.round(ambilRasio * 100)} persen dari total ${angka} ton`}
      className="h-auto w-[216px] shrink-0 sm:w-[244px]"
    >
      <circle cx={PUSAT} cy={PUSAT} r={R} fill="none" stroke="var(--bg-tint)" strokeWidth={STROKE} />
      {kirim > 0 && (
        <circle
          cx={PUSAT} cy={PUSAT} r={R} fill="none"
          stroke="var(--border-strong)" strokeWidth={STROKE}
          strokeDasharray={`${kirimPanjang} ${C - kirimPanjang}`}
          strokeDashoffset={-(C * ambilRasio + gap / 2)}
          transform={`rotate(-90 ${PUSAT} ${PUSAT})`}
          strokeLinecap="butt"
        />
      )}
      {ambil > 0 && (
        <circle
          cx={PUSAT} cy={PUSAT} r={R} fill="none"
          stroke="var(--brand)" strokeWidth={STROKE}
          strokeDasharray={`${ambilPanjang} ${C - ambilPanjang}`}
          strokeDashoffset={-(gap / 2)}
          transform={`rotate(-90 ${PUSAT} ${PUSAT})`}
          strokeLinecap="butt"
        />
      )}
      <text x={PUSAT} y={baselineAngka} textAnchor="middle" fill="var(--foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
        <tspan fontSize={fontAngka} fontWeight="800">{angka}</tspan>
        <tspan fontSize="14" fontWeight="700" fill="var(--muted)" dx="4">ton</tspan>
      </text>
      <text x={PUSAT} y={baselineLabel} textAnchor="middle" fontSize={FONT_LABEL} fontWeight="700" letterSpacing="0.07em" fill="var(--muted-faint)">
        TOTAL MASUK
      </text>
    </svg>
  )
}

/** Angka tonase tanpa satuan, untuk sel tabel yang satuannya ada di judul kolom. */
function angkaTon(kg: number): string {
  return fmtTon(kg).replace(/ ton$/, "")
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
            <KeadaanKosong
              ikon={Truck}
              judul="Belum Ada Rekap Pengambilan"
              keterangan="Rekap muncul setelah transaksi bulan ini mencatat jenis pengambilannya."
            />
          </div>
        ) : (
          <>
            {/* Donat, bukan dua kotak sejajar. Ambil dan Kirim adalah dua
                bagian dari SATU keseluruhan, dan bentuk yang menyatakan
                "bagian dari keseluruhan" itu lingkaran terbagi -- dua kotak
                datar berdampingan justru terbaca sebagai dua angka lepas
                yang kebetulan bersebelahan, sehingga sulit dibedakan mana
                yang lebih besar tanpa membaca angkanya satu per satu. */}
            {/* Di ponsel donat berdiri di tengah dan kedua keterangannya
                berjejer di bawahnya, dua lajur sama lebar. Sebelumnya
                keterangannya bertumpuk menurun di bawah donat yang rata
                kiri, jadi separuh kanan kartu kosong dan "Dikirim" terbaca
                sebagai bagian terpisah, bukan pasangan "Diambil". */}
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              <Donat ambil={total.ambilVolume} kirim={total.kirimVolume} />

              <ul className="grid w-full grid-cols-2 gap-3 sm:block sm:w-auto sm:min-w-[170px] sm:flex-1 sm:space-y-6">
                <li className="flex items-start gap-2.5 rounded-[var(--radius-md)] border p-3 sm:rounded-none sm:border-0 sm:p-0" style={{ borderColor: "var(--border)" }}>
                  <span className="mt-[5px] hidden h-3 w-3 shrink-0 rounded-full sm:block" style={{ background: "var(--brand)" }} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] sm:text-[11.5px]" style={{ color: "var(--brand-strong)" }}>
                      <Truck className="h-4 w-4" /> Diambil
                    </span>
                    <span className="mt-1.5 block whitespace-nowrap font-mono text-[19px] font-extrabold leading-none tabular-nums sm:text-[26px]" style={{ color: "var(--brand-strong)" }}>
                      {fmtTon(total.ambilVolume)}
                    </span>
                    <span className="mt-1.5 block text-[12px] text-slate-400">
                      {fmtAngka(total.ambilTransaksi)} transaksi
                    </span>
                  </span>
                </li>

                <li className="flex items-start gap-2.5 rounded-[var(--radius-md)] border p-3 sm:rounded-none sm:border-0 sm:p-0" style={{ borderColor: "var(--border)" }}>
                  <span className="mt-[5px] hidden h-3 w-3 shrink-0 rounded-full sm:block" style={{ background: "var(--border-strong)" }} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:text-[11.5px]">
                      <PackageCheck className="h-4 w-4" /> Dikirim
                    </span>
                    <span className="mt-1.5 block whitespace-nowrap font-mono text-[19px] font-extrabold leading-none tabular-nums text-slate-800 sm:text-[26px]">
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
                          {selisih > 0 ? "+" : "-"}{fmtAngka(Math.abs(selisih), 1)} poin <PanahTren naik={selisih > 0} />
                        </span>
                      )}
                    </>
                  )
                })()
              )}
            </div>

            {/* Rincian per gudang -- semua gudang selalu tampil,
                termasuk yang belum ada aktivitas, supaya Manager langsung
                lihat gudang mana yang armadanya sama sekali belum jalan. */}
            {/* Tabel rincian per gudang.

                Satuan "ton" pindah ke judul kolom. Ditulis di tiap sel,
                "26,68 ton" tidak muat di kolom selebar 60px pada layar
                ponsel dan patah jadi dua baris: angka dan satuannya
                terpisah, dan barisnya jadi dua kali lebih tinggi dari yang
                perlu. Kolom Rekap disembunyikan di ponsel; kesimpulannya
                pindah ke bawah nama gudang, tempat ia tetap terbaca tanpa
                menyempitkan keempat kolom angka.

                Kolom angka dibiarkan selebar isinya (w-px + nowrap) dan
                seluruhnya rata kanan, sementara kolom Gudang mengambil sisa
                lebar. Garis di bawah judul dibuat lebih tegas daripada garis
                antarbaris supaya kepala tabel jelas terpisah dari isinya. */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Kepala tabel tanpa latar, menyatu dengan kartu; hanya garis
                    bawah tipis. Dulu label grup Ambil bergaris bawah hijau dan
                    Kirim bergaris bawah abu -- dua stempel setengah berwarna
                    yang di ponsel terbaca seperti dua tab yang salah satunya
                    aktif -- lalu sempat jadi pita abu yang memotong kartu.
                    Pemisah kelompok kini satu garis tegak di antara Ambil dan
                    Kirim, menerus dari kepala sampai baris total, dan tiap
                    baris gudang dibatasi garis tipis yang sama dengan garis
                    bawah kepala. Warna hijau cukup di angka ton ambil. */}
                <thead className="border-b border-slate-100 text-slate-600">
                  <tr>
                    <th rowSpan={2} className="py-2 pl-3 pr-2 align-bottom text-xs font-semibold">
                      Gudang
                    </th>
                    {/* Label grup dirata-kanan mengikuti kolom angkanya.
                        Judul di tengah tidak pernah sejajar dengan angka yang
                        rata kanan, itu yang bikin header terlihat goyah.

                        Garis bawah tipis di bawah tiap label grup menegaskan
                        bahwa Trans. dan Ton di bawahnya milik grup itu. Garis
                        ditarik di span dalam sel, bukan di tepi sel, supaya
                        menjorok sebesar padding sel: garis Ambil dan garis
                        Kirim berhenti sebelum garis tegak pemisah, tidak
                        menyambung jadi satu garis panjang. */}
                    <th colSpan={2} className="border-r border-slate-200 px-2 pb-1 pt-2 text-right text-xs font-semibold">
                      <span className="block border-b border-slate-200 pb-1">Ambil</span>
                    </th>
                    <th colSpan={2} className="px-2 pb-1 pt-2 text-right text-xs font-semibold">
                      <span className="block border-b border-slate-200 pb-1">Kirim</span>
                    </th>
                    <th rowSpan={2} className="hidden py-2 pl-2 pr-3 align-bottom text-right text-xs font-semibold sm:table-cell">
                      Rekap
                    </th>
                  </tr>
                  <tr>
                    <th className="w-px whitespace-nowrap px-2 pb-2 pt-0.5 text-right text-[10px] font-medium text-slate-500">Trans.</th>
                    <th className="w-px whitespace-nowrap border-r border-slate-200 px-2 pb-2 pt-0.5 text-right text-[10px] font-medium text-slate-500">Ton</th>
                    <th className="w-px whitespace-nowrap px-2 pb-2 pt-0.5 text-right text-[10px] font-medium text-slate-500">Trans.</th>
                    <th className="w-px whitespace-nowrap px-2 pb-2 pt-0.5 text-right text-[10px] font-medium text-slate-500">Ton</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => {
                    const rowTercatat = row.ambilVolume + row.kirimVolume
                    const rekap = ringkasRekap(row.ambilVolume, row.kirimVolume)
                    const warnaRekap = rowTercatat === 0 ? "var(--muted-faint)" : rekap.warna
                    return (
                      <tr key={row.warehouseId} className="border-b border-slate-100">
                        <td className="py-3 pl-3 pr-2">
                          <span className="block font-semibold text-slate-800">{row.warehouseName}</span>
                          <span className="mt-0.5 block text-[10.5px] font-semibold sm:hidden" style={{ color: warnaRekap }}>
                            {rekap.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right font-mono tabular-nums text-slate-500">{fmtAngka(row.ambilTransaksi)}</td>
                        <td
                          className="whitespace-nowrap border-r border-slate-200 px-2 py-3 text-right font-mono tabular-nums font-semibold"
                          style={{ color: row.ambilVolume > 0 ? "var(--brand-strong)" : "var(--muted-faint)" }}
                        >
                          {angkaTon(row.ambilVolume)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right font-mono tabular-nums text-slate-500">{fmtAngka(row.kirimTransaksi)}</td>
                        <td className={`whitespace-nowrap px-2 py-3 text-right font-mono tabular-nums font-semibold ${row.kirimVolume > 0 ? "text-slate-700" : "text-slate-300"}`}>
                          {angkaTon(row.kirimVolume)}
                        </td>
                        <td className="hidden whitespace-nowrap py-3 pl-2 pr-3 text-right sm:table-cell">
                          <span className="text-[11px] font-semibold" style={{ color: warnaRekap }}>
                            {rekap.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pl-3 pr-2 pt-3">
                      <span className="block text-[10px] font-black uppercase tracking-[0.05em] text-slate-500">Total</span>
                      <span className="mt-0.5 block text-[10.5px] font-bold sm:hidden" style={{ color: ringkasRekap(total.ambilVolume, total.kirimVolume).warna }}>
                        {ringkasRekap(total.ambilVolume, total.kirimVolume).label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 pt-3 text-right font-mono tabular-nums font-bold text-slate-700">{fmtAngka(total.ambilTransaksi)}</td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-2 pt-3 text-right font-mono tabular-nums font-black" style={{ color: "var(--brand-strong)" }}>
                      {angkaTon(total.ambilVolume)}
                    </td>
                    <td className="whitespace-nowrap px-2 pt-3 text-right font-mono tabular-nums font-bold text-slate-700">{fmtAngka(total.kirimTransaksi)}</td>
                    <td className="whitespace-nowrap px-2 pt-3 text-right font-mono tabular-nums font-black text-slate-900">{angkaTon(total.kirimVolume)}</td>
                    <td className="hidden whitespace-nowrap pl-2 pr-3 pt-3 text-right sm:table-cell">
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
