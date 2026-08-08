import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import ManagerPurchaseDetailClient from "@/components/features/ManagerPurchaseDetailClient"

export default async function ManagerPurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const { id } = await params

  // Fetch purchase details
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      returs: true,
      staff: true,
      admin: true,
      manager: true,
      warehouse: true,
    }
  })

  if (!purchase) {
    return notFound()
  }

  // Fetch audit logs for this transaction
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      record_id: purchase.id
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  // Fetch SKU standard prices for the CC to show price standard limits if needed
  const warehouseSkuPrices = await prisma.skuPriceStandard.findMany({
    where: {
      warehouseId: purchase.warehouseId
    }
  })

  // Serialize date objects for client component
  const serializedPurchase = {
    ...purchase,
    tanggal: purchase.tanggal.toISOString(),
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    approvedAt: purchase.approvedAt?.toISOString() ?? null,
    tanggal_transfer: purchase.tanggal_transfer?.toISOString() ?? null,
  }

  const serializedAuditLogs = auditLogs.map(log => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    user: {
      nama: log.user.nama,
      role: log.user.role,
      email: log.user.email
    }
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <ManagerPurchaseDetailClient
        purchase={serializedPurchase}
        auditLogs={serializedAuditLogs}
        skuPrices={warehouseSkuPrices}
      />
    </div>
  )
}
