import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import DPRequestForm from "@/components/features/DPRequestForm"

export default async function StaffNewDPRequestPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "STAFF") return null

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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pengajuan Kasbon Baru</h2>
        <p className="text-slate-500 text-sm mt-1">Isi formulir di bawah untuk mengajukan kasbon (DP) bagi Supplier di gudang Anda.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <DPRequestForm suppliers={suppliers} role="STAFF" />
      </div>
    </div>
  )
}
