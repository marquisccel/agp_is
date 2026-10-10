import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import EditTransaksiForm from "@/components/features/EditTransaksiForm"
import PageHeader from "@/components/ui/PageHeader"
import TombolKembali from "@/components/ui/TombolKembali"

export default async function EditTransaksiPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
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

  if (!purchase) return notFound()

  // Admin memeriksa-silang SEMUA gudang sejak arahan Manager 30 Sep 2026,
  // jadi tidak ada lagi pengecekan warehouseId Admin di sini -- lihat
  // lib/roles.ts. Daftar supplier mengikuti gudang TRANSAKSI ini, bukan
  // gudang Admin (yang sekarang tidak lagi berarti satu gudang tertentu).
  const suppliers = await prisma.supplier.findMany({
    where: { warehouseId: purchase.warehouseId },
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
      <TombolKembali href="/dashboard/admin/history" />
      <PageHeader
        eyebrow="Koreksi transaksi"
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
      />

      <EditTransaksiForm purchase={purchaseSerialized} suppliers={suppliers} />
    </div>
  )
}
