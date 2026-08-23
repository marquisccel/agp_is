import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ManagerSkuPricesClient from "@/components/features/ManagerSkuPricesClient"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
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
      <PageHeader
        eyebrow="Standar harga"
        title="Pengaturan Standar Harga SKU"
        description="Atur harga batas atas per SKU untuk masing-masing Collection Center."
        actions={(
          <Link
            href="/dashboard/manager"
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            Kembali ke Dashboard
          </Link>
        )}
      />

      <ManagerSkuPricesClient warehouses={warehouses} allSkus={allSkus} />
    </div>
  )
}
