import { authOptions } from "@/lib/authOptions"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"
import StatusPill from "@/components/ui/StatusPill"
import { getDpStatus } from "@/lib/purchaseStatusLabels"

export default async function DPListStaff() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) return null

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
      <PageHeader
        eyebrow="Kasbon lapak"
        title="Daftar Pengajuan Kasbon (DP)"
        description="Kelola dan pantau status pengajuan kasbon supplier Anda."
        actions={(
          <Link
            href="/dashboard/staff/dp/new"
            className="btn-primer premium-button sembunyi-ponsel rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold"
          >
            Pengajuan Kasbon Baru
          </Link>
        )}
      />

      {/* Ponsel: tombol aksi di luar kartu judul, rata kanan tepat di
          bawahnya. Di dalam kartu judul ia melebar selebar kartu dan
          terbaca sebagai bagian dari judul, bukan tindakan. */}
      <div className="hanya-ponsel -mt-3 flex justify-end">
        <Link
          href="/dashboard/staff/dp/new"
          className="sentuh-luas-y inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Pengajuan Kasbon Baru
        </Link>
      </div>

      <div className="section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tabel-lembut text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th>Tanggal Pengajuan</th>
                <th>Lapak</th>
                <th>Nominal Diajukan</th>
                {/* Yang tersisa hanya bermakna untuk kasbon yang sudah
                    disetujui; judulnya diperjelas supaya tanda hubung di
                    baris lain tidak terbaca seperti data yang hilang. */}
                <th>Sisa Saldo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center" style={{ color: "var(--muted-faint)" }}>
                    Belum ada riwayat pengajuan kasbon untuk supplier di gudang Anda.
                  </td>
                </tr>
              ) : (
                dps.map((dp) => {
                  // Empat lencana yang ditulis tangan di sini punya empat
                  // keluarga warna sendiri, dan labelnya sudah melenceng dari
                  // sumber bersama: "Review Admin" di sini, "Menunggu Admin"
                  // di layar Manager -- status yang sama, dua nama.
                  const status = getDpStatus(dp.status_approval)
                  const sisa = dp.sisa_dp || 0

                  return (
                    <tr key={dp.id}>
                      <td className="font-medium" style={{ color: "var(--foreground)" }}>
                        {new Date(dp.tanggal_permintaan).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                      </td>
                      <td className="font-medium">{dp.supplier.nama}</td>
                      <td className="font-mono font-medium" style={{ color: "var(--foreground)" }}>
                        Rp {dp.nominal_diajukan.toLocaleString('id-ID')}
                      </td>
                      {/* Sisa saldo dulu berwarna biru -- warna yang tidak
                          dipakai di mana pun lagi. Saldo yang masih tersisa
                          adalah uang yang sudah keluar tapi belum jadi
                          barang, jadi bernada perhatian seperti di Rekap DP. */}
                      <td
                        className="font-mono font-medium"
                        style={{ color: dp.status_approval === 'approved' && sisa > 0 ? "var(--warning)" : "var(--muted-faint)" }}
                      >
                        {dp.status_approval === 'approved' ? `Rp ${sisa.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td>
                        <StatusPill label={status.label} tone={status.tone} />
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
