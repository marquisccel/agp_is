import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import DPRequestForm from "@/components/features/DPRequestForm"

export default async function NewDPRequestPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return null

  const suppliers = await prisma.supplier.findMany({
    orderBy: { nama: "asc" }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pengajuan Kasbon Baru</h2>
        <p className="text-slate-500 text-sm mt-1">Isi formulir di bawah untuk mengajukan kasbon (DP) bagi Supplier.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <DPRequestForm suppliers={suppliers} />
      </div>
    </div>
  )
}
