import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TransferList from "@/components/features/TransferList"
import { redirect } from "next/navigation"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

function formatRp(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function AdminTransferPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId
  if (!warehouseId) {
    redirect("/login")
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      warehouseId,
      status_approval: { in: ["approved", "sudah_transfer"] }
    },
    orderBy: { updatedAt: "desc" },
    include: { supplier: true, items: true }
  })

  const getPayableValue = (purchase: (typeof purchases)[number]) =>
    purchase.total_dibayar ??
    purchase.total_nilai_setelah_retur ??
    purchase.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

  const pendingTransfer = purchases.filter((purchase) => purchase.status_approval === "approved")
  const transferred = purchases.filter((purchase) => purchase.status_approval === "sudah_transfer")
  const pendingTermin = purchases.filter(
    (purchase) => purchase.status_pelunasan === "BELUM_LUNAS" && (purchase.nominal_belum_lunas || 0) > 0
  )

  /*
   * Nada kartu mengikuti KEADAAN, bukan kategori.
   *
   * Sebelumnya "Menunggu Transfer" selalu kuning dan "Sudah Transfer"
   * selalu hijau, bahkan ketika angkanya nol -- antrean yang sudah
   * bersih tetap terbaca seperti ada pekerjaan tertunda. Yang lebih
   * keliru: "Termin Belum Lunas" berwarna abu netral, padahal itu satu-
   * satunya baris di layar ini yang berarti UANG MASIH KURANG dibayar ke
   * lapak -- justru yang paling perlu menarik perhatian.
   */
  const summaryCards = [
    {
      label: "Menunggu Transfer",
      value: pendingTransfer.length.toLocaleString("id-ID"),
      sub: formatRp(pendingTransfer.reduce((sum, purchase) => sum + getPayableValue(purchase), 0)),
      satuan: "nota",
      tone: pendingTransfer.length > 0 ? "tone-warning" : "",
      description: "Perlu upload bukti",
    },
    {
      label: "Sudah Transfer",
      value: transferred.length.toLocaleString("id-ID"),
      sub: formatRp(transferred.reduce((sum, purchase) => sum + getPayableValue(purchase), 0)),
      satuan: "nota",
      tone: "",
      description: "Bukti tersimpan",
    },
    {
      label: "Termin Belum Lunas",
      value: pendingTermin.length.toLocaleString("id-ID"),
      sub: formatRp(pendingTermin.reduce((sum, purchase) => sum + (purchase.nominal_belum_lunas || 0), 0)),
      satuan: "nota",
      tone: pendingTermin.length > 0 ? "tone-danger" : "",
      description: "Sisa yang belum dibayar ke lapak",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kendali pembayaran"
        title="Transfer Pembayaran"
        description="Upload dan pantau bukti transfer untuk transaksi yang sudah disetujui."
      />
      {/* Bentuknya disamakan dengan baris ringkasan di dashboard Manager,
          supaya angka ringkasan di seluruh aplikasi terbaca dengan cara
          yang sama. */}
      <div className="stat-strip" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {summaryCards.map((card) => (
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
      <TransferList purchases={purchases} bolehKoreksi={session.user.role === "ADMIN"} />
    </div>
  )
}
