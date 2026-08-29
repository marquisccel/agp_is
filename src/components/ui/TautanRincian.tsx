import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Tautan kaki kartu menuju layar yang lebih rinci.
 *
 * Polanya ditulis tangan di beberapa kartu, lengkap dengan salinan ukuran
 * huruf, tinggi minimum, dan paddingnya, lalu mulai menyimpang sendiri
 * (pola D-6). Bentuknya kini ditetapkan di sini seluruhnya.
 *
 * Yang boleh disetel pemanggil cuma SATU hal, dan bukan kelas bebas:
 * apakah kaki ini perlu menggambar garis pemisahnya sendiri.
 *
 * Kartu Analisis Susut dan Saldo DP diakhiri .stat-strip yang sudah
 * membawa border-bottom sendiri. Kalau kaki ini ikut menggambar border-top
 * di bawahnya, dua garis 1px bertumpuk dan terbaca sebagai satu garis tebal
 * -- persis keluhan yang muncul setelah komponen ini dipakai di sana.
 * Kartu lain (Top 10 Lapak, Aktivitas Terbaru) diakhiri blok tanpa garis,
 * jadi di sana kakinya memang harus menggambar sendiri.
 *
 * Garisnya WAJIB diberi warna eksplisit. Tailwind v4 memakai currentColor
 * sebagai warna border bawaan, jadi `border-t` saja menghasilkan garis
 * hampir hitam yang mengikuti warna teks.
 */
export default function TautanRincian({
  href,
  children,
  garisAtas = true,
}: {
  href: string
  children: ReactNode
  /** false kalau elemen di atasnya sudah menggambar garis penutupnya. */
  garisAtas?: boolean
}) {
  return (
    <div
      className={`px-5 py-4${garisAtas ? " border-t" : ""}`}
      style={garisAtas ? { borderColor: "var(--border)" } : undefined}
    >
      <Link
        href={href}
        className="inline-flex min-h-[38px] items-center text-[11.5px] font-bold transition-opacity hover:opacity-75"
        style={{ color: "var(--brand-strong)" }}
      >
        {children} →
      </Link>
    </div>
  )
}
