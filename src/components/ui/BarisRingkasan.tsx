import type { ReactNode } from "react"

/**
 * Satu angka ringkasan sebagai baris mendatar selebar penuh, khusus ponsel.
 *
 * Deret tiga petak ringkasan (mis. Menunggu / Sudah / Belum Lunas) di
 * layar 360px menyisakan satu petak yatim di baris kedua: petak selebar
 * penuh yang isinya tetap bertumpuk seperti petak kecil, dengan separuh
 * kanannya kosong. Di sini angka ketiga jadi baris sendiri -- label dan
 * keterangan di kiri, nominal di kanan -- sehingga lebarnya terpakai.
 *
 * Di layar lebar komponen ini tidak tampil; petak ketiga di deret
 * ringkasan tetap dipakai seperti biasa (lihat .sembunyi-ponsel).
 */
export default function BarisRingkasan({
  label,
  keterangan,
  nilai,
  nada = "netral",
  className = "",
}: {
  label: string
  keterangan?: ReactNode
  nilai: ReactNode
  nada?: "netral" | "peringatan"
  className?: string
}) {
  const kelasNada =
    nada === "peringatan"
      ? "border-amber-200/60 bg-amber-50/70"
      : "border-slate-200/60 bg-slate-50"
  const warnaLabel = nada === "peringatan" ? "text-amber-700" : "text-slate-500"
  const warnaNilai = nada === "peringatan" ? "text-amber-700" : "text-slate-800"

  return (
    <div className={`hanya-ponsel flex items-center justify-between gap-3 rounded-xl border p-3.5 ${kelasNada} ${className}`}>
      <div className="min-w-0">
        <p className={`text-[10.5px] font-bold uppercase tracking-[0.06em] ${warnaLabel}`}>{label}</p>
        {keterangan && <p className="mt-0.5 text-[11px] text-slate-500">{keterangan}</p>}
      </div>
      <p className={`shrink-0 whitespace-nowrap font-mono text-sm font-bold tabular-nums ${warnaNilai}`}>{nilai}</p>
    </div>
  )
}
