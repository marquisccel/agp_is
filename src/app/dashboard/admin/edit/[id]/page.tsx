import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import EditTransaksiForm from "@/components/features/EditTransaksiForm"
import PageHeader from "@/components/ui/PageHeader"

export default async function EditTransaksiPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const { id } = await params
  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
      staff: true,
    },
  })

  if (!purchase) return notFound()

  if (purchase.warehouseId !== warehouseId) {
    redirect("/dashboard/admin/history")
  }

  const suppliers = await prisma.supplier.findMany({
    where: { warehouseId },
    orderBy: { nama: "asc" },
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
      <PageHeader
        eyebrow="Transaction editor"
        title="Edit Transaksi"
        description={
          <>
            <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span>
            {" · "}
            <span className="font-mono text-slate-600">{purchase.nomor_nota || `#${purchase.id.split("-")[0]}`}</span>
            {" · "}
            <span className="font-semibold text-slate-600">{purchase.staff.nama}</span>
          </>
        }
        actions={
          <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            Audit log aktif
          </span>
        }
      />

      <EditTransaksiForm purchase={purchaseSerialized} suppliers={suppliers} />
    </div>
  )
}
