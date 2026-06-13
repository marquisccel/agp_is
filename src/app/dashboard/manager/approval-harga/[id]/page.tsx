import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ApprovalHargaForm from "@/components/features/ApprovalHargaForm"

export default async function ApprovalHargaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") return null

  const resolvedParams = await params
  const purchase = await prisma.purchase.findUnique({
    where: { id: resolvedParams.id },
    include: {
      supplier: true,
      items: true,
      staff: true,
      admin: true,
      warehouse: {
        include: { skuPrices: true }
      }
    }
  })

  if (!purchase || purchase.status_approval !== "menunggu_approval_harga") {
    return notFound()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Review Harga Pembelian</h2>
          <p className="text-slate-500 text-sm mt-1">Gudang: <span className="font-semibold text-slate-700">{purchase.warehouse.nama}</span> • Supplier: <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span></p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <ApprovalHargaForm purchase={purchase} />
      </div>
    </div>
  )
}
