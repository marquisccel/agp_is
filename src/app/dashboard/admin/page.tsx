import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import PendingTerminAlerts from "@/components/features/PendingTerminAlerts"
import { PENDING_VERIFICATION_STATUSES } from "@/lib/purchaseStatus"
import PageHeader from "@/components/ui/PageHeader"
import KartuData from "@/components/ui/KartuData"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  const rawPendingTermins = await prisma.purchase.findMany({
    where: { 
      status_pelunasan: "BELUM_LUNAS",
      warehouseId: warehouseId
    },
    include: { supplier: true },
    orderBy: { tanggal: "desc" }
  })

  const pendingTermins = rawPendingTermins.map(p => ({
    id: p.id,
    nomor_nota: p.nomor_nota || null,
    tanggal: p.tanggal.toISOString(),
    total_nilai_setelah_retur: p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0,
    persentase_pembayaran: p.persentase_pembayaran ?? 80,
    nominal_belum_lunas: p.nominal_belum_lunas ?? 0,
    supplier: {
      nama: p.supplier?.nama || "Lapak Terhapus"
    }
  }))

  const drafts = await prisma.purchase.findMany({
    where: { 
      status_approval: { in: PENDING_VERIFICATION_STATUSES },
      warehouseId: warehouseId 
    },
    include: {
      supplier: true,
      staff: true,
      items: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <PendingTerminAlerts initialAlerts={pendingTermins} />
      <PageHeader
        eyebrow="Ruang operasional"
        title="Double Check Transaksi"
        description="Daftar draft pembelian yang menunggu validasi berat dan retur."
        actions={
          <span className="text-sm font-semibold" style={{ color: drafts.length > 0 ? "var(--warning)" : "var(--muted-faint)" }}>
            {drafts.length > 0 ? `${drafts.length} menunggu dicek` : "Tidak ada antrean"}
          </span>
        }
      />

      {/* Antrean Double Check adalah layar kerja Admin, bukan tabel yang
          sesekali dilihat: yang dicari cuma nama lapak dan tombol masuk.
          Di ponsel karena itu dibuat kartu dengan tombol di kaki, dalam
          jangkauan jempol. */}
      <div className="daftar-kartu">
        {drafts.length === 0 ? (
          <p className="section section-body text-center text-sm" style={{ color: "var(--muted-faint)" }}>
            Tidak ada transaksi yang menunggu double check.
          </p>
        ) : (
          drafts.map((draft) => (
            <KartuData
              key={draft.id}
              judul={draft.supplier.nama}
              subjudul={`${new Date(draft.createdAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })} · oleh ${draft.staff.nama}`}
              baris={draft.items.map((i) => ({
                label: i.sku_name,
                nilai: `${i.berat_final_item} kg`,
              }))}
              aksi={
                <Link
                  href={`/dashboard/admin/check/${draft.id}`}
                  className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 text-sm font-bold"
                >
                  Lakukan Cek
                </Link>
              }
            />
          ))
        )}
      </div>

      <div className="section overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="tabel-lembut text-left text-sm text-slate-600">
            <thead>
              <tr>
                <th>Tanggal / Staff</th>
                <th>Lapak</th>
                <th>Item (Estimasi)</th>
                <th className="!text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {drafts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center" style={{ color: "var(--muted-faint)" }}>
                    Tidak ada transaksi yang menunggu double check.
                  </td>
                </tr>
              ) : (
                drafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      <div className="font-medium" style={{ color: "var(--foreground)" }}>{new Date(draft.createdAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--muted-faint)" }}>Oleh: {draft.staff.nama}</div>
                    </td>
                    <td className="font-medium">
                      {draft.supplier.nama}
                    </td>
                    <td>
                      {draft.items.map(i => (
                        <div key={i.id} className="text-xs">
                          <span className="font-semibold" style={{ color: "var(--foreground)" }}>{i.sku_name}</span>: {i.berat_final_item} kg
                        </div>
                      ))}
                    </td>
                    <td className="text-center">
                      <Link href={`/dashboard/admin/check/${draft.id}`}>
                        <button className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 py-2 text-xs font-bold">
                          Lakukan Cek
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
