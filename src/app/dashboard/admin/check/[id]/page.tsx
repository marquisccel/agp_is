import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import DoubleCheckForm from "@/components/features/DoubleCheckForm"
import { PENDING_VERIFICATION_STATUSES } from "@/lib/purchaseStatus"
import PageHeader from "@/components/ui/PageHeader"

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
      staff: true,
    },
  })

  if (!purchase || !PENDING_VERIFICATION_STATUSES.includes(purchase.status_approval)) {
    return notFound()
  }

  // Halaman ini tidak pernah memeriksa gudangnya. API double-check
  // menolak nota gudang lain saat disimpan, jadi tidak ada nota yang bisa
  // diubah lintas gudang -- tapi isinya tetap TERBACA: nama lapak, nama
  // staff, SKU, berat, dan harga per kg gudang lain, cukup dengan menebak
  // id di URL. Jalur editnya sudah memeriksa ini sejak dulu; jalur ini
  // terlewat.
  if (purchase.warehouseId !== session.user.warehouseId) {
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
        eyebrow="Verifikasi penerimaan"
        title="Double Check Transaksi"
        description={<>Draft {purchase.id.split("-")[0]} untuk <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span>.</>}
        actions={
          <span
            className="rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-bold"
            style={{ borderColor: "var(--border)", background: "var(--bg-tint)", color: "var(--muted)" }}
          >
            Staff: {purchase.staff.nama}
          </span>
        }
      />

      <div className="section section-body">
        <DoubleCheckForm purchase={purchase} availableDp={availableDp} />
      </div>
    </div>
  )
}
