import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import SupplierForm from "@/components/features/SupplierForm"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

export default async function NewSupplierPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) return null

  const staffWarehouseId = session.user.warehouseId
  if (!staffWarehouseId) return null

  // Only fetch the staff's own warehouse
  const warehouses = await prisma.warehouse.findMany({ where: { id: staffWarehouseId } })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Supplier registry"
        title="Tambah Data Supplier"
        description="Lengkapi profil lapak baru agar siap digunakan pada transaksi pembelian."
      />

      <div className="workflow-card p-6 md:p-8">
        <SupplierForm
          warehouses={warehouses}
          defaultWarehouseId={staffWarehouseId}
          lockedWarehouse={true}
        />
      </div>
    </div>
  )
}
