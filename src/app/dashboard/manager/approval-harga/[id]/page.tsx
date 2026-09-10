import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ApprovalHargaForm from "@/components/features/ApprovalHargaForm"
import PageHeader from "@/components/ui/PageHeader"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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
      {/* Jalan kembali. Halaman ini satu-satunya di alur Manager yang
          tidak punya jalan kembali selain tombol Back peramban, jadi
          tautannya tetap perlu ada. Bentuknya ringkas di pojok atas, bukan
          tombol selebar kartu di bawah judul yang di ponsel mendorong
          rincian SKU jauh ke bawah. */}
      <Link
        href="/dashboard/manager/approval-harga"
        className="-mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] pr-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali
      </Link>
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
