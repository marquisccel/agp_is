import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import MasterDataClient from "@/components/features/MasterDataClient"
import PageHeader from "@/components/ui/PageHeader"
import { hasResolvedSupplierCoordinates } from "@/lib/supplierLocation"

export default async function MasterDataPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })


  const suppliers = await prisma.supplier.findMany({
    include: {
      warehouse: { select: { id: true, nama: true } },
      purchases: {
        select: {
          id: true,
          status_approval: true,
          total_dibayar: true,
          total_nilai_setelah_retur: true,
          total_nilai_sebelum_retur: true,
          createdAt: true,
          items: { select: { berat_final_item: true } },
        },
      },
    },
    orderBy: { nama: "asc" },
  })

  const suppliersWithStats = suppliers.map((supplier) => {
    const completedPurchases = supplier.purchases.filter((purchase) =>
      ["approved", "sudah_transfer"].includes(purchase.status_approval)
    )
    const totalTransaksi = supplier.purchases.length
    const totalSelesai = completedPurchases.length
    const totalNilai = completedPurchases.reduce(
      (sum, purchase) => sum + (purchase.total_dibayar ?? purchase.total_nilai_setelah_retur ?? purchase.total_nilai_sebelum_retur ?? 0),
      0
    )
    const totalKg = completedPurchases.reduce(
      (sum, purchase) => sum + purchase.items.reduce((itemSum, item) => itemSum + (item.berat_final_item || 0), 0),
      0
    )
    const lastPurchase =
      supplier.purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt ?? null

    return {
      id: supplier.id,
      nama: supplier.nama,
      kontak_wa: supplier.kontak_wa,
      link: supplier.link,
      latitude: supplier.latitude,
      longitude: supplier.longitude,
      transactionStatus: supplier.transactionStatus,
      target_bulanan_kg: supplier.target_bulanan_kg,
      warehouseId: supplier.warehouseId,
      warehouse: supplier.warehouse,
      totalTransaksi,
      totalSelesai,
      totalNilai,
      totalKg,
      lastPurchase: lastPurchase ? new Date(lastPurchase).toISOString() : null,
    }
  })

  const totalPurchases = await prisma.purchase.count()
  const totalCompleted = await prisma.purchase.count({ where: { status_approval: "sudah_transfer" } })
  const totalNilaiAll = await prisma.purchase.aggregate({
    _sum: { total_dibayar: true },
    where: { status_approval: { in: ["approved", "sudah_transfer"] } },
  })
  const totalKgAll = await prisma.purchaseItem.aggregate({
    _sum: { berat_final_item: true },
    where: {
      purchase: { status_approval: { in: ["approved", "sudah_transfer"] } },
    },
  })

  // Akun MANAGER ikut ditampilkan. Sebelumnya hanya STAFF dan ADMIN, dan
  // akibatnya akun Manager bawaan yang tidak terpakai tidak terlihat sama
  // sekali -- tidak bisa dinonaktifkan maupun dihapus, karena tidak pernah
  // muncul di daftar. Perlindungan agar Manager tidak mengunci dirinya
  // sendiri ada di sisi server, bukan dengan menyembunyikannya di sini.
  const users = await prisma.user.findMany({
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      aktif: true,
      warehouseId: true,
      warehouse: { select: { id: true, nama: true } },
    },
    // Nonaktif ditaruh di bawah supaya daftar teratas selalu orang yang
    // benar-benar masih bekerja.
    orderBy: [{ aktif: "desc" }, { role: "asc" }, { nama: "asc" }],
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tata kelola data"
        title="Master Data"
        description="Ringkasan performa seluruh gudang dan pengelolaan akun operasional."
      />
      <MasterDataClient
        warehouses={warehouses}
        suppliers={suppliersWithStats}
        users={users}
        globalStats={{
          totalPurchases,
          totalCompleted,
          totalNilai: totalNilaiAll._sum.total_dibayar ?? 0,
          totalKg: totalKgAll._sum.berat_final_item ?? 0,
          totalSuppliers: suppliers.length,
          totalWarehouses: warehouses.length,
          totalGreenSuppliers: suppliers.filter((supplier) => supplier.transactionStatus === "GREEN").length,
          totalRedSuppliers: suppliers.filter((supplier) => supplier.transactionStatus === "RED").length,
          totalMapReadySuppliers: suppliers.filter((supplier) => hasResolvedSupplierCoordinates(supplier)).length,
        }}
      />
    </div>
  )
}
