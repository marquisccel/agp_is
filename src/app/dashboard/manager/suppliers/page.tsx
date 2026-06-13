import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import ManagerSuppliersClient from "@/components/features/ManagerSuppliersClient"
import { redirect } from "next/navigation"

export default async function ManagerSuppliersPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  // Fetch all warehouses ordered by name
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { nama: "asc" }
  })

  // Fetch all SKU price standards
  const skuPrices = await prisma.skuPriceStandard.findMany()

  // Fetch all suppliers including warehouse and their completed/approved purchases
  const suppliers = await prisma.supplier.findMany({
    include: {
      warehouse: true,
      purchases: {
        where: {
          status_approval: { in: ["approved", "sudah_transfer"] }
        },
        include: {
          items: true
        }
      }
    },
    orderBy: { nama: "asc" }
  })

  // Serialize Date objects to ISO strings for Safe Next.js serialization
  const serializedSuppliers = suppliers.map(s => ({
    ...s,
    purchases: s.purchases.map(p => ({
      ...p,
      tanggal: p.tanggal.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      approvedAt: p.approvedAt?.toISOString() ?? null,
      tanggal_transfer: p.tanggal_transfer?.toISOString() ?? null,
    }))
  }))

  return (
    <div className="max-w-7xl mx-auto">
      <ManagerSuppliersClient
        suppliers={serializedSuppliers as any}
        warehouses={warehouses}
        skuPrices={skuPrices}
      />
    </div>
  )
}

