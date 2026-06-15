import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import DPApprovalActions from "@/components/features/DPApprovalActions"
import { redirect } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"

export default async function DPListAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  // Fetch DPs for suppliers belonging to the admin's warehouse
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
      <PageHeader
        eyebrow="Cash advance control"
        title="Manajemen Kasbon (DP)"
        description="Review dan kelola pengajuan kasbon supplier dari staff gudang."
      />

      <div className="interactive-surface bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Tanggal Pengajuan</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Nominal Diajukan</th>
                <th className="px-6 py-4">Sisa DP</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Belum ada riwayat pengajuan DP.
                  </td>
                </tr>
              ) : (
                dps.map((dp) => (
                  <tr key={dp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(dp.tanggal_permintaan).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      <div>{dp.supplier.nama}</div>
                      {dp.keterangan && (
                        <div className="text-xs text-slate-500 mt-1.5 italic font-normal bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xs">
                          Note: "{dp.keterangan}"
                        </div>
                      )}
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
                    <td className="px-6 py-4 text-center">
                      {dp.status_approval === "menunggu_approval_admin" ? (
                        <DPApprovalActions dp={dp} role="ADMIN" />
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
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
