import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import PendingTerminAlerts from "@/components/features/PendingTerminAlerts"

export default async function SupervisorDashboard() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "SUPERVISOR") {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  const rawPendingTermins = await prisma.purchase.findMany({
    where: {
      status_pelunasan: "BELUM_LUNAS",
      warehouseId,
    },
    include: { supplier: true },
    orderBy: { tanggal: "desc" },
  })

  const pendingTermins = rawPendingTermins.map((p) => ({
    id: p.id,
    nomor_nota: p.nomor_nota || null,
    tanggal: p.tanggal.toISOString(),
    total_nilai_setelah_retur: p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0,
    persentase_pembayaran: p.persentase_pembayaran ?? 80,
    nominal_belum_lunas: p.nominal_belum_lunas ?? 0,
    supplier: {
      nama: p.supplier?.nama || "Supplier Terhapus",
    },
  }))

  const drafts = await prisma.purchase.findMany({
    where: {
      status_approval: "menunggu_double_cek",
      warehouseId,
    },
    include: {
      supplier: true,
      staff: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PendingTerminAlerts initialAlerts={pendingTermins} />
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Review Transaksi Gudang</h2>
          <p className="text-slate-500 text-sm mt-1">Validasi draft pembelian dari staff sebelum masuk alur approval lanjutan.</p>
        </div>
        <Link href="/dashboard/supervisor/history">
          <button className="bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all">
            Daftar Transaksi
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Tanggal / Staff</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Item (Estimasi)</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drafts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada transaksi yang menunggu review.
                  </td>
                </tr>
              ) : (
                drafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{new Date(draft.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</div>
                      <div className="text-xs text-slate-400 mt-1">Oleh: {draft.staff.nama}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {draft.supplier.nama}
                    </td>
                    <td className="px-6 py-4">
                      {draft.items.map((i) => (
                        <div key={i.id} className="text-xs">
                          <span className="font-semibold text-slate-700">{i.sku_name}</span>: {i.berat_final_item} kg
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/dashboard/supervisor/check/${draft.id}`}>
                        <button className="bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all">
                          Review
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
