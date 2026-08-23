import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TransferList from "@/components/features/TransferList"
import { redirect } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import { fmtRp } from "@/lib/format"

/**
 * Transfer Pembayaran versi Manager.
 *
 * Kenapa ada: kalau lapak menelepon Manager langsung untuk menagih
 * pelunasan, satu-satunya jalan sebelumnya adalah menitipkan uangnya ke
 * Admin supaya pembayarannya tercatat -- padahal API transfer, pencatatan
 * pelunasan, dan koreksi kekurangan SUDAH menerima MANAGER sejak lama.
 * Yang tidak ada cuma layarnya. Jadi ini menutup celah tampilan, bukan
 * memperluas wewenang.
 *
 * Bedanya dengan layar Admin: Admin dikurung ke gudangnya sendiri,
 * sementara Manager melihat seluruh gudang dalam satu daftar dengan
 * penyaring gudang -- sama seperti layar Manager lainnya.
 */
export default async function ManagerTransferPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const purchases = await prisma.purchase.findMany({
    where: { status_approval: { in: ["approved", "sudah_transfer"] } },
    orderBy: { updatedAt: "desc" },
    include: { supplier: true, items: true, warehouse: { select: { id: true, nama: true } } },
  })

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  })

  const nilaiTransfer = (purchase: (typeof purchases)[number]) =>
    purchase.total_dibayar ??
    purchase.total_nilai_setelah_retur ??
    purchase.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

  const menunggu = purchases.filter((p) => p.status_approval === "approved")
  const sudah = purchases.filter((p) => p.status_approval === "sudah_transfer")
  const belumLunas = purchases.filter(
    (p) => p.status_pelunasan === "BELUM_LUNAS" && (p.nominal_belum_lunas || 0) > 0,
  )

  /*
   * Nada kartu mengikuti KEADAAN, bukan kategori: antrean yang sudah
   * bersih tidak perlu terbaca seperti ada pekerjaan tertunda, dan sisa
   * yang belum dibayar ke lapak adalah satu-satunya baris yang berarti
   * uang masih kurang.
   */
  const ringkasan = [
    {
      label: "Menunggu Transfer",
      value: menunggu.length.toLocaleString("id-ID"),
      satuan: "nota",
      sub: fmtRp(menunggu.reduce((sum, p) => sum + nilaiTransfer(p), 0)),
      description: "Perlu upload bukti",
      tone: menunggu.length > 0 ? "tone-warning" : "",
    },
    {
      label: "Sudah Transfer",
      value: sudah.length.toLocaleString("id-ID"),
      satuan: "nota",
      sub: fmtRp(sudah.reduce((sum, p) => sum + nilaiTransfer(p), 0)),
      description: "Bukti tersimpan",
      tone: "",
    },
    {
      label: "Belum Lunas",
      value: belumLunas.length.toLocaleString("id-ID"),
      satuan: "nota",
      sub: fmtRp(belumLunas.reduce((sum, p) => sum + (p.nominal_belum_lunas || 0), 0)),
      description: "Sisa yang belum dibayar ke lapak",
      tone: belumLunas.length > 0 ? "tone-danger" : "",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kendali pembayaran"
        title="Transfer Pembayaran"
        description="Bayar dan pantau pelunasan ke lapak untuk seluruh Collection Center."
      />

      <div className="stat-strip" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {ringkasan.map((card) => (
          <div key={card.label} className={`stat-tile ${card.tone}`}>
            <span className="stat-label">{card.label}</span>
            <div className="stat-value-row">
              <span className="stat-value font-mono">{card.value}</span>
              <span className="stat-unit">{card.satuan}</span>
            </div>
            <span className="stat-delta flat">{card.sub} &middot; {card.description}</span>
          </div>
        ))}
      </div>

      <TransferList purchases={purchases} warehouses={warehouses} bolehKoreksi />
    </div>
  )
}
