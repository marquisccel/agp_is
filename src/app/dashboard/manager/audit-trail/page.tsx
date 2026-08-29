import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AuditTrailClient from "@/components/features/AuditTrailClient"
import PageHeader from "@/components/ui/PageHeader"

// Batas aman jumlah baris yang dimuat sekaligus -- cukup untuk skala tim
// internal saat ini (lihat PRD Bagian 12), tapi tetap dibatasi supaya
// halaman tidak memuat seluruh riwayat audit tanpa batas seiring waktu.
const MAX_ROWS = 1000

export default async function ManagerAuditTrailPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
  })

  const formattedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    table_name: log.table_name,
    record_id: log.record_id,
    old_data: log.old_data,
    new_data: log.new_data,
    createdAt: log.createdAt.toISOString(),
    user: log.user ? { nama: log.user.nama, role: log.user.role } : null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kepatuhan dan jejak"
        title="Audit Trail"
        description={`Siapa melakukan apa, kapan, dan pada data mana. Memuat ${MAX_ROWS} aktivitas terbaru dari seluruh gudang.`}
      />
      <AuditTrailClient logs={formattedLogs} />
    </div>
  )
}
