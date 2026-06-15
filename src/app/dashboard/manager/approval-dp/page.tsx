import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import DPApprovalActions from "@/components/features/DPApprovalActions"
import { redirect } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"

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
      <PageHeader
        eyebrow="Manager approval"
        title="Approval Kasbon (DP)"
        description="Daftar pengajuan kasbon di atas Rp 2.000.000 yang memerlukan persetujuan."
        actions={(
          <Link href="/dashboard/manager" className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            Kembali ke Dashboard
          </Link>
        )}
      />

      <div className="interactive-surface overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200/70 bg-white/55 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
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
                  <tr key={dp.id} className="premium-row group">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {new Date(dp.tanggal_permintaan).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      <div>{dp.supplier.nama}</div>
                      {dp.keterangan && (
                        <div className="mt-1.5 max-w-xs rounded-xl border border-slate-200/70 bg-white/70 p-2 text-xs font-normal italic text-slate-500">
                          Note: "{dp.keterangan}"
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-lg font-black text-slate-950">
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
