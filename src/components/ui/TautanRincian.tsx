import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Tautan kaki kartu menuju layar yang lebih rinci.
 *
 * Polanya sudah dipakai di kartu Analisis Susut dan Saldo DP, tapi ditulis
 * tangan di kedua tempat -- ukuran huruf, tinggi minimum, dan padding
 * kakinya ikut disalin. Begitu kartu ketiga dan keempat butuh hal yang
 * sama, salinannya jadi empat dan mulai bisa menyimpang sendiri (pola D-6).
 *
 * Bentuk kakinya ditetapkan di sini seluruhnya, tanpa celah untuk disetel
 * dari luar. Percobaan pertama masih membuka prop className, dan dalam satu
 * kali pemakaian jaraknya sudah berbeda di tiga kartu: 16px atas-bawah,
 * 0 atas 20px bawah, dan kiri 20px lawan 22px. Tepat masalah yang mau
 * dihindari komponen ini.
 *
 * Garis pemisahnya WAJIB diberi warna eksplisit. Tailwind v4 memakai
 * currentColor sebagai warna border bawaan, jadi `border-t` saja menghasilkan
 * garis hampir hitam yang mengikuti warna teks -- bukan garis tipis abu
 * seperti pemisah lain di aplikasi.
 */
export default function TautanRincian({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <div className="border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
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
