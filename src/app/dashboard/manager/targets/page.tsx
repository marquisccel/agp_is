import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TargetSettingForm from "@/components/features/TargetSettingForm"
import { redirect } from "next/navigation"

export default async function ManagerTargetPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })
  const existingTargets = await prisma.warehouseTarget.findMany({
    include: { updatedBy: { select: { nama: true } } },
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* PageHeader dirakit di dalam TargetSettingForm, bukan di sini.
          Pemilih bulan dan tahun perlu berdiri di kepala halaman bersama
          tombol kembali, sementara nilainya dipegang state komponen itu --
          kalau kepalanya tetap di sini, dibutuhkan kartu tersendiri hanya
          untuk menampung dua dropdown. Kartu itulah yang dibuang. */}
      <TargetSettingForm warehouses={warehouses} existingTargets={existingTargets} />
    </div>
  )
}
