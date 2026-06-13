import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import MasterDataClient from "@/components/features/MasterDataClient"

export default async function MasterDataPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  // ── Warehouses ──
  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })

  // ── Suppliers with purchase stats ──
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
          items: { select: { berat_final_item: true } }
        }
      }
    },
    orderBy: { nama: "asc" }
  })

  // ── Transaction summary per supplier ──
  const suppliersWithStats = suppliers.map(s => {
    const completedPurchases = s.purchases.filter(p =>
      ["approved", "sudah_transfer"].includes(p.status_approval)
    )
    const totalTransaksi = s.purchases.length
    const totalSelesai = completedPurchases.length
    const totalNilai = completedPurchases.reduce((sum, p) =>
      sum + (p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0), 0
    )
    const totalKg = completedPurchases.reduce((sum, p) =>
      sum + p.items.reduce((s2, i) => s2 + (i.berat_final_item || 0), 0), 0
    )
    const lastPurchase = s.purchases.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]?.createdAt ?? null

    return {
      id: s.id,
      nama: s.nama,
      kontak_wa: s.kontak_wa,
      target_bulanan_kg: s.target_bulanan_kg,
      warehouseId: s.warehouseId,
      warehouse: s.warehouse,
      totalTransaksi,
      totalSelesai,
      totalNilai,
      totalKg,
      lastPurchase: lastPurchase ? new Date(lastPurchase).toISOString() : null
    }
  })

  // ── Global stats ──
  const totalPurchases = await prisma.purchase.count()
  const totalCompleted = await prisma.purchase.count({ where: { status_approval: "sudah_transfer" } })
  const totalNilaiAll = await prisma.purchase.aggregate({
    _sum: { total_dibayar: true },
    where: { status_approval: { in: ["approved", "sudah_transfer"] } }
  })
  const totalKgAll = await prisma.purchaseItem.aggregate({
    _sum: { berat_final_item: true },
    where: {
      purchase: { status_approval: { in: ["approved", "sudah_transfer"] } }
    }
  })

  // ── Users (staff & admin) ──
  const users = await prisma.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN", "SUPERVISOR"] } },
    select: {
      id: true, nama: true, email: true, role: true,
      warehouseId: true,
      warehouse: { select: { id: true, nama: true } }
    },
    orderBy: [{ role: "asc" }, { nama: "asc" }]
  })

  // ── SKU Price Standards ──
  const skuPrices = await prisma.skuPriceStandard.findMany({
    include: { warehouse: { select: { id: true, nama: true } } },
    orderBy: [{ warehouse: { nama: "asc" } }, { sku_name: "asc" }]
  })

  return (
    <MasterDataClient
      warehouses={warehouses}
      suppliers={suppliersWithStats}
      users={users as any}
      skuPrices={skuPrices as any}
      globalStats={{
        totalPurchases,
        totalCompleted,
        totalNilai: totalNilaiAll._sum.total_dibayar ?? 0,
        totalKg: totalKgAll._sum.berat_final_item ?? 0,
        totalSuppliers: suppliers.length,
        totalWarehouses: warehouses.length
      }}
    />
  )
}
