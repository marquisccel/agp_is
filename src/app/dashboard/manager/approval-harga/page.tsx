import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"

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
      <PageHeader
        eyebrow="Persetujuan manager"
        title="Approval Harga"
        description="Daftar transaksi yang melebihi standar harga maksimum."
        actions={(
          <Link href="/dashboard/manager" className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            Kembali ke Dashboard
          </Link>
        )}
      />

      <div className="section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200/70 bg-white/55 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Gudang / Tanggal</th>
                <th className="px-6 py-4">Lapak</th>
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
                  <tr key={draft.id} className="premium-row">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{draft.warehouse.nama}</div>
                      <div className="text-xs text-slate-400 mt-1">{new Date(draft.updatedAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {draft.supplier.nama}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-slate-950">
                      Rp {(draft.total_nilai_setelah_retur || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/dashboard/manager/approval-harga/${draft.id}`}>
                        <button className="premium-button rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700 hover:bg-orange-100">
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
