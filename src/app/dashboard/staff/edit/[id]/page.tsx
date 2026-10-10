import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import EditTransaksiForm from "@/components/features/EditTransaksiForm"
import PageHeader from "@/components/ui/PageHeader"
import TombolKembali from "@/components/ui/TombolKembali"

// Staff membetulkan notanya sendiri (salah ketik) selama belum ditransfer.
const STATUS_BISA_EDIT = ["menunggu_verifikasi", "menunggu_approval_harga", "approved"]

/**
 * Staff membetulkan nota buatannya sendiri.
 *
 * Semua status yang boleh diedit memakai SATU form koreksi (sama seperti
 * Admin, tanpa kartu Potongan, lapak, dan nomor nota) -- arahan Manager
 * 10 Okt 2026. Dulu nota draft punya form sendiri yang berbeda dari dua
 * status lainnya, dan Staff harus belajar dua tampilan untuk pekerjaan yang
 * sama.
 *
 * Penjagaannya dua lapis: di sini nota yang bukan milik Staff tidak dibuka,
 * dan rute API-nya memeriksa hal yang sama.
 */
export default async function EditNotaStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "STAFF") redirect("/login")

  const { id } = await params
  const warehouseId = session.user.warehouseId
  if (!warehouseId) redirect("/dashboard/staff")

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true, supplier: true },
  })
  if (!purchase || purchase.userIdStaff !== session.user.id || purchase.warehouseId !== warehouseId) {
    return notFound()
  }

  if (!STATUS_BISA_EDIT.includes(purchase.status_approval)) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Edit nota"
          title="Nota tidak dapat diedit"
          description="Nota ini sudah ditransfer atau dibatalkan. Jika ada yang perlu dibetulkan, hubungi Admin atau Manager."
        />
        <Link href="/dashboard/staff/history" className="btn-netral inline-flex rounded-[var(--radius-sm)] px-4 py-2 text-sm font-bold">
          Kembali ke riwayat
        </Link>
      </div>
    )
  }

  const suppliers = await prisma.supplier.findMany({ where: { warehouseId }, orderBy: { nama: "asc" } })
  const purchaseSerialized = {
    ...purchase,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    approvedAt: purchase.approvedAt?.toISOString() ?? null,
    tanggal: purchase.tanggal.toISOString(),
    tanggal_transfer: purchase.tanggal_transfer?.toISOString() ?? null,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TombolKembali href="/dashboard/staff/history" />
      <PageHeader
        eyebrow="Koreksi transaksi"
        title="Edit Transaksi"
        description={
          <>
            <span className="font-semibold text-slate-700">{purchase.supplier.nama}</span>
            {" · "}
            <span className="font-mono text-slate-600">{purchase.nomor_nota || `#${purchase.id.split("-")[0]}`}</span>
          </>
        }
      />
      <EditTransaksiForm
        purchase={purchaseSerialized}
        suppliers={suppliers}
        backUrl="/dashboard/staff/history"
        sebagaiStaff
      />
    </div>
  )
}
