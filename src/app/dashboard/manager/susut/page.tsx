import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SusutLebihAnalytics, { type TransaksiSusutDetail } from "@/components/features/SusutLebihAnalytics"
import MonthYearFilter from "@/components/features/MonthYearFilter"
import Link from "next/link"
import { ACTIVE_PURCHASE_STATUSES } from "@/lib/purchaseStatus"
import PageHeader from "@/components/ui/PageHeader"

export default async function ManagerSusutPage({
  searchParams
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>
}) {
  const { bulan: qBulan, tahun: qTahun } = await searchParams
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  // Date setup
  const nowUtc = new Date()
  const now = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000)
  const selectedBulan = qBulan ? parseInt(qBulan) : now.getUTCMonth() + 1
  const selectedTahun = qTahun ? parseInt(qTahun) : now.getUTCFullYear()

  const monthStart = new Date(Date.UTC(selectedTahun, selectedBulan - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const monthEnd   = new Date(Date.UTC(selectedTahun, selectedBulan, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)

  // Fetch data
  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })
  const validPurchases = await prisma.purchase.findMany({
    where: {
      status_approval: { in: ACTIVE_PURCHASE_STATUSES },
      createdAt: { gte: monthStart, lt: monthEnd }
    },
    include: {
      items: true,
      supplier: true,
      warehouse: true
    }
  })

  // Compute lapakSusutData
  const susutLebihMap: Record<string, {
    nama: string
    warehouseId: string
    warehouseName: string
    totalLapak: number
    totalGudang: number
    totalSusut: number
    totalLebih: number
    transaksi: number
    detailTransaksi: TransaksiSusutDetail[]
  }> = {}

  for (const p of validPurchases) {
    const lapak = p.berat_timbangan_lapak
    const gudang = p.berat_timbangan_gudang
    if (!lapak || !gudang) continue

    const sid = p.supplierId
    const wh = warehouses.find(w => w.id === p.warehouseId)
    if (!susutLebihMap[sid]) {
      susutLebihMap[sid] = {
        nama: p.supplier?.nama || "Unknown",
        warehouseId: p.warehouseId,
        warehouseName: wh?.nama || "-",
        totalLapak: 0,
        totalGudang: 0,
        totalSusut: 0,
        totalLebih: 0,
        transaksi: 0,
        detailTransaksi: []
      }
    }
    const entry = susutLebihMap[sid]
    const selisih = gudang - lapak
    entry.totalLapak += lapak
    entry.totalGudang += gudang
    if (selisih < 0) entry.totalSusut += Math.abs(selisih)
    else if (selisih > 0) entry.totalLebih += selisih
    entry.transaksi += 1

    const skus = p.items.map(item => {
      const itemLapak = item.berat_lapak ?? item.berat_final_item ?? 0
      const itemGudang = item.berat_final_item ?? 0
      return {
        skuName: item.sku_name,
        beratLapak: itemLapak,
        beratGudang: itemGudang,
        selisih: itemGudang - itemLapak
      }
    })

    entry.detailTransaksi.push({
      purchaseId: p.id,
      nomorNota: p.nomor_nota || null,
      tanggal: p.createdAt.toISOString(),
      beratLapak: lapak,
      beratGudang: gudang,
      selisih: selisih,
      skus
    })
  }

  const lapakSusutData = Object.entries(susutLebihMap).map(([supplierId, v]) => ({
    supplierId,
    namaLapak: v.nama,
    warehouseId: v.warehouseId,
    warehouseName: v.warehouseName,
    totalLapak: v.totalLapak,
    totalGudang: v.totalGudang,
    selisih: v.totalGudang - v.totalLapak,
    totalSusut: v.totalSusut,
    totalLebih: v.totalLebih,
    transaksi: v.transaksi,
    detailTransaksi: v.detailTransaksi,
    pctSusut: v.totalLapak > 0 ? (v.totalSusut / v.totalLapak) * 100 : 0,
    pctLebih: v.totalLapak > 0 ? (v.totalLebih / v.totalLapak) * 100 : 0,
  })).sort((a, b) => b.totalSusut - a.totalSusut)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kendali timbangan"
        title="Analisis Penyusutan Timbangan"
        description="Pantau susut dan lebih timbangan per lapak, per SKU, dan per gudang."
        actions={(
          <>
            <MonthYearFilter selectedBulan={selectedBulan} selectedTahun={selectedTahun} />
            <Link
              href="/dashboard/manager"
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              Kembali ke Dashboard
            </Link>
          </>
        )}
      />

      <SusutLebihAnalytics
        lapakData={lapakSusutData}
        warehouseNames={warehouses.map(w => ({ id: w.id, nama: w.nama }))}
      />
    </div>
  )
}
