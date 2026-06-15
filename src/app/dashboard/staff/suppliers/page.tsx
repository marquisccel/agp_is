import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

export default async function StaffSuppliersPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) redirect("/login")

  const warehouseId = session.user.warehouseId

  const suppliers = warehouseId
    ? await prisma.supplier.findMany({
        where: { warehouseId },
        orderBy: { nama: "asc" },
      })
    : []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Supplier directory"
        title="Data Supplier"
        description="Daftar supplier gudang Anda. Gunakan edit untuk memperbarui kontak, rekening, target, dan jadwal ambilan."
        actions={(
          <Link
            href="/dashboard/staff/suppliers/new"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-950 shadow-sm hover:bg-slate-800 transition-colors"
          >
            Tambah Supplier
          </Link>
        )}
      />

      {suppliers.length === 0 ? (
        <div className="interactive-surface bg-white rounded-lg border border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">Belum ada supplier terdaftar.</p>
          <Link
            href="/dashboard/staff/suppliers/new"
            className="mt-4 inline-block text-teal-700 text-sm font-semibold hover:underline"
          >
            Tambah supplier pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => {
            const bankInfo = [supplier.nama_bank, supplier.nomor_rekening].filter(Boolean).join(" - ")
            const pickupDays = supplier.hari_ambilan?.split(",").join(", ")

            return (
              <div
                key={supplier.id}
                className="interactive-surface bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{supplier.nama}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {supplier.kontak_wa && (
                      <span className="text-xs text-slate-500">WA {supplier.kontak_wa}</span>
                    )}
                    {bankInfo && (
                      <span className="text-xs text-slate-500">{bankInfo}</span>
                    )}
                    {supplier.target_bulanan_kg > 0 && (
                      <span className="text-xs text-teal-700 font-medium">
                        {supplier.target_bulanan_kg.toLocaleString("id-ID")} kg/bulan
                      </span>
                    )}
                    {pickupDays && (
                      <span className="text-xs text-slate-500">{pickupDays}</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/staff/suppliers/${supplier.id}/edit`}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
                >
                  Edit
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
