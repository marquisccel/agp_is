import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AdminHistoryClient from "@/components/features/AdminHistoryClient"
import PageHeader from "@/components/ui/PageHeader"

export default async function SupervisorHistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPERVISOR") {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  const purchases = await prisma.purchase.findMany({
    where: { warehouseId },
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      staff: true,
      items: true,
    },
  })

  const formattedPurchases = purchases.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
    tanggal_transfer: p.tanggal_transfer ? p.tanggal_transfer.toISOString() : null,
    tanggal: p.tanggal.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Supervisor archive"
        title="Riwayat & Daftar Transaksi"
        description="Daftar lengkap transaksi pembelian PET di gudang supervisi Anda."
      />

      <AdminHistoryClient initialPurchases={formattedPurchases as any} basePath="/dashboard/supervisor" />
    </div>
  )
}
