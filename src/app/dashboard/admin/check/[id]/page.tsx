import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import DoubleCheckForm from "@/components/features/DoubleCheckForm"

export default async function DoubleCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const resolvedParams = await params
  const purchase = await prisma.purchase.findUnique({
    where: { id: resolvedParams.id },
    include: {
      supplier: true,
      items: true,
      staff: true
    }
  })

  if (!purchase || purchase.status_approval !== "menunggu_double_cek") {
    return notFound()
  }

  // Calculate available DP for this supplier
  const dps = await prisma.downPayment.aggregate({
    where: { supplierId: purchase.supplierId, status_approval: "approved" },
    _sum: { sisa_dp: true }
  })
  const availableDp = dps._sum.sisa_dp || 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Double Check Transaksi</h2>
          <p className="text-slate-500 text-sm mt-1">Nomor Draft: {purchase.id.split("-")[0]} • Supplier: <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span></p>
        </div>
        <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">
          Staff: {purchase.staff.nama}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <DoubleCheckForm purchase={purchase} availableDp={availableDp} />
      </div>
    </div>
  )
}
