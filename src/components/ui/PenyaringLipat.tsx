"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"
import { useLayarPonsel } from "@/lib/useLayarPonsel"

/**
 * Penyaring yang terlipat di ponsel dan terbentang di layar lebar.
 *
 * Tiga kendali penyaring yang di layar lebar duduk sebaris, di ponsel
 * bertumpuk jadi tiga baris penuh: sekitar 150px habis sebelum satu pun data
 * terlihat, padahal sebagian besar kunjungan tidak menyaring apa pun. Yang
 * paling sering dipakai -- kolom pencarian -- karena itu tetap terlihat,
 * sisanya masuk ke balik satu tombol.
 *
 * Tombolnya membawa hitungan penyaring aktif, supaya penyaring yang sedang
 * menyala tidak pernah tersembunyi tanpa jejak. Penyaring yang diam-diam
 * aktif adalah cara tercepat membuat orang mengira datanya hilang.
 */
export default function PenyaringLipat({
  utama,
  children,
  jumlahAktif = 0,
  kelasDesktop = "section section-body grid grid-cols-1 gap-3 md:grid-cols-3",
}: {
  /** Kendali yang tetap terlihat, biasanya kolom pencarian. */
  utama?: ReactNode
  /** Kendali yang disembunyikan di balik tombol saat di ponsel. */
  children: ReactNode
  jumlahAktif?: number
  /**
   * Kelas pembungkus di layar lebar. Diisi string kosong bila pemanggil sudah
   * punya pembungkusnya sendiri: membungkus penyaring tidak boleh mengubah
   * susunan apa pun di layar lebar, dan sebagian halaman memakai tata letak
   * bertingkat yang tidak bisa diwakili satu grid tiga lajur.
   */
  kelasDesktop?: string
}) {
  const ponsel = useLayarPonsel()
  const [terbuka, setTerbuka] = useState(false)

  if (!ponsel) {
    if (!kelasDesktop) {
      return (
        <>
          {utama}
          {children}
        </>
      )
    }
    return (
      <div className={kelasDesktop}>
        {utama}
        {children}
      </div>
    )
  }

  // Pembungkus kartu ikut dilepas kalau pemanggil sudah punya sendiri, sama
  // seperti di layar lebar. Tanpa ini, halaman yang sudah membungkus
  // penyaringnya dalam .section akan tampil sebagai kartu di dalam kartu.
  return (
    <div className={kelasDesktop ? "section section-body space-y-3" : "space-y-3"}>
      <div className="flex items-center gap-2">
        {utama && <div className="min-w-0 flex-1">{utama}</div>}
        <button
          type="button"
          onClick={() => setTerbuka((v) => !v)}
          aria-expanded={terbuka}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border"
          style={{
            borderColor: jumlahAktif > 0 ? "var(--brand)" : "var(--border)",
            background: jumlahAktif > 0 ? "var(--brand-soft)" : "var(--surface)",
            color: jumlahAktif > 0 ? "var(--brand-strong)" : "var(--muted)",
          }}
          aria-label={terbuka ? "Tutup penyaring" : "Buka penyaring"}
          data-testid="penyaring-lipat"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {jumlahAktif > 0 && (
            <span className="bilah-bawah-badge" aria-hidden="true">
              {jumlahAktif}
            </span>
          )}
        </button>
      </div>

      {terbuka && <div className="space-y-3">{children}</div>}
    </div>
  )
}
