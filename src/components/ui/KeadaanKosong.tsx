import type { LucideIcon } from "lucide-react"

/**
 * Keadaan kosong standar: ikon di lingkaran abu, judul pendek, satu
 * kalimat keterangan.
 *
 * Sebelumnya tiap daftar kosong menulis kalimatnya sendiri dengan gaya
 * sendiri -- teks abu kecil di tengah kartu yang terbaca seperti pesan
 * galat, bukan keadaan yang wajar. Bentuk ini memberi tahu tiga hal
 * sekaligus: bagian ini memang kosong, apa namanya, dan kapan ia terisi.
 */
export default function KeadaanKosong({
  ikon: Ikon,
  judul,
  keterangan,
  className = "",
}: {
  ikon: LucideIcon
  judul: string
  keterangan?: string
  className?: string
}) {
  return (
    <div className={`px-4 py-10 text-center ${className}`}>
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Ikon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-slate-700">{judul}</p>
      {keterangan && <p className="mx-auto mt-1 max-w-[250px] text-xs leading-5 text-slate-400">{keterangan}</p>}
    </div>
  )
}
