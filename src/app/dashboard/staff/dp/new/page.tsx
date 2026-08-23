import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import DPRequestForm from "@/components/features/DPRequestForm"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

export default async function StaffNewDPRequestPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) return null

  const warehouseId = session.user.warehouseId
  if (!warehouseId) return null

  // Fetch only suppliers that belong to this staff's warehouse
  const suppliers = await prisma.supplier.findMany({
    where: {
      warehouseId
    },
    orderBy: { nama: "asc" }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Pengajuan kasbon"
        title="Pengajuan Kasbon Baru"
        description="Ajukan kasbon supplier untuk gudang Anda dengan alur validasi yang rapi."
      />

      <div className="section section-body">
        <DPRequestForm suppliers={suppliers} role={session.user.role} />
      </div>
    </div>
  )
}
