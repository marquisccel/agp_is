import { getServerSession } from "next-auth/next"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

/**
 * Jumlah antrean yang menunggu keputusan Manager, untuk badge pada tab
 * Approval di bilah navigasi bawah.
 *
 * Dihitung di sini, bukan lewat endpoint baru: layout ini sudah berjalan di
 * peladen pada setiap halaman dashboard, jadi dua count murah menumpang di
 * perjalanan yang memang sudah terjadi. Menambah rute API berarti satu
 * perjalanan jaringan lagi dari ponsel hanya untuk sebuah angka kecil.
 *
 * Konsekuensinya angka ini disegarkan saat halaman dimuat penuh, bukan pada
 * perpindahan antarhalaman di dalam layout yang sama. Untuk penanda "ada yang
 * menunggu" itu sudah memadai; angka pastinya tetap ada di halaman
 * antreannya sendiri.
 */
async function hitungAntreanApproval(role: string | undefined) {
  if (role !== "MANAGER") return undefined

  const [harga, dp] = await Promise.all([
    prisma.purchase.count({ where: { status_approval: "menunggu_approval_harga" } }),
    prisma.downPayment.count({ where: { status_approval: "menunggu_approval_manager" } }),
  ])

  return harga + dp
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const jumlahApproval = await hitungAntreanApproval(session?.user?.role)

  return <DashboardLayout jumlahApproval={jumlahApproval}>{children}</DashboardLayout>
}
