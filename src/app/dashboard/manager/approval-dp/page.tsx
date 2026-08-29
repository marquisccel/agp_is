import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import DPApprovalActions from "@/components/features/DPApprovalActions"
import { redirect } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import StatusPill from "@/components/ui/StatusPill"
import { getDpStatus } from "@/lib/purchaseStatusLabels"

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
        eyebrow="Persetujuan manager"
        title="Approval Kasbon (DP)"
        description="Pengajuan yang menunggu keputusan Manager, beserta riwayat keputusan untuk pemantauan penyetuju."
        actions={(
          <Link href="/dashboard/manager" className="btn-netral premium-button px-4 py-2.5 text-sm">
            Kembali ke Dashboard
          </Link>
        )}
      />

      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Menunggu keputusan</span>
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Antrean Pengajuan</h2>
          </div>
          <span className="text-sm font-semibold" style={{ color: dps.length > 0 ? "var(--warning)" : "var(--muted-faint)" }}>
            {dps.length > 0 ? `${dps.length} menunggu Anda` : "Tidak ada antrean"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="tabel-lembut text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th>Tanggal Pengajuan</th>
                <th>Lapak</th>
                <th>Alasan Pengajuan</th>
                <th className="!text-right">Nominal Diajukan</th>
                <th>Status</th>
                <th className="!text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center" style={{ color: "var(--muted-faint)" }}>
                    Tidak ada pengajuan kasbon yang menunggu persetujuan.
                  </td>
                </tr>
              ) : (
                dps.map((dp) => (
                  <tr key={dp.id}>
                    <td className="whitespace-nowrap font-medium" style={{ color: "var(--foreground)" }}>
                      {new Date(dp.tanggal_permintaan).toLocaleDateString('id-ID', { dateStyle: "medium", timeZone: 'Asia/Jakarta' })}
                    </td>
                    <td className="font-bold" style={{ color: "var(--foreground)" }}>{dp.supplier.nama}</td>
                    {/* Alasan pengajuan berdiri sebagai kolomnya sendiri.
                        Sebelumnya ia menumpuk di bawah nama lapak, sehingga
                        satu sel memuat dua hal berbeda dan kolom di
                        kanannya jadi tampak kosong. */}
                    <td className="max-w-xs">
                      {dp.keterangan
                        ? <span className="text-xs italic" style={{ color: "var(--muted)" }}>&ldquo;{dp.keterangan}&rdquo;</span>
                        : <span className="text-xs" style={{ color: "var(--muted-faint)" }}>Tidak diisi</span>}
                    </td>
                    <td className="whitespace-nowrap text-right font-mono text-base font-black" style={{ color: "var(--foreground)" }}>
                      Rp {dp.nominal_diajukan.toLocaleString('id-ID')}
                    </td>
                    {/* Kolom status. Seluruh baris di tabel ini memang
                        menunggu keputusan, tapi tanpa kolomnya pembaca harus
                        menyimpulkan itu dari judul kartu di atas. */}
                    <td>
                      <span
                        className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ background: "color-mix(in srgb, var(--warning) 14%, transparent)", color: "var(--warning)" }}
                      >
                        Menunggu persetujuan
                      </span>
                    </td>
                    <td>
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
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Jejak keputusan</span>
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Keputusan Terbaru</h2>
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--muted-faint)" }}>
            20 terakhir, semua gudang
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="tabel-lembut text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th>Tanggal Keputusan</th>
                <th>Lapak</th>
                <th>Gudang</th>
                <th className="!text-right">Nominal Disetujui</th>
                <th>Status</th>
                <th>Diputuskan Oleh</th>
              </tr>
            </thead>
            <tbody>
              {recentDecisions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center" style={{ color: "var(--muted-faint)" }}>
                    Belum ada keputusan kasbon.
                  </td>
                </tr>
              ) : (
                recentDecisions.map((dp) => {
                  const status = getDpStatus(dp.status_approval)
                  return (
                    <tr key={dp.id}>
                      <td className="whitespace-nowrap">
                        {dp.tanggal_approval
                          ? new Date(dp.tanggal_approval).toLocaleDateString('id-ID', { dateStyle: "medium", timeZone: 'Asia/Jakarta' })
                          : '-'}
                      </td>
                      <td className="font-bold" style={{ color: "var(--foreground)" }}>{dp.supplier.nama}</td>
                      <td>{dp.supplier.warehouse?.nama ?? '-'}</td>
                      <td className="whitespace-nowrap text-right font-mono font-bold" style={{ color: "var(--foreground)" }}>
                        {dp.status_approval === "approved"
                          ? `Rp ${(dp.nominal_disetujui ?? dp.nominal_diajukan).toLocaleString('id-ID')}`
                          : '-'}
                      </td>
                      <td>
                        <StatusPill label={status.label} tone={status.tone} />
                      </td>
                      <td>
                        {dp.approvedBy ? (
                          <div>
                            <div className="font-bold" style={{ color: "var(--foreground)" }}>{dp.approvedBy.nama}</div>
                            <div className="text-xs" style={{ color: "var(--muted-faint)" }}>
                              {dp.approvedBy.role === "MANAGER" ? "Manager" : "Admin gudang"}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted-faint)" }}>-</span>
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
