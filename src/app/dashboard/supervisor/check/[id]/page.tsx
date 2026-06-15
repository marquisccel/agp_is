import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import DoubleCheckForm from "@/components/features/DoubleCheckForm"
import { PENDING_SUPERVISOR_STATUSES } from "@/lib/purchaseStatus"
import PageHeader from "@/components/ui/PageHeader"

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
      <PageHeader
        eyebrow="Receiving control"
        title="Verifikasi Penerimaan"
        description={<>Draft {purchase.id.split("-")[0]} untuk <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span>.</>}
        actions={
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            Staff: {purchase.staff.nama}
          </span>
        }
      />

      <div className="workflow-card p-5 md:p-6">
        <DoubleCheckForm purchase={purchase} availableDp={availableDp} successRedirect="/dashboard/supervisor" />
      </div>
    </div>
  )
}
