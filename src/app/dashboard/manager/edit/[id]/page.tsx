import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import EditTransaksiForm from "@/components/features/EditTransaksiForm"
import Link from "next/link"

export default async function ManagerEditTransaksiPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const { id } = await params

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      staff: true,
      warehouse: true,
    }
  })

  if (!purchase) return notFound()

  // Manager bisa edit semua gudang; fetch suppliers dari warehouse terkait
  const suppliers = await prisma.supplier.findMany({
    where: { warehouseId: purchase.warehouseId },
    orderBy: { nama: "asc" }
  })

  const purchaseSerialized = {
    ...purchase,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    approvedAt: purchase.approvedAt?.toISOString() ?? null,
    tanggal: purchase.tanggal.toISOString(),
    tanggal_transfer: purchase.tanggal_transfer?.toISOString() ?? null,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link href="/dashboard/manager/history" className="hover:text-cyan-600 transition-colors">
              Riwayat Transaksi
            </Link>
            <span>/</span>
            <span className="text-slate-600 font-semibold">Edit Transaksi</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Edit Transaksi</h2>
          <p className="text-slate-500 text-sm mt-1">
            Gudang: <span className="font-semibold text-slate-700">{(purchase as any).warehouse?.nama}</span>
            &nbsp;•&nbsp;
            Supplier: <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span>
            &nbsp;•&nbsp;
            Nota: <span className="font-mono text-slate-600">{purchase.nomor_nota || `#${purchase.id.split("-")[0]}`}</span>
            &nbsp;•&nbsp;
            Staff: <span className="font-semibold text-slate-600">{purchase.staff.nama}</span>
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-semibold">
          ⚠ Perubahan akan tercatat di audit log
        </div>
      </div>

      <EditTransaksiForm
        purchase={purchaseSerialized as any}
        suppliers={suppliers}
        backUrl="/dashboard/manager/history"
      />
    </div>
  )
}
