import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import DoubleCheckForm from "@/components/features/DoubleCheckForm"
import { PENDING_SUPERVISOR_STATUSES } from "@/lib/purchaseStatus"

export default async function SupervisorCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPERVISOR") {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  const { id } = await params
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      staff: true,
    },
  })

  if (!purchase || !PENDING_SUPERVISOR_STATUSES.includes(purchase.status_approval) || purchase.warehouseId !== warehouseId) {
    return notFound()
  }

  const dps = await prisma.downPayment.aggregate({
    where: { supplierId: purchase.supplierId, status_approval: "approved" },
    _sum: { sisa_dp: true },
  })
  const availableDp = dps._sum.sisa_dp || 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Verifikasi Penerimaan</h2>
          <p className="text-slate-500 text-sm mt-1">Nomor Draft: {purchase.id.split("-")[0]} - Supplier: <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span></p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700">
          Staff: {purchase.staff.nama}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <DoubleCheckForm purchase={purchase} availableDp={availableDp} successRedirect="/dashboard/supervisor" />
      </div>
    </div>
  )
}
