import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AdminHistoryClient from "@/components/features/AdminHistoryClient"
import PageHeader from "@/components/ui/PageHeader"

export default async function AdminHistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  // Admin memeriksa-silang SEMUA gudang (arahan Manager, 30 Sep 2026),
  // jadi tidak ada lagi filter warehouseId -- lihat lib/roles.ts.
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      staff: true,
      items: true,
      warehouse: { select: { id: true, nama: true } }
    }
  })

  // Format to plain objects to avoid serialization warnings in App Router
  const formattedPurchases = purchases.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
    tanggal_transfer: p.tanggal_transfer ? p.tanggal_transfer.toISOString() : null,
    tanggal: p.tanggal.toISOString()
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Arsip transaksi"
        title="Daftar Transaksi"
        description="Daftar lengkap seluruh transaksi pembelian PET di semua gudang."
      />

      <AdminHistoryClient initialPurchases={formattedPurchases} />
    </div>
  )
}
