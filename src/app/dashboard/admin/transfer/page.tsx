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

  const summaryCards = [
    {
      label: "Menunggu Transfer",
      value: pendingTransfer.length.toLocaleString("id-ID"),
      sub: formatRp(pendingTransfer.reduce((sum, purchase) => sum + getPayableValue(purchase), 0)),
      tone: "amber",
      description: "Perlu upload bukti",
    },
    {
      label: "Sudah Transfer",
      value: transferred.length.toLocaleString("id-ID"),
      sub: formatRp(transferred.reduce((sum, purchase) => sum + getPayableValue(purchase), 0)),
      tone: "emerald",
      description: "Bukti tersimpan",
    },
    {
      label: "Termin Belum Lunas",
      value: pendingTermin.length.toLocaleString("id-ID"),
      sub: formatRp(pendingTermin.reduce((sum, purchase) => sum + (purchase.nominal_belum_lunas || 0), 0)),
      tone: "slate",
      description: "Butuh follow-up",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payment control"
        title="Transfer Pembayaran"
        description="Upload dan pantau bukti transfer untuk transaksi yang sudah disetujui."
      />
      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="interactive-surface group relative overflow-hidden border border-slate-200/80 bg-white/86 p-5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5">
                  {card.value}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">{card.sub}</p>
                <p className="mt-3 text-xs font-semibold text-slate-400">{card.description}</p>
              </div>
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full shadow-sm ${
                  card.tone === "amber"
                    ? "bg-amber-400 shadow-amber-400/40"
                    : card.tone === "emerald"
                      ? "bg-emerald-500 shadow-emerald-500/40"
                      : "bg-slate-400 shadow-slate-400/40"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
      <TransferList purchases={purchases} />
    </div>
  )
}
