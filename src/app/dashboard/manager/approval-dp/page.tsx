import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import DPApprovalActions from "@/components/features/DPApprovalActions"
import { redirect } from "next/navigation"

export default async function DPApprovalManager() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  // Fetch DPs awaiting manager approval
  const dps = await prisma.downPayment.findMany({
    where: { status_approval: "menunggu_approval_manager" },
    orderBy: { tanggal_permintaan: "desc" },
    include: { supplier: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Approval Kasbon (DP)</h2>
          <p className="text-slate-500 text-sm mt-1">Daftar pengajuan kasbon di atas Rp 2.000.000 yang memerlukan persetujuan.</p>
        </div>
        <Link href="/dashboard/manager">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
            Kembali ke Dashboard
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
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada pengajuan kasbon yang menunggu persetujuan.
                  </td>
                </tr>
              ) : (
                dps.map((dp) => (
                  <tr key={dp.id} className="hover:bg-slate-50/50 transition-colors group">
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
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600 text-lg">
                      Rp {dp.nominal_diajukan.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <DPApprovalActions dp={dp} />
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
