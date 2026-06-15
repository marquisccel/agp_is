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

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  // Fetch all purchases for the admin's warehouse
  const purchases = await prisma.purchase.findMany({
    where: { warehouseId },
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      staff: true,
      items: true
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
        eyebrow="Transaction archive"
        title="Riwayat & Daftar Transaksi"
        description="Daftar lengkap seluruh transaksi pembelian PET di Collection Center Anda."
      />

      <AdminHistoryClient initialPurchases={formattedPurchases as any} />
    </div>
  )
}
