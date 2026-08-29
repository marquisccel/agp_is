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
 * Panah ditambahkan komponen ini, bukan diketik di tiap pemanggil, supaya
 * tidak ada kartu yang kelewat memakainya.
 */
export default function TautanRincian({
  href,
  children,
  className = "px-[22px] py-4",
}: {
  href: string
  children: ReactNode
  /** Padding kaki; disesuaikan kalau kartunya memakai jarak yang berbeda. */
  className?: string
}) {
  return (
    <div className={className}>
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
