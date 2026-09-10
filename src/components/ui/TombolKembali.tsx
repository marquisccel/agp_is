"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

/**
 * Jalan kembali di atas kartu judul halaman.
 *
 * Ponsel: pil kecil bertulisan "Kembali" saja, dengan kartu judul halaman
 * (label hijau, judul, deskripsi) tetap utuh tepat di bawahnya. Varian
 * sub-kepala yang menyembunyikan kartu judul sempat dipakai, tetapi dengan
 * begitu deskripsi menu ikut hilang dan pengguna kehilangan konteks layar
 * yang sedang dibuka. Label "Kembali ke Dashboard" dipendekkan di ponsel:
 * tujuannya sudah jelas dari bilah bawah, dan label panjang membuat pilnya
 * terbaca seperti tombol aksi.
 *
 * Layar lebar: pil bertulisan lengkap di kiri atas, tidak berubah.
 *
 * Tanpa href, tombolnya memakai riwayat peramban -- untuk halaman rincian
 * yang bisa dibuka dari beberapa daftar berbeda.
 *
 * Halaman yang dibuka langsung dari tab bilah bawah tidak memakai komponen
 * ini: tabnya sendiri sudah jalan pulang.
 */
export default function TombolKembali({
  href,
  label = "Kembali",
}: {
  href?: string
  /** Label di layar lebar. Di ponsel selalu "Kembali". */
  label?: string
}) {
  const router = useRouter()

  const kelasPil =
    // ring slate-200 dan bayangan tipis: latar halaman ini abu muda yang
    // hampir sama dengan slate-100, jadi tanpa tepi pilnya nyaris hilang.
    "inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-200"
  // Tampak 30px, sasaran sentuhnya 44px lewat .sentuh-luas-y.
  const kelasPonsel =
    "sentuh-luas-y inline-flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"

  const tombol = (kelas: string, teks: string) => {
    const isi = (
      <>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {teks}
      </>
    )
    return href ? (
      <Link href={href} className={kelas}>
        {isi}
      </Link>
    ) : (
      <button type="button" onClick={() => router.back()} className={kelas}>
        {isi}
      </button>
    )
  }

  return (
    // mb-3 di ponsel mendekatkan pil ke kartu judul yang ia layani; mb-6 di
    // layar lebar menyamai jarak space-y-6 halaman yang tertimpa kelas ini.
    <div className="navigasi-balik mb-3 md:mb-6">
      <div className="md:hidden">{tombol(kelasPonsel, "Kembali")}</div>
      <div className="hidden md:block">{tombol(kelasPil, label)}</div>
    </div>
  )
}
