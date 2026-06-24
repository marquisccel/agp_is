import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

export default async function StaffHistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) {
    redirect("/login")
  }

  const userId = session.user.id
  const warehouseId = session.user.warehouseId

  const purchases = await prisma.purchase.findMany({
    where: session.user.role === "ADMIN" && warehouseId ? { warehouseId } : { userIdStaff: userId },
    orderBy: { createdAt: "desc" },
    include: { supplier: true, items: true },
  })

  const statusMap: Record<string, { label: string; cls: string }> = {
    menunggu_verifikasi: { label: "Menunggu Verifikasi", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    menunggu_approval_harga: { label: "Menunggu Approval", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    approved: { label: "Disetujui", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    sudah_transfer: { label: "Sudah Transfer", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-200" },
    dibatalkan: { label: "Dibatalkan", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction log"
        title="Daftar Transaksi Saya"
        description="Pantau status transaksi yang telah Anda buat."
      />

      <div className="interactive-surface bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Tanggal / Waktu</th>
                <th className="px-6 py-4">Lapak</th>
                <th className="px-6 py-4">Metode Bayar</th>
                <th className="px-6 py-4">Total Item</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Bukti Transfer</th>
                <th className="px-6 py-4 text-center">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => {
                  const status = statusMap[purchase.status_approval] ?? { label: purchase.status_approval, cls: "bg-slate-50 text-slate-600 border-slate-200" }

                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {new Date(purchase.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {purchase.supplier.nama}
                      </td>
                      <td className="px-6 py-4">
                        {purchase.metode_pembayaran_terpilih?.replace("_", " ") || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {purchase.items.length} jenis
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {purchase.bukti_transfer ? (
                          <a href={purchase.bukti_transfer} target="_blank" rel="noreferrer">
                            <img src={purchase.bukti_transfer} alt="Bukti transfer" className="w-12 h-12 object-cover rounded-lg border border-slate-200 mx-auto hover:scale-105 transition-transform shadow-sm" />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {["approved", "sudah_transfer"].includes(purchase.status_approval) ? (
                          <a
                            href={`/nota/${purchase.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 shadow-sm"
                          >
                            Lihat Nota
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
