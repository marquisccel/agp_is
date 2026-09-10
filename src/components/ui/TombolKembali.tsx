"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

/**
 * Jalan kembali di atas kartu judul halaman.
 *
 * Ponsel: sub-kepala ringkas seperti bilah navigasi aplikasi -- tombol
 * bulat berpanah lalu judul halaman pendek. Pil "Kembali ke Dashboard"
 * yang sempat dipakai melayang sendirian di atas kartu judul, dan kartu di
 * bawahnya mengulang judul yang sama dalam huruf 26px; di layar 360px dua
 * blok itu memakan hampir sepertiga layar sebelum isi halaman terlihat.
 * Kalau judul diisi, judul besar di kartu PageHeader berikutnya disembunyikan
 * di ponsel (lihat .navigasi-balik di globals.css), sehingga judul halaman
 * hanya tertulis sekali.
 *
 * Layar lebar: pil bertulisan di kiri atas, tidak berubah.
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
  judul,
}: {
  href?: string
  label?: string
  /** Judul pendek halaman untuk sub-kepala ponsel. */
  judul?: string
}) {
  const router = useRouter()

  const kelasPil =
    // ring slate-200 dan bayangan tipis: latar halaman ini abu muda yang
    // hampir sama dengan slate-100, jadi tanpa tepi pilnya nyaris hilang.
    "inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-200"
  const kelasBulat =
    "sentuh-luas flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/50 bg-slate-100 text-slate-600 transition hover:bg-slate-200"

  const tombol = (kelas: string, isi: React.ReactNode, aria?: string) =>
    href ? (
      <Link href={href} className={kelas} aria-label={aria}>
        {isi}
      </Link>
    ) : (
      <button type="button" onClick={() => router.back()} className={kelas} aria-label={aria}>
        {isi}
      </button>
    )

  return (
    // mb-4 (16px) di ponsel sesuai sub-kepala yang ringkas; mb-6 di layar
    // lebar menyamai jarak space-y-6 halaman yang tertimpa kelas ini.
    <div className={`navigasi-balik${judul ? " dengan-judul mb-4 md:mb-6" : ""}`}>
      {judul ? (
        <div className="flex items-center gap-3 md:hidden">
          {tombol(kelasBulat, <ArrowLeft className="h-4 w-4" aria-hidden="true" />, label)}
          <h1 className="min-w-0 truncate text-base font-bold text-slate-900">{judul}</h1>
        </div>
      ) : null}
      <div className={judul ? "hidden md:block" : undefined}>
        {tombol(
          kelasPil,
          <>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {label}
          </>,
        )}
      </div>
    </div>
  )
}
