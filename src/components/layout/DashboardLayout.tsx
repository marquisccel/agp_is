"use client"

import type { Session } from "next-auth"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Database,
  History,
  Package,
  PenLine,
  ShieldCheck,
  Scale,
  Settings,
  Store,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
}

function SidebarContent({
  role,
  navItems,
  pathname,
  user,
  onNavigate,
}: {
  role: string
  navItems: NavItem[]
  pathname: string
  user: Session["user"]
  onNavigate: () => void
}) {
  return (
    <>
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          PET Recycle
        </h1>
        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">{role} PANEL</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/dashboard/manager" && pathname.startsWith(item.href))

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <span className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}>
                <Icon size={16} strokeWidth={2.2} />
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm shadow-lg flex-shrink-0">
            {user.name?.charAt(0) || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full py-2 px-4 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log Out
        </button>
      </div>
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8 text-cyan-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-slate-500 text-sm font-medium">Memuat...</span>
      </div>
    </div>
  )

  const role = session.user.role

  const navItems: NavItem[] = [
    ...(role === "STAFF" ? [
      { name: "Input Pembelian", href: "/dashboard/staff", icon: Package },
      { name: "Data Supplier", href: "/dashboard/staff/suppliers", icon: Store },
      { name: "Pengajuan Kasbon", href: "/dashboard/staff/dp", icon: WalletCards },
      { name: "Daftar Transaksi", href: "/dashboard/staff/history", icon: ClipboardList },
    ] : []),
    ...(role === "ADMIN" ? [
      { name: "Double Check", href: "/dashboard/admin", icon: CheckCircle2 },
      { name: "Transfer Pembayaran", href: "/dashboard/admin/transfer", icon: CreditCard },
      { name: "Manajemen Kasbon", href: "/dashboard/admin/dp", icon: WalletCards },
      { name: "Daftar Transaksi", href: "/dashboard/admin/history", icon: ClipboardList },
    ] : []),
    ...(role === "SUPERVISOR" ? [
      { name: "Review Transaksi", href: "/dashboard/supervisor", icon: ShieldCheck },
      { name: "Daftar Transaksi", href: "/dashboard/supervisor/history", icon: ClipboardList },
    ] : []),
    ...(role === "MANAGER" ? [
      { name: "Analytics", href: "/dashboard/manager", icon: BarChart3 },
      { name: "Analisis Susut", href: "/dashboard/manager/susut", icon: Scale },
      { name: "Rekap DP", href: "/dashboard/manager/dp", icon: WalletCards },
      { name: "Approval Harga", href: "/dashboard/manager/approval-harga", icon: PenLine },
      { name: "Approval DP", href: "/dashboard/manager/approval-dp", icon: CreditCard },
      { name: "Master Data", href: "/dashboard/manager/master-data", icon: Database },
      { name: "Setting Target", href: "/dashboard/manager/targets", icon: Target },
      { name: "Data Lapak", href: "/dashboard/manager/suppliers", icon: Store },
      { name: "Daftar Transaksi", href: "/dashboard/manager/history", icon: History },
    ] : []),
    { name: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ]

  const currentPageName = navItems.find(i => i.href === pathname)?.name ||
    (pathname.includes("/dashboard/manager/") ? "Detail" : "Dashboard")

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="hidden lg:flex w-60 bg-slate-900 text-white shadow-xl flex-col flex-shrink-0 z-40">
        <SidebarContent
          role={role}
          navItems={navItems}
          pathname={pathname}
          user={session.user}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      <aside className={`
        fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-slate-900 text-white shadow-2xl
        flex flex-col z-40 lg:hidden
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <SidebarContent
          role={role}
          navItems={navItems}
          pathname={pathname}
          user={session.user}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center px-4 gap-3 shadow-sm flex-shrink-0 z-20">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 truncate">{currentPageName}</h2>
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">{session.user.name} - {role}</p>
          </div>

          <div className="hidden sm:flex flex-col items-end flex-shrink-0">
            <span className="text-sm font-bold text-slate-700 tabular-nums leading-none">
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}
            </span>
          </div>

          <div className="lg:hidden w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xs shadow flex-shrink-0">
            {session.user.name?.charAt(0) || "U"}
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
