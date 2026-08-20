"use client"

import type { Session } from "next-auth"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Database,
  History,
  LogOut,
  Menu,
  Package,
  PenLine,
  ScrollText,
  ShieldCheck,
  Scale,
  Settings,
  Store,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { isOperationalRole } from "@/lib/roles"
import AgpMark from "@/components/ui/AgpMark"

type NavItem = {
  name: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

function getPanelLabel(role: string) {
  if (isOperationalRole(role)) return "OPERASIONAL GUDANG"
  return role
}

function SidebarContent({
  navItems,
  pathname,
  user,
  onNavigate,
}: {
  navItems: NavItem[]
  pathname: string
  user: Session["user"]
  onNavigate: () => void
}) {
  return (
    <>
      <div className="px-4 py-5 border-b border-slate-200/70">
        <div className="flex items-center gap-3">
          <AgpMark size={40} className="rounded-xl shadow-sm flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-950 leading-tight truncate">Agrapana Greenworks</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-[0.08em] truncate">Polymer Information System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <span className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 text-sm font-medium ${
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
                <span className="truncate">{item.name}</span>
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

  const navItems: NavItem[] = [
    ...(isOperationalRole(role) ? [
      ...(role === "ADMIN" ? [
        { name: "Double Check", href: "/dashboard/admin", icon: ShieldCheck, exact: true },
      ] : []),
      { name: "Input Pembelian", href: "/dashboard/staff", icon: Package, exact: true },
      { name: "Data Lapak", href: "/dashboard/staff/suppliers", icon: Store },
      ...(role === "ADMIN" ? [
        { name: "Approval Kasbon", href: "/dashboard/admin/dp", icon: WalletCards },
      ] : [
        { name: "Pengajuan Kasbon", href: "/dashboard/staff/dp", icon: WalletCards },
      ]),
      { name: "Daftar Transaksi", href: "/dashboard/staff/history", icon: ClipboardList },
      { name: "Transfer Pembayaran", href: "/dashboard/admin/transfer", icon: CreditCard },
    ] : []),
    ...(role === "MANAGER" ? [
      { name: "Analytics", href: "/dashboard/manager", icon: BarChart3, exact: true },
      { name: "Analisis Susut", href: "/dashboard/manager/susut", icon: Scale },
      { name: "Rekap DP", href: "/dashboard/manager/dp", icon: WalletCards },
      { name: "Approval Harga", href: "/dashboard/manager/approval-harga", icon: PenLine },
      { name: "Approval DP", href: "/dashboard/manager/approval-dp", icon: CreditCard },
      { name: "Master Data", href: "/dashboard/manager/master-data", icon: Database },
      { name: "Setting Target", href: "/dashboard/manager/targets", icon: Target },
      { name: "Data Lapak", href: "/dashboard/manager/suppliers", icon: Store },
      { name: "Daftar Transaksi", href: "/dashboard/manager/history", icon: History },
      { name: "Audit Trail", href: "/dashboard/manager/audit-trail", icon: ScrollText },
    ] : []),
    { name: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ]

  const currentPageName = navItems.find(i => i.href === pathname)?.name ||
    (pathname.includes("/dashboard/manager/") ? "Detail" : "Dashboard")

  return (
    <div className="liquid-shell flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="liquid-sidebar hidden lg:flex w-72 text-slate-950 border-r border-white/70 flex-col flex-shrink-0 z-40 print:hidden">
        <SidebarContent
          navItems={navItems}
          pathname={pathname}
          user={session.user}
          onNavigate={() => {
            setSidebarOpen(false)
          }}
        />
      </aside>

      <aside className={`
        liquid-sidebar fixed top-0 left-0 h-full w-72 max-w-[85vw] text-slate-950 shadow-2xl
        flex flex-col z-40 lg:hidden print:hidden
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <SidebarContent
          navItems={navItems}
          pathname={pathname}
          user={session.user}
          onNavigate={() => {
            setSidebarOpen(false)
          }}
        />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 print:block print:overflow-visible">
        <header className="liquid-topbar relative h-20 border-b border-white/70 flex items-center px-4 sm:px-7 gap-3 flex-shrink-0 z-20 print:hidden">
          <button
            className="lg:hidden p-2 rounded-2xl text-slate-600 hover:bg-white transition-colors flex-shrink-0 shadow-sm border border-slate-200"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="min-w-0">
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
    </div>
  )
}
