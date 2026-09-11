import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import { ChevronRight } from "lucide-react"
import { fmtRp, fmtTon } from "@/lib/format"

export default async function ApprovalHargaList() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const pendingApprovals = await prisma.purchase.findMany({
    where: { status_approval: "menunggu_approval_harga" },
    include: {
      supplier: true,
      // Standar harga gudang ikut dimuat untuk menghitung berapa SKU di
      // nota ini yang melewati batas -- dasar lencana status di kartu.
      warehouse: { include: { skuPrices: true } },
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
      />

      {/* Ponsel: satu kartu per nota yang menunggu keputusan.

          Kepala: nama lapak dan gudang + tanggal di kiri, lencana status di
          kanan. Lencananya dihitung dari standar harga gudang: "Di atas
          standar" kalau ada SKU yang harganya melewati batas -- alasan nota
          ini ada di antrean -- dan "Perlu review" kalau (karena standar
          berubah sesudah nota dibuat) tidak ada lagi yang melewati batas.
          Tanpa jumlah SKU di dalamnya: "1 SKU di atas standar" selebar 140px
          memotong nama lapak dan kotanya di layar 320px.

          Badan: wadah tint lembut berisi rincian barang (jumlah SKU dan
          tonase gudang) di kiri dan total nilai di kanan, supaya Manager
          tahu besar-kecilnya nota sebelum membukanya.

          Tombol: hijau utama aplikasi (.btn-primer), selebar kartu, dengan
          chevron sebagai tanda pindah layar. */}
      <div className="daftar-kartu">
        {pendingApprovals.length === 0 ? (
          <p className="section section-body text-center text-sm text-slate-400">
            Tidak ada transaksi yang menunggu approval harga.
          </p>
        ) : (
          pendingApprovals.map((draft) => {
            const skuLewat = draft.items.filter((item) => {
              const standar = draft.warehouse.skuPrices.find((s) => s.sku_name === item.sku_name)
              return item.harga_per_kg > (standar ? standar.max_price_per_kg : 0)
            }).length
            const jumlahSku = new Set(draft.items.map((item) => item.sku_name)).size
            const beratKg = draft.items.reduce((total, item) => total + (item.berat_final_item || 0), 0)
            const tanggal = new Date(draft.updatedAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Jakarta",
            })

            return (
              <article key={draft.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900">{draft.supplier.nama}</h3>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                      <span className="truncate">{draft.warehouse.nama.trim().replace(/^gudang\s+/i, "")}</span>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                      <span className="shrink-0">{tanggal}</span>
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {skuLewat > 0 ? "Di atas standar" : "Perlu review"}
                  </span>
                </div>

                {/* Dua lajur: kiri selebar isinya (auto), kanan sisa lebar
                    untuk nominal. Dengan dua lajur sama lebar, "Rp 24.009.200"
                    butuh 125px sementara lajurnya 108px di layar 320px. */}
                <div className="my-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rincian</p>
                    <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                      {jumlahSku} SKU
                      <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                      {fmtTon(beratKg)}
                    </p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total nilai</p>
                    <p className="mt-0.5 whitespace-nowrap font-mono text-[clamp(14px,4.4vw,16px)] font-extrabold tabular-nums text-slate-900">
                      {fmtRp(draft.total_nilai_setelah_retur || 0)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/manager/approval-harga/${draft.id}`}
                  className="btn-primer sentuh-luas-y flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold tracking-wide shadow-sm active:scale-[0.98]"
                >
                  Review Transaksi
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            )
          })
        )}
      </div>

      <div className="section overflow-hidden hidden md:block">
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
            <tbody className="divide-y divide-[var(--border)]">
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
                        {/* Netral, bukan nada utama. Seluruh baris di tabel
                            ini punya tombol yang sama, jadi tidak ada satu
                            pun yang lebih penting dari yang lain -- deretan
                            tombol hijau cuma membuat mata tidak punya tempat
                            beristirahat. Keputusannya sendiri diambil di
                            halaman berikutnya, bukan di sini. */}
                        <button className="btn-netral premium-button px-4 py-2 text-xs font-bold">
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
