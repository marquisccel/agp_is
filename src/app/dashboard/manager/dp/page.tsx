import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import DpSummaryAnalytics from "@/components/features/DpSummaryAnalytics"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"

export default async function ManagerDpPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  // Fetch data
  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })
  const approvedDps = await prisma.downPayment.findMany({
    where: {
      status_approval: "approved"
    },
    include: {
      supplier: {
        include: {
          warehouse: true
        }
      }
    }
  })

  // Aggregate DP data
  const dpSummaryMap: Record<string, {
    supplierId: string
    namaLapak: string
    warehouseId: string
    warehouseName: string
    totalDp: number
    totalUsed: number
    sisaDp: number
    transaksiDp: number
  }> = {}

  for (const dp of approvedDps) {
    if (!dp.supplier) continue
    const sid = dp.supplierId
    const wId = dp.supplier.warehouseId || "none"
    const wName = dp.supplier.warehouse?.nama || "-"
    
    if (!dpSummaryMap[sid]) {
      dpSummaryMap[sid] = {
        supplierId: sid,
        namaLapak: dp.supplier.nama,
        warehouseId: wId,
        warehouseName: wName,
        totalDp: 0,
        totalUsed: 0,
        sisaDp: 0,
        transaksiDp: 0
      }
    }
    const entry = dpSummaryMap[sid]
    entry.totalDp += dp.nominal_disetujui || 0
    entry.totalUsed += dp.dp_used_amount || 0
    entry.sisaDp += dp.sisa_dp || 0
    entry.transaksiDp += 1
  }

  const dpSummaryData = Object.values(dpSummaryMap).sort((a, b) => b.sisaDp - a.sisaDp)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kendali kasbon"
        title="Rekap Saldo Uang Muka (DP) & Kasbon"
        description="Pantau dan analisis detail pemakaian serta sisa saldo dana kasbon supplier."
        actions={(
          <Link
            href="/dashboard/manager"
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        )}
      />

      <DpSummaryAnalytics
        dpData={dpSummaryData}
        warehouseNames={warehouses.map(w => ({ id: w.id, nama: w.nama }))}
      />
    </div>
  )
}
