import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ApprovalHargaForm from "@/components/features/ApprovalHargaForm"
import PageHeader from "@/components/ui/PageHeader"

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
        include: { skuPrices: true },
      },
    },
  })

  if (!purchase || purchase.status_approval !== "menunggu_approval_harga") {
    return notFound()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Persetujuan harga"
        title="Review Harga Pembelian"
        description={
          <>
            <span className="font-semibold text-slate-700">{purchase.warehouse.nama}</span>
            {" · "}
            <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span>
          </>
        }
      />

      <div className="section section-body">
        <ApprovalHargaForm purchase={purchase} />
      </div>
    </div>
  )
}
