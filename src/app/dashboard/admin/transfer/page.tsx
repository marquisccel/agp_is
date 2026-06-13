import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TransferList from "@/components/features/TransferList"
import { redirect } from "next/navigation"

export default async function AdminTransferPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Status Transfer Pembayaran</h2>
        <p className="text-slate-500 text-sm mt-1">Upload bukti transfer untuk transaksi yang sudah disetujui.</p>
      </div>
      <TransferList purchases={purchases} />
    </div>
  )
}
