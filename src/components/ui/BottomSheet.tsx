"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

/**
 * Panel yang meluncur dari tepi bawah layar.
 *
 * Dialog yang mengambang di tengah layar adalah bentuk khas desktop: di sana
 * pusat layar adalah tempat mata berada dan tetikus sampai ke mana saja. Di
 * ponsel, pusat layar justru area yang paling jauh dari jempol, dan panel yang
 * muncul di sana menyisakan dua pita gelap di atas dan bawah tanpa guna.
 * Aplikasi ponsel karena itu memunculkan pilihan dari bawah, sedekat mungkin
 * dengan jempol yang memegang perangkat.
 *
 * Di layar lebar komponen ini tetap memusatkan dirinya seperti dialog biasa,
 * jadi satu pemakaian melayani kedua bentuk tanpa cabang di sisi pemanggil.
 */
export default function BottomSheet({
  terbuka,
  onTutup,
  judul,
  deskripsi,
  children,
  labelAria,
  peran = "dialog",
}: {
  terbuka: boolean
  onTutup: () => void
  judul?: string
  deskripsi?: string
  children: ReactNode
  labelAria?: string
  peran?: "dialog" | "alertdialog"
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape menutup, dan halaman di belakangnya dikunci supaya tidak ikut
  // tergulir saat isi panel digeser.
  useEffect(() => {
    if (!terbuka) return

    const padaTombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup()
    }
    document.addEventListener("keydown", padaTombol)

    const overflowLama = document.body.style.overflow
    document.body.style.overflow = "hidden"

    // Fokus dipindahkan ke panel supaya pembaca layar dan tombol Tab masuk
    // ke isinya, bukan tetap tertinggal di halaman di belakang.
    panelRef.current?.focus()

    return () => {
      document.removeEventListener("keydown", padaTombol)
      document.body.style.overflow = overflowLama
    }
  }, [terbuka, onTutup])

  if (!terbuka || typeof document === "undefined") return null

  return createPortal(
    <div
      className="bottom-sheet-latar"
      onClick={onTutup}
      data-testid="bottom-sheet-latar"
    >
      <div
        ref={panelRef}
        role={peran}
        aria-modal="true"
        aria-label={labelAria ?? judul}
        tabIndex={-1}
        className="bottom-sheet-panel"
        onClick={(e) => e.stopPropagation()}
        data-testid="bottom-sheet"
      >
        {/* Pegangan geser. Tidak berfungsi apa-apa selain memberi tahu bahwa
            panel ini datang dari bawah dan bisa ditutup. */}
        <div className="bottom-sheet-pegangan" aria-hidden="true" />

        {(judul || deskripsi) && (
          <div className="px-5 pb-3 pt-1">
            {judul && (
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                {judul}
              </h3>
            )}
            {deskripsi && (
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                {deskripsi}
              </p>
            )}
          </div>
        )}

        <div className="bottom-sheet-isi">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
