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
 *
 * Bentuknya kartu mandiri penuh (rounded-2xl, p-4), tanpa garis pemisah
 * tengah. Nominal di kanan berukuran fluid dan tidak boleh patah, supaya
 * tetap dominan tanpa didesak label di layar 320px.
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
      ? "border-amber-200/80 bg-amber-50/80"
      : "border-slate-200/60 bg-slate-50"
  const warnaLabel = nada === "peringatan" ? "text-amber-800" : "text-slate-500"
  const warnaKeterangan = nada === "peringatan" ? "text-amber-700" : "text-slate-500"
  const warnaNilai = nada === "peringatan" ? "text-amber-900" : "text-slate-900"

  return (
    <div className={`hanya-ponsel flex items-center justify-between gap-3 rounded-2xl border p-4 ${kelasNada} ${className}`}>
      <div className="min-w-0">
        <p className={`text-[10.5px] font-bold uppercase tracking-wider ${warnaLabel}`}>{label}</p>
        {keterangan && <p className={`mt-1 text-xs font-medium ${warnaKeterangan}`}>{keterangan}</p>}
      </div>
      <p className={`shrink-0 whitespace-nowrap font-mono text-[clamp(14px,4.5vw,18px)] font-extrabold tabular-nums ${warnaNilai}`}>{nilai}</p>
    </div>
  )
}
