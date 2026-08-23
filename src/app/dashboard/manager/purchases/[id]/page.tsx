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

  // Riwayat perubahan nota tidak lagi ditampilkan di halaman ini; jejaknya
  // punya menu tersendiri (Audit Trail), jadi kuerinya ikut dilepas
  // ketimbang mengambil data yang tidak dipakai pada tiap kunjungan.

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

  return (
    <div className="max-w-5xl mx-auto">
      <ManagerPurchaseDetailClient
        purchase={serializedPurchase}
        skuPrices={warehouseSkuPrices}
      />
    </div>
  )
}
