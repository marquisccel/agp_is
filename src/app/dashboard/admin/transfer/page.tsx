import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import TransferList from "@/components/features/TransferList"
import { redirect } from "next/navigation"
import { isOperationalRole, isWarehouseScoped } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"
import BarisRingkasan from "@/components/ui/BarisRingkasan"

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

  // Staff tetap dikurung ke gudangnya sendiri; Admin memeriksa-silang SEMUA
  // gudang sejak arahan Manager 30 Sep 2026 (lihat lib/roles.ts).
  const scoped = isWarehouseScoped(session.user.role)
  const warehouseId = session.user.warehouseId
  if (scoped && !warehouseId) {
    redirect("/login")
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      ...(scoped ? { warehouseId: warehouseId ?? undefined } : {}),
      status_approval: { in: ["approved", "sudah_transfer"] }
    },
    orderBy: { updatedAt: "desc" },
    include: { supplier: true, items: true, warehouse: { select: { id: true, nama: true } } }
  })

  const warehouses = scoped
    ? undefined
    : await prisma.warehouse.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } })

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
      urutan: "md:order-1",
      value: pendingTransfer.length.toLocaleString("id-ID"),
      sub: formatRp(pendingTransfer.reduce((sum, purchase) => sum + getPayableValue(purchase), 0)),
      satuan: "nota",
      tone: pendingTransfer.length > 0 ? "tone-warning" : "",
      description: "Perlu upload bukti",
    },
    {
      label: "Termin Belum Lunas",
      urutan: "md:order-3",
      value: pendingTermin.length.toLocaleString("id-ID"),
      sub: formatRp(pendingTermin.reduce((sum, purchase) => sum + (purchase.nominal_belum_lunas || 0), 0)),
      satuan: "nota",
      tone: pendingTermin.length > 0 ? "tone-danger" : "",
      description: "Sisa yang belum dibayar ke lapak",
    },
    {
      label: "Sudah Transfer",
      urutan: "md:order-2 sembunyi-ponsel",
      value: transferred.length.toLocaleString("id-ID"),
      sub: formatRp(transferred.reduce((sum, purchase) => sum + getPayableValue(purchase), 0)),
      satuan: "nota",
      tone: "",
      description: "Bukti tersimpan",
    },
  ]

  const kartuSudah = summaryCards.find((c) => c.label === "Sudah Transfer")

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
      {/* Di ponsel "Menunggu" dan "Belum lunas" berbagi baris, lalu "Sudah
          transfer" jadi baris mendatar tersendiri (BarisRingkasan). Urutan
          DOM-nya Menunggu, Belum lunas, Sudah; kelas md:order-* mengembalikan
          urutan tiga lajur di layar lebar menjadi Menunggu, Sudah, Belum. */}
      <div className="stat-strip strip-3">
        {summaryCards.map((card) => (
          <div key={card.label} className={`stat-tile ${card.tone} ${card.urutan}`}>
            <span className="stat-label">{card.label}</span>
            <div className="stat-value-row">
              <span className="stat-value">{card.value}</span>
              <span className="stat-unit">{card.satuan}</span>
            </div>
            {/* Nominal dan keterangan dua baris terpisah. Sebaris dengan
                titik tengah, "Rp 118.486.000 · Perlu upload bukti" di petak
                selebar 143px patah di tengah keterangan dan nominalnya
                terbaca sebagai bagian dari kalimat, bukan angka. */}
            <span className="mt-1 block font-mono text-sm font-bold tabular-nums text-slate-900">{card.sub}</span>
            <span
              className={`mt-0.5 block text-[11px] font-medium ${
                card.tone === "tone-warning" ? "text-amber-700" : card.tone === "tone-danger" ? "text-rose-700" : "text-slate-500"
              }`}
            >
              {card.description}
            </span>
          </div>
        ))}
      </div>
      {kartuSudah && (
        <BarisRingkasan
          label="Sudah transfer"
          keterangan={`${kartuSudah.value} nota · ${kartuSudah.description}`}
          nilai={kartuSudah.sub}
          className="-mt-3"
        />
      )}
      <TransferList purchases={purchases} warehouses={warehouses} bolehKoreksi={session.user.role === "ADMIN"} />
    </div>
  )
}
