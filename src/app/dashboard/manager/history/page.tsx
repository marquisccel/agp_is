import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ManagerHistoryClient from "@/components/features/ManagerHistoryClient"
import PageHeader from "@/components/ui/PageHeader"

export default async function ManagerHistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  // Fetch all purchases globally with relevant relations
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: true,
      staff: true,
      warehouse: true,
      items: true
    }
  })

  // Fetch all warehouses for filtering
  const warehouses = await prisma.warehouse.findMany({
    select: {
      id: true,
      nama: true
    },
    orderBy: {
      nama: "asc"
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
        eyebrow="Transaction ledger"
        title="Daftar Transaksi"
        description="Pantau dan filter seluruh transaksi pembelian PET di semua Collection Center dengan status yang mudah dipindai."
      />

      <ManagerHistoryClient 
        initialPurchases={formattedPurchases as any} 
        warehouses={warehouses} 
      />
    </div>
  )
}
