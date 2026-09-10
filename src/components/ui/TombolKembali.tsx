"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

/**
 * Jalan kembali di pojok kiri atas halaman, di atas kartu judul.
 *
 * Sebelumnya tiap halaman menaruh jalan kembalinya sendiri-sendiri: tombol
 * netral di sisi kanan kartu judul yang di ponsel melebar selebar layar,
 * teks polos berpanah, atau tombol di tengah deret penyaring. Pengguna baru
 * harus mencarinya di tempat yang berbeda di tiap layar. Kini bentuk dan
 * letaknya satu: pil abu di kiri atas, terpisah dari aksi halaman.
 *
 * Tanpa href, tombolnya memakai riwayat peramban -- untuk halaman rincian
 * yang bisa dibuka dari beberapa daftar berbeda.
 */
export default function TombolKembali({
  href,
  label = "Kembali",
}: {
  href?: string
  label?: string
}) {
  const router = useRouter()
  const kelas =
    // ring slate-200 dan bayangan tipis: latar halaman ini abu muda yang
    // hampir sama dengan slate-100, jadi tanpa tepi pilnya nyaris hilang.
    "inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-200"
  const isi = (
    <>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </>
  )

  return (
    <div>
      {href ? (
        <Link href={href} className={kelas}>
          {isi}
        </Link>
      ) : (
        <button type="button" onClick={() => router.back()} className={kelas}>
          {isi}
        </button>
      )}
    </div>
  )
}
