import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ApprovalHargaForm from "@/components/features/ApprovalHargaForm"
import PageHeader from "@/components/ui/PageHeader"
import Link from "next/link"

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
        actions={(
          /* Halaman ini satu-satunya di alur Manager yang tidak punya jalan
             kembali. Setelah menyetujui atau menolak, memang ada pengalihan
             otomatis -- tapi kalau membukanya lalu memutuskan menunda,
             satu-satunya jalan keluar adalah tombol Back peramban. */
          <Link href="/dashboard/manager/approval-harga" className="btn-netral premium-button px-4 py-2.5 text-sm">
            Kembali ke Approval Harga
          </Link>
        )}
      />

      <div className="section section-body">
        <ApprovalHargaForm purchase={purchase} />
      </div>
    </div>
  )
}
