import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function ApprovalHargaList() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const pendingApprovals = await prisma.purchase.findMany({
    where: { status_approval: "menunggu_approval_harga" },
    include: {
      supplier: true,
      warehouse: true,
      items: true
    },
    orderBy: { updatedAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Approval Harga</h2>
          <p className="text-slate-500 text-sm mt-1">Daftar transaksi yang melebihi standar harga maksimum.</p>
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
                <th className="px-6 py-4">Gudang / Tanggal</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Total Nilai</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada transaksi yang menunggu approval harga.
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((draft) => (
                  <tr key={draft.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{draft.warehouse.nama}</div>
                      <div className="text-xs text-slate-400 mt-1">{new Date(draft.updatedAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {draft.supplier.nama}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      Rp {(draft.total_nilai_setelah_retur || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/dashboard/manager/approval-harga/${draft.id}`}>
                        <button className="bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all">
                          Review Transaksi
                        </button>
                      </Link>
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
