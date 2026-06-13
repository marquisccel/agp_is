import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import SupplierForm from "@/components/features/SupplierForm"

export default async function NewSupplierPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "STAFF") return null

  const staffWarehouseId = session.user.warehouseId
  if (!staffWarehouseId) return null

  // Only fetch the staff's own warehouse
  const warehouses = await prisma.warehouse.findMany({ where: { id: staffWarehouseId } })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Tambah Data Supplier</h2>
        <p className="text-slate-500 text-sm mt-1">Input data Master Supplier baru untuk gudang Anda.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <SupplierForm
          warehouses={warehouses}
          defaultWarehouseId={staffWarehouseId}
          lockedWarehouse={true}
        />
      </div>
    </div>
  )
}
