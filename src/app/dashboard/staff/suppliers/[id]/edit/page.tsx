import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import SupplierForm from "@/components/features/SupplierForm"
import Link from "next/link"
import { isOperationalRole } from "@/lib/roles"

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
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/staff/suppliers"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          title="Kembali"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Edit Supplier</h2>
          <p className="text-slate-500 text-sm mt-0.5">Perbarui data <strong>{supplier.nama}</strong></p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
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
