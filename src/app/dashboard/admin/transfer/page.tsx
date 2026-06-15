import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TransferList from "@/components/features/TransferList"
import { redirect } from "next/navigation"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

export default async function AdminTransferPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      warehouseId,
      status_approval: { in: ["approved", "sudah_transfer"] }
    },
    orderBy: { updatedAt: "desc" },
    include: { supplier: true, items: true }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payment control"
        title="Transfer Pembayaran"
        description="Upload dan pantau bukti transfer untuk transaksi yang sudah disetujui."
      />
      <TransferList purchases={purchases} />
    </div>
  )
}
