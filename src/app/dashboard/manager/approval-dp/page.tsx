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

  // Riwayat keputusan terbaru lintas gudang -- termasuk yang diputus final
  // oleh Admin -- agar Manager dapat memantau admin mana yang menyetujui
  // tiap kasbon.
  const recentDecisions = await prisma.downPayment.findMany({
    where: { status_approval: { in: ["approved", "rejected"] } },
    orderBy: [{ tanggal_approval: { sort: "desc", nulls: "last" } }, { tanggal_permintaan: "desc" }],
    take: 20,
    include: {
      supplier: { include: { warehouse: true } },
      approvedBy: { select: { nama: true, role: true } },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manager approval"
        title="Approval Kasbon (DP)"
        description="Pengajuan yang menunggu keputusan Manager, beserta riwayat keputusan untuk pemantauan penyetuju."
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
                <th className="px-6 py-4">Tanggal Pengajuan</th>
                <th className="px-6 py-4">Lapak</th>
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
                          Note: &ldquo;{dp.keterangan}&rdquo;
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

      <div className="section overflow-hidden">
        <div className="border-b border-slate-200/70 bg-white/55 px-6 py-4">
          <h2 className="text-sm font-black uppercase tracking-[0.08em] text-slate-500">Riwayat Keputusan Kasbon Terbaru</h2>
          <p className="mt-1 text-xs text-slate-400">Pemantauan penyetuju — mencakup kasbon yang diputus final oleh Admin gudang maupun oleh Manager.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200/70 bg-white/55 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Tanggal Keputusan</th>
                <th className="px-6 py-4">Lapak</th>
                <th className="px-6 py-4">Gudang</th>
                <th className="px-6 py-4">Nominal Disetujui</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Diputuskan Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentDecisions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Belum ada keputusan kasbon.
                  </td>
                </tr>
              ) : (
                recentDecisions.map((dp) => (
                  <tr key={dp.id} className="premium-row group">
                    <td className="px-6 py-4 text-slate-700">
                      {dp.tanggal_approval
                        ? new Date(dp.tanggal_approval).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{dp.supplier.nama}</td>
                    <td className="px-6 py-4 text-slate-600">{dp.supplier.warehouse?.nama ?? '-'}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {dp.status_approval === "approved"
                        ? `Rp ${(dp.nominal_disetujui ?? dp.nominal_diajukan).toLocaleString('id-ID')}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {dp.status_approval === "approved"
                        ? <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">Disetujui</span>
                        : <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-xs font-bold border border-red-200">Ditolak</span>}
                    </td>
                    <td className="px-6 py-4">
                      {dp.approvedBy ? (
                        <div>
                          <div className="font-bold text-slate-800">{dp.approvedBy.nama}</div>
                          <div className="text-xs text-slate-400">{dp.approvedBy.role === "MANAGER" ? "Manager" : "Admin gudang"}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
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
