import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Database,
  History,
  Package,
  PenLine,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { isOperationalRole } from "@/lib/roles"

export type ButirNav = {
  nama: string
  href: string
  icon: LucideIcon
  /** Cocok hanya bila path persis sama, bukan juga anak-anaknya. */
  tepat?: boolean
  /**
   * Label untuk bilah bawah. Satu tab hanya selebar seperlima layar, jadi
   * "Transfer Pembayaran" mustahil terbaca di sana; nama panjangnya tetap
   * dipakai di sidebar desktop dan di laci.
   */
  pendek?: string
  /**
   * Tampil sebagai tab di bilah bawah. Sisanya masuk laci "Lainnya".
   * Bilah bawah hanya punya lima slot dan satu sudah dipakai laci, jadi
   * paling banyak empat butir per peran boleh ditandai.
   */
  utama?: boolean
}

/**
 * Satu-satunya sumber daftar menu.
 *
 * Sebelumnya daftar ini ditulis di dalam DashboardLayout, sehingga sidebar
 * desktop memilikinya sendiri. Begitu bilah bawah dan laci ikut memerlukan
 * daftar yang sama, menyalinnya berarti tiga tempat yang harus diubah
 * bersamaan setiap ada menu baru.
 */
export function menuUntuk(role: string): ButirNav[] {
  const operasional = isOperationalRole(role)

  return [
    ...(operasional
      ? [
          ...(role === "ADMIN"
            ? [
                {
                  nama: "Double Check",
                  pendek: "Cek",
                  href: "/dashboard/admin",
                  icon: ShieldCheck,
                  tepat: true,
                  utama: true,
                },
              ]
            : [
                // Admin tidak melakukan pembelian; tugasnya memverifikasi
                // nota yang dibuat Staff.
                {
                  nama: "Input Pembelian",
                  pendek: "Input",
                  href: "/dashboard/staff",
                  icon: Package,
                  tepat: true,
                  utama: true,
                },
              ]),
          {
            nama: "Data Lapak",
            pendek: "Lapak",
            href: "/dashboard/staff/suppliers",
            icon: Store,
            utama: true,
          },
          // Kasbon tidak lagi lewat Admin: pengajuannya dari Staff dan
          // persetujuannya langsung di Manager.
          ...(role === "ADMIN"
            ? []
            : [
                {
                  nama: "Pengajuan Kasbon",
                  pendek: "Kasbon",
                  href: "/dashboard/staff/dp",
                  icon: WalletCards,
                  utama: true,
                },
              ]),
          // Admin dan Staff melihat daftar yang berbeda. Daftar Admin yang
          // lengkap ada di rute tersendiri.
          {
            nama: "Daftar Transaksi",
            pendek: "Transaksi",
            href: role === "ADMIN" ? "/dashboard/admin/history" : "/dashboard/staff/history",
            icon: ClipboardList,
            utama: true,
          },
          {
            nama: "Transfer Pembayaran",
            pendek: "Transfer",
            href: "/dashboard/admin/transfer",
            icon: CreditCard,
            // Admin punya satu slot sisa karena tidak mengajukan kasbon.
            utama: role === "ADMIN",
          },
        ]
      : []),
    ...(role === "MANAGER"
      ? [
          {
            nama: "Analytics",
            pendek: "Analytics",
            href: "/dashboard/manager",
            icon: BarChart3,
            tepat: true,
            utama: true,
          },
          { nama: "Analisis Susut", href: "/dashboard/manager/susut", icon: Scale },
          { nama: "Rekap DP", href: "/dashboard/manager/dp", icon: WalletCards },
          // Satu tab "Approval" mewakili dua antrean sekaligus, Harga dan
          // DP. Dipisah jadi dua tab, keduanya memakan separuh bilah bawah
          // untuk pekerjaan yang di kepala Manager adalah satu tugas yang
          // sama: memutuskan yang menunggu. Tab ini menyorot pada kedua
          // rutenya (lihat sedangDibuka di BottomNav) dan badge-nya
          // menjumlahkan kedua antrean.
          {
            nama: "Approval Harga",
            pendek: "Approval",
            href: "/dashboard/manager/approval-harga",
            icon: PenLine,
            utama: true,
          },
          { nama: "Approval DP", href: "/dashboard/manager/approval-dp", icon: CreditCard },
          { nama: "Master Data", href: "/dashboard/manager/master-data", icon: Database },
          {
            nama: "Data Lapak",
            pendek: "Lapak",
            href: "/dashboard/manager/suppliers",
            icon: Store,
            utama: true,
          },
          {
            nama: "Daftar Transaksi",
            pendek: "Transaksi",
            href: "/dashboard/manager/history",
            icon: History,
            utama: true,
          },
          { nama: "Transfer Pembayaran", href: "/dashboard/manager/transfer", icon: CreditCard },
          { nama: "Audit Trail", href: "/dashboard/manager/audit-trail", icon: ScrollText },
        ]
      : []),
    { nama: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ]
}

/** Butir yang sedang dibuka, dipakai untuk menyorot tab dan menulis judul. */
export function butirAktif(menu: ButirNav[], pathname: string): ButirNav | undefined {
  return menu.find((b) =>
    b.tepat ? pathname === b.href : pathname === b.href || pathname.startsWith(`${b.href}/`),
  )
}
