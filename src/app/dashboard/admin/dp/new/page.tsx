import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import DPRequestForm from "@/components/features/DPRequestForm"
import PageHeader from "@/components/ui/PageHeader"

export default async function NewDPRequestPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return null

  const warehouseId = session.user.warehouseId
  if (!warehouseId) return null

  const suppliers = await prisma.supplier.findMany({
    where: { warehouseId },
    orderBy: { nama: "asc" }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Cashflow request"
        title="Pengajuan Kasbon Baru"
        description="Ajukan kasbon supplier dengan data nominal dan catatan yang siap direview manager."
      />

      <div className="workflow-card p-6 md:p-8">
        <DPRequestForm suppliers={suppliers} role="ADMIN" />
      </div>
    </div>
  )
}
