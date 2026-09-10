"use client"

import type { Session } from "next-auth"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut } from "lucide-react"
import { isOperationalRole } from "@/lib/roles"
import AgpMark from "@/components/ui/AgpMark"
import PelabelTabel from "@/components/layout/PelabelTabel"
import BottomNav from "@/components/layout/BottomNav"
import { butirAktif, menuUntuk, type ButirNav } from "@/lib/menuNavigasi"

function getPanelLabel(role: string) {
  if (isOperationalRole(role)) return "OPERASIONAL GUDANG"
  return role
}

function SidebarContent({
  navItems,
  pathname,
  user,
}: {
  navItems: ButirNav[]
  pathname: string
  user: Session["user"]
}) {
  return (
    <>
      {/* h-20, tinggi yang sama persis dengan topbar di sebelah kanannya.
          Sebelumnya tingginya dihitung dari padding dan berakhir di 78px
          sementara topbar dipatok 80px, sehingga kedua garis bawahnya
          meleset dua pixel dan sudut kiri atas terbaca miring. */}
      <div className="flex h-20 items-center border-b border-slate-200/70 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <AgpMark size={40} className="flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-950 leading-tight truncate">AGP IS</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-[0.08em] truncate">Agrapana Greenworks Polymer</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.tepat
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link key={item.href} href={item.href}>
              {/* min-h-11 hanya di layar sempit: 40px masih meleset untuk
                  jempol pada daftar sebelas baris yang berdempetan. */}
              <span className={`group flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm font-medium lg:min-h-0 ${
                isActive
                  ? "font-semibold"
                  : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
              }`} style={isActive ? { background: "var(--brand-soft)", color: "var(--brand-strong)" } : undefined}>
                <Icon
                  size={16}
                  strokeWidth={2.1}
                  className={`transition-colors ${isActive ? "" : "text-slate-400 group-hover:text-slate-700"}`}
                  style={isActive ? { color: "var(--brand)" } : undefined}
                />
                <span className="truncate">{item.nama}</span>
              </span>
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-slate-200/70">
        <div className="px-2 mb-3 min-w-0">
          <p className="text-sm font-bold text-slate-950 truncate">{user.name}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="premium-button w-full py-2.5 px-3 bg-white text-slate-600 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-semibold flex items-center justify-center gap-2 border border-slate-200 shadow-sm"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </>
  )
}

export default function DashboardLayout({
  children,
  jumlahApproval,
}: {
  children: React.ReactNode
  /** Antrean persetujuan Manager, dihitung di layout peladen. */
  jumlahApproval?: number
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Hampir semua halaman dashboard adalah Server Component yang memeriksa
  // sesinya sendiri dan mengalihkan ke /login. Pengaturan tidak: ia
  // Client Component, jadi tanpa penjaga di sini pengunjung tanpa sesi
  // hanya melihat "Memuat..." yang tidak pernah selesai. Yang dijaga
  // adalah tampilannya; datanya sendiri sudah dijaga di /api/user/settings.
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  if (!session) return (
    <div className="liquid-shell flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8" style={{ color: "var(--brand)" }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-slate-500 text-sm font-medium">Memuat...</span>
      </div>
    </div>
  )

  const role = session.user.role

  const navItems = menuUntuk(role)

  const currentPageName =
    butirAktif(navItems, pathname)?.nama ||
    (pathname.includes("/dashboard/manager/") ? "Detail" : "Dashboard")

  return (
    <div className="liquid-shell flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Menyalin judul kolom ke tiap sel supaya tabel bisa tampil sebagai
          kartu di ponsel. Tidak menggambar apa pun. */}
      <PelabelTabel />

      {/* Sidebar tinggal satu, khusus layar lebar. Kembarannya yang berupa
          laci geser dari kiri sudah tidak ada: di ponsel navigasinya pindah
          ke bilah bawah, dan menu sisanya dibuka lewat tab "Lainnya". */}
      <aside className="liquid-sidebar hidden lg:flex w-72 text-slate-950 border-r border-white/70 flex-col flex-shrink-0 z-40 print:hidden">
        <SidebarContent navItems={navItems} pathname={pathname} user={session.user} />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 print:block print:overflow-visible">
        {/* 80px kepala tetap di layar 812px berarti sepersepuluh layar habis
            untuk satu judul, padahal jam dan tanggalnya memang disembunyikan
            di ponsel. Di bawah sm dipendekkan jadi 60px. */}
        {/* Tombol hamburger hilang dari sini. Judul halaman kini berdiri
            sendiri di kiri seperti kepala layar aplikasi ponsel, karena
            navigasinya sudah ada di tepi bawah dalam jangkauan jempol. */}
        <header className="liquid-topbar relative h-[60px] sm:h-20 border-b border-white/70 flex items-center px-4 sm:px-7 gap-3 flex-shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-2.5 lg:hidden">
            <AgpMark size={28} className="flex-shrink-0" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Di bawah lg kepala layar membawa identitas perusahaan di samping
                lambang, bukan nama menu. Setiap halaman sudah dibuka kartu
                judulnya sendiri tepat di bawah kepala ini, jadi nama menu di
                sini hanya mengulang judul yang sama dua kali dalam satu layar,
                sementara lambangnya berdiri tanpa nama. Di layar lebar
                identitas itu sudah ada di sidebar, jadi kepala tetap memuat
                nama halaman. */}
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-sm font-bold leading-tight text-slate-900">
                Agrapana Greenworks Polymer
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase leading-tight tracking-wider" style={{ color: "var(--brand-strong)" }}>
                Information System
              </p>
            </div>
            <div className="hidden min-w-0 lg:block">
              <h2 className="truncate text-[15px] font-black tracking-[-0.01em] text-slate-950">
                {currentPageName}
              </h2>
              <p className="text-xs font-medium text-slate-500 truncate hidden sm:block">
                {getPanelLabel(role)}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end flex-shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
            <span className="text-sm font-bold text-slate-800 tabular-nums leading-none">
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}
            </span>
          </div>

        </header>

        <div className="flex-1 overflow-auto print:overflow-visible">
          <div key={pathname} className="soft-enter p-4 sm:p-7 lg:p-9 max-w-[1500px] mx-auto print:p-0 print:max-w-none">
            {children}
          </div>
        </div>
      </main>

      <BottomNav user={session.user} jumlahApproval={jumlahApproval} />
    </div>
  )
}
