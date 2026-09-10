import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ManagerSkuPricesClient from "@/components/features/ManagerSkuPricesClient"
import PageHeader from "@/components/ui/PageHeader"
import TombolKembali from "@/components/ui/TombolKembali"
import { SKU_LIST } from "@/lib/skuList"

export default async function SkuPricesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const warehouses = await prisma.warehouse.findMany({
    include: {
      skuPrices: true
    },
    orderBy: { nama: 'asc' }
  })

  // We have a predefined set of SKUs that are standard.
  const allSkus = [...SKU_LIST]

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <TombolKembali href="/dashboard/manager" label="Kembali ke Dashboard" />
      <PageHeader
        eyebrow="Standar harga"
        title="Pengaturan Standar Harga SKU"
        description="Atur standar harga per SKU untuk masing-masing gudang."
      />

      <ManagerSkuPricesClient warehouses={warehouses} allSkus={allSkus} />
    </div>
  )
}
