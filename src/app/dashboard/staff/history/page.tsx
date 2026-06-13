import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function StaffHistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "STAFF") {
    redirect("/login")
  }

  const userId = session.user.id

  const purchases = await prisma.purchase.findMany({
    where: { userIdStaff: userId },
    orderBy: { createdAt: "desc" },
    include: { supplier: true, items: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Transaksi Saya</h2>
          <p className="text-slate-500 text-sm mt-1">Pantau status transaksi yang telah Anda buat.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Tanggal / Waktu</th>
                <th className="px-6 py-4">Supplier</th>
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
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(p.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {p.supplier.nama}
                    </td>
                    <td className="px-6 py-4">
                      {p.metode_pembayaran_terpilih?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4">
                      {p.items.length} jenis
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const statusMap: Record<string, { label: string, cls: string }> = {
                          menunggu_double_cek: { label: '🕐 Menunggu Double Cek', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                          menunggu_approval_harga: { label: '📋 Menunggu Approve', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
                          approved: { label: '✓ Disetujui', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                          sudah_transfer: { label: '💸 Sudah Ditransfer', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          rejected: { label: '✗ Ditolak', cls: 'bg-red-50 text-red-700 border-red-200' },
                          dibatalkan: { label: '⊘ Dibatalkan', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
                        }
                        const s = statusMap[p.status_approval] ?? { label: p.status_approval, cls: 'bg-slate-50 text-slate-600 border-slate-200' }
                        return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${s.cls}`}>{s.label}</span>
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.bukti_transfer ? (
                        <a href={p.bukti_transfer} target="_blank" rel="noreferrer">
                          <img src={p.bukti_transfer} alt="Bukti" className="w-12 h-12 object-cover rounded-lg border border-emerald-300 mx-auto hover:scale-110 transition-transform shadow" />
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {["approved", "sudah_transfer"].includes(p.status_approval) ? (
                        <a
                          href={`/nota/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold transition-colors border border-cyan-200"
                        >
                          📄 Lihat Nota
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
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
