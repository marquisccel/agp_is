import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ManagerSkuPricesClient from "@/components/features/ManagerSkuPricesClient"
import Link from "next/link"

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
  const allSkus = ["Bening", "BM", "Mix", "Warna", "Tutup HD", "Kotor", "Grade B", "Bocil", "Grade C", "Saos Kecap", "Galon", "PK"]

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/manager" className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-xl border border-slate-200 shadow-sm transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pengaturan Standar Harga SKU</h2>
          <p className="text-sm text-slate-500 mt-1">Atur harga batas atas (maksimal) per SKU untuk masing-masing gudang.</p>
        </div>
      </div>

      <ManagerSkuPricesClient warehouses={warehouses} allSkus={allSkus} />
    </div>
  )
}
