import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import PurchaseForm from "@/components/features/PurchaseForm"
import EditTransaksiForm from "@/components/features/EditTransaksiForm"
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

  // Nota yang sudah lewat draft (menunggu approval harga / disetujui)
  // dibetulkan lewat form koreksi seperti Admin, tanpa kartu Potongan,
  // lapak, dan nomor nota -- arahan Manager 10 Okt 2026.
  if (["menunggu_approval_harga", "approved"].includes(purchase.status_approval)) {
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

  if (purchase.status_approval !== "menunggu_verifikasi") {
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
