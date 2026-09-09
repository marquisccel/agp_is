"use client"

import type { Session } from "next-auth"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { LogOut, MoreHorizontal } from "lucide-react"
import BottomSheet from "@/components/ui/BottomSheet"
import { butirAktif, menuUntuk, type ButirNav } from "@/lib/menuNavigasi"

/**
 * Bilah navigasi tetap di tepi bawah layar, hanya di bawah lg.
 *
 * ── Kenapa pindah ke bawah ───────────────────────────────────────────
 *
 * Sebelumnya seluruh menu hidup di laci yang ditarik dari tombol hamburger
 * di pojok kiri ATAS. Di layar 844px, pojok itu titik terjauh dari jempol
 * pada tangan yang memegang perangkat, dan setiap perpindahan halaman
 * menuntut dua ketukan: buka laci, lalu pilih. Menu yang paling sering
 * dipakai jadi berjarak dua ketukan sepanjang hari.
 *
 * Empat tujuan tersering tiap peran kini menempel di tepi bawah, satu
 * ketukan, di dalam jangkauan jempol. Sisanya masuk laci lewat tab kelima.
 *
 * ── Kenapa hanya lima tab ────────────────────────────────────────────
 *
 * Pada lebar 320px, satu tab dari lima sudah tinggal 64px. Enam tab
 * membuat labelnya terpotong, dan sasaran sentuhnya turun di bawah ambang
 * yang bisa ditekan tanpa meleset. Manager punya sebelas menu, jadi
 * pembagian utama/laci memang wajib, bukan pilihan gaya.
 */
export default function BottomNav({
  user,
  jumlahApproval,
}: {
  user: Session["user"]
  /** Jumlah antrean persetujuan Manager, untuk badge pada tab Approval. */
  jumlahApproval?: number
}) {
  const pathname = usePathname()
  const [laciTerbuka, setLaciTerbuka] = useState(false)

  const menu = menuUntuk(user.role)
  const utama = menu.filter((b) => b.utama)
  const lainnya = menu.filter((b) => !b.utama)

  const sedangDibuka = (butir: ButirNav) => {
    if (butir.tepat) return pathname === butir.href
    if (pathname === butir.href || pathname.startsWith(`${butir.href}/`)) return true
    // Tab Approval mewakili dua rute sekaligus, Harga dan DP. Tanpa ini,
    // membuka Approval DP dari laci membuat seluruh bilah bawah tampak
    // tidak ada yang aktif.
    if (butir.href === "/dashboard/manager/approval-harga") {
      return pathname.startsWith("/dashboard/manager/approval-dp")
    }
    return false
  }

  // Butir di laci ikut menyorot, supaya pengguna tahu ia sedang berada di
  // halaman yang dibuka dari sana.
  const aktifDiLaci = butirAktif(lainnya, pathname)

  return (
    <>
      <nav
        className="bilah-bawah lg:hidden print:hidden"
        aria-label="Navigasi utama"
        data-testid="bottom-nav"
      >
        {utama.map((butir) => {
          const Ikon = butir.icon
          const aktif = sedangDibuka(butir)
          const badge =
            butir.href === "/dashboard/manager/approval-harga" ? jumlahApproval : undefined

          return (
            <Link
              key={butir.href}
              href={butir.href}
              className="bilah-bawah-tab"
              aria-current={aktif ? "page" : undefined}
              data-aktif={aktif ? "" : undefined}
            >
              <span className="bilah-bawah-ikon">
                <Ikon size={20} strokeWidth={2.1} />
                {badge ? (
                  <span className="bilah-bawah-badge" aria-hidden="true">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              <span className="bilah-bawah-label">{butir.pendek ?? butir.nama}</span>
              {badge ? <span className="sr-only">, {badge} menunggu</span> : null}
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setLaciTerbuka(true)}
          className="bilah-bawah-tab"
          data-aktif={aktifDiLaci ? "" : undefined}
          aria-haspopup="dialog"
          aria-expanded={laciTerbuka}
          data-testid="bottom-nav-lainnya"
        >
          <span className="bilah-bawah-ikon">
            <MoreHorizontal size={20} strokeWidth={2.1} />
          </span>
          <span className="bilah-bawah-label">Lainnya</span>
        </button>
      </nav>

      <BottomSheet
        terbuka={laciTerbuka}
        onTutup={() => setLaciTerbuka(false)}
        judul="Menu lainnya"
        deskripsi={user.name ?? undefined}
      >
        <ul className="laci-menu">
          {lainnya.map((butir) => {
            const Ikon = butir.icon
            const aktif = butir.tepat
              ? pathname === butir.href
              : pathname === butir.href || pathname.startsWith(`${butir.href}/`)

            return (
              <li key={butir.href}>
                <Link
                  href={butir.href}
                  onClick={() => setLaciTerbuka(false)}
                  className="laci-butir"
                  data-aktif={aktif ? "" : undefined}
                  aria-current={aktif ? "page" : undefined}
                >
                  <Ikon size={18} strokeWidth={2.1} className="shrink-0" />
                  <span className="truncate">{butir.nama}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="laci-kaki">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold" style={{ color: "var(--foreground)" }}>
              {user.name}
            </p>
            <p className="truncate text-xs" style={{ color: "var(--muted-faint)" }}>
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="laci-keluar"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
