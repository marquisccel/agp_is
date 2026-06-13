import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { isOperationalRole } from "@/lib/roles"

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Supplier</h2>
          <p className="text-slate-500 text-sm mt-1">
            Daftar supplier gudang Anda. Klik <strong>Edit</strong> untuk memperbarui data.
          </p>
        </div>
        <Link
          href="/dashboard/staff/suppliers/new"
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
        >
          + Tambah Baru
        </Link>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">Belum ada supplier terdaftar.</p>
          <Link
            href="/dashboard/staff/suppliers/new"
            className="mt-4 inline-block text-cyan-600 text-sm font-semibold hover:underline"
          >
            + Tambah supplier pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{s.nama}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {s.kontak_wa && (
                    <span className="text-xs text-slate-500">📱 {s.kontak_wa}</span>
                  )}
                  {s.nama_bank && (
                    <span className="text-xs text-slate-500">🏦 {s.nama_bank} {s.nomor_rekening ? `· ${s.nomor_rekening}` : ""}</span>
                  )}
                  {s.target_bulanan_kg > 0 && (
                    <span className="text-xs text-cyan-600 font-medium">🎯 {s.target_bulanan_kg.toLocaleString("id-ID")} kg/bulan</span>
                  )}
                  {s.hari_ambilan && (
                    <span className="text-xs text-slate-500">📅 {s.hari_ambilan.split(",").join(", ")}</span>
                  )}
                </div>
              </div>
              <Link
                href={`/dashboard/staff/suppliers/${s.id}/edit`}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors"
              >
                ✏ Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
