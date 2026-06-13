import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TargetSettingForm from "@/components/features/TargetSettingForm"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function ManagerTargetPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })
  const existingTargets = await prisma.warehouseTarget.findMany()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Setting Target Gudang</h2>
          <p className="text-slate-500 text-sm mt-1">
            Tetapkan target pembelian bahan baku <span className="text-cyan-600 font-semibold">PET Final</span> per Collection Center.
          </p>
        </div>
        <Link href="/dashboard/manager">
          <button className="flex-shrink-0 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap">
            ← Dashboard
          </button>
        </Link>
      </div>

      <TargetSettingForm warehouses={warehouses} existingTargets={existingTargets} />
    </div>
  )
}
