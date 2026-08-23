import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import SupplierForm from "@/components/features/SupplierForm"
import Link from "next/link"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) redirect("/login")

  const { id } = await params
  const warehouseId = session.user.warehouseId
  if (!warehouseId) redirect("/login")

  const supplier = await prisma.supplier.findUnique({ where: { id } })

  // Pastikan supplier milik gudang staff ini
  if (!supplier || supplier.warehouseId !== warehouseId) notFound()

  const warehouses = await prisma.warehouse.findMany({ where: { id: warehouseId } })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Data lapak"
        title="Edit Lapak"
        description={<>Perbarui data <span className="font-semibold text-slate-700">{supplier.nama}</span>.</>}
        actions={
          <Link href="/dashboard/staff/suppliers" className="btn-netral premium-button px-4 py-2 text-sm">
            Kembali
          </Link>
        }
      />

      <div className="section section-body">
        <SupplierForm
          warehouses={warehouses}
          defaultWarehouseId={warehouseId}
          lockedWarehouse={true}
          supplierId={id}
          initialData={supplier}
        />
      </div>
    </div>
  )
}
