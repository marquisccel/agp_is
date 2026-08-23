import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TargetSettingForm from "@/components/features/TargetSettingForm"
import Link from "next/link"
import { redirect } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"

export default async function ManagerTargetPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })
  const existingTargets = await prisma.warehouseTarget.findMany()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Rencana kinerja"
        title="Setting Target Gudang"
        description={(
          <>
            Tetapkan target pembelian bahan baku <span className="font-semibold" style={{ color: "var(--brand-strong)" }}>PET Final</span> per Collection Center.
          </>
        )}
        actions={(
          <Link
            href="/dashboard/manager"
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            Kembali ke Dashboard
          </Link>
        )}
      />

      <TargetSettingForm warehouses={warehouses} existingTargets={existingTargets} />
    </div>
  )
}
