import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import PurchaseForm from "@/components/features/PurchaseForm"
import PageHeader from "@/components/ui/PageHeader"
import { namaGudang } from "@/lib/namaGudang"

/**
 * Staff membetulkan nota draft buatannya sendiri (salah ketik).
 *
 * Halaman ini memakai PurchaseForm yang sama dengan pembuatan nota, supaya
 * isian dan hitungannya tidak punya dua versi. Penjagaannya dua lapis:
 * di sini nota yang bukan milik Staff atau sudah lewat tahap draft tidak
 * dibuka, dan rute API-nya memeriksa hal yang sama.
 */
export default async function EditNotaStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "STAFF") redirect("/login")

  const { id } = await params
  const warehouseId = session.user.warehouseId
  if (!warehouseId) redirect("/dashboard/staff")

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true, supplier: true, warehouse: true },
  })
  if (!purchase || purchase.userIdStaff !== session.user.id || purchase.warehouseId !== warehouseId) {
    return notFound()
  }

  if (purchase.status_approval !== "menunggu_verifikasi") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Edit nota"
          title="Nota tidak dapat diedit"
          description="Nota ini sudah diverifikasi gudang. Jika ada yang perlu dibetulkan, hubungi Admin atau Manager."
        />
        <Link href="/dashboard/staff/history" className="btn-netral inline-flex rounded-[var(--radius-sm)] px-4 py-2 text-sm font-bold">
          Kembali ke riwayat
        </Link>
      </div>
    )
  }

  const [suppliers, standarHarga] = await Promise.all([
    prisma.supplier.findMany({ where: { warehouseId }, orderBy: { nama: "asc" } }),
    prisma.skuPriceStandard.findMany({
      where: { warehouseId },
      select: { sku_name: true, max_price_per_kg: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Edit nota"
        title="Edit Nota Draft"
        description={`${purchase.supplier.nama} · setiap perubahan tercatat di audit trail Manager.`}
      />
      <div className="section">
        <div className="section-body">
          <PurchaseForm
            suppliers={suppliers}
            namaGudang={namaGudang(purchase.warehouse.nama)}
            standarHarga={standarHarga}
            edit={{
              id: purchase.id,
              supplierId: purchase.supplierId,
              metodeBayar: purchase.metode_pembayaran_terpilih ?? "TIMBANGAN_GUDANG",
              jenisPengambilan: purchase.jenis_pengambilan ?? "AMBIL",
              dpAwal: purchase.dp_yang_digunakan ?? 0,
              nomorDraft: purchase.id.slice(0, 8).toUpperCase(),
              tanggal: purchase.createdAt.toISOString(),
              items: purchase.items.map((i) => ({
                sku_name: i.sku_name,
                spec: i.spec ?? "",
                berat_estimasi: i.berat_lapak ?? 0,
                harga_per_kg: i.harga_per_kg ?? 0,
              })),
              potongan: {
                sampah: { berat: purchase.berat_potongan_sampah ?? 0, harga: purchase.harga_potongan_sampah ?? 0 },
                susut: { berat: purchase.berat_potongan_susut ?? 0, harga: purchase.harga_potongan_susut ?? 0 },
                air: { berat: purchase.berat_potongan_air ?? 0, harga: purchase.harga_potongan_air ?? 0 },
                karung: { berat: purchase.berat_potongan_karung ?? 0, harga: purchase.harga_potongan_karung ?? 0 },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
