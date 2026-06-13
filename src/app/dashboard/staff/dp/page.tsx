import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function DPListStaff() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "STAFF") return null

  const warehouseId = session.user.warehouseId
  if (!warehouseId) return null

  // Fetch only DPs for suppliers belonging to the staff's warehouse
  const dps = await prisma.downPayment.findMany({
    where: {
      supplier: {
        warehouseId
      }
    },
    orderBy: { tanggal_permintaan: "desc" },
    include: { supplier: true, approvedBy: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Pengajuan Kasbon (DP)</h2>
          <p className="text-slate-500 text-sm mt-1">Kelola dan pantau status pengajuan kasbon supplier Anda.</p>
        </div>
        <Link href="/dashboard/staff/dp/new">
          <button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all">
            + Pengajuan Kasbon Baru
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Tanggal Pengajuan</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Nominal Diajukan</th>
                <th className="px-6 py-4">Sisa DP</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Belum ada riwayat pengajuan kasbon untuk supplier di gudang Anda.
                  </td>
                </tr>
              ) : (
                dps.map((dp) => (
                  <tr key={dp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(dp.tanggal_permintaan).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {dp.supplier.nama}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      Rp {dp.nominal_diajukan.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">
                      {dp.status_approval === 'approved' ? `Rp ${(dp.sisa_dp || 0).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {dp.status_approval === "approved" && <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">Disetujui</span>}
                      {dp.status_approval === "rejected" && <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-xs font-bold border border-red-200">Ditolak</span>}
                      {dp.status_approval === "menunggu_approval_manager" && <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-md text-xs font-bold border border-orange-200">Menunggu Manager</span>}
                      {dp.status_approval === "menunggu_approval_admin" && <span className="bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-md text-xs font-bold border border-yellow-200">Review Admin</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
