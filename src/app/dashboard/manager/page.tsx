import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { authOptions } from "@/lib/authOptions"
import ManagerAnalytics from "@/components/features/ManagerAnalytics"
import ManagerCalendar from "@/components/features/ManagerCalendar"
import TopLapakAnalytics from "@/components/features/TopLapakAnalytics"
import SusutLebihAnalytics from "@/components/features/SusutLebihAnalytics"
import ExpenseAnalytics from "@/components/features/ExpenseAnalytics"
import DpSummaryAnalytics from "@/components/features/DpSummaryAnalytics"
import { redirect } from "next/navigation"
import PendingTerminAlerts from "@/components/features/PendingTerminAlerts"
import MonthYearFilter from "@/components/features/MonthYearFilter"
import { isWorkingDay } from "@/lib/workingDays"

export default async function ManagerDashboard({
  searchParams
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>
}) {
  const { bulan: qBulan, tahun: qTahun } = await searchParams
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  // ──────────────────────────────────────────
  // Date calculations (scoped from query filters)
  // ──────────────────────────────────────────
  const nowUtc = new Date()
  const now = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000) // Shifted to GMT+7 (WIB)
  const selectedBulan = qBulan ? parseInt(qBulan) : now.getUTCMonth() + 1
  const selectedTahun = qTahun ? parseInt(qTahun) : now.getUTCFullYear()

  const isCurrentMonth = selectedBulan === (now.getUTCMonth() + 1) && selectedTahun === now.getUTCFullYear()
  const baseDate = isCurrentMonth ? now : new Date(Date.UTC(selectedTahun, selectedBulan - 1, 1, 12, 0, 0) + 7 * 60 * 60 * 1000)

  const localYear = baseDate.getUTCFullYear()
  const localMonth = baseDate.getUTCMonth()
  const localDate = baseDate.getUTCDate()

  // Start/End of daily target (00:00 WIB is 17:00 UTC of previous day)
  const todayStart = new Date(Date.UTC(localYear, localMonth, localDate, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Start/End of weekly target
  const dayOfWeek = baseDate.getUTCDay() === 0 ? 6 : baseDate.getUTCDay() - 1
  const weekStart = new Date(Date.UTC(localYear, localMonth, localDate - dayOfWeek, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const weekEnd   = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Start/End of monthly target
  const monthStart = new Date(Date.UTC(selectedTahun, selectedBulan - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const monthEnd   = new Date(Date.UTC(selectedTahun, selectedBulan, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const twelveMonthsAgo = new Date(Date.UTC(selectedTahun, selectedBulan - 12, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)

  // Cek apakah hari ini adalah hari kerja (hanya untuk current month view)
  const todayDateObj = new Date(Date.UTC(localYear, localMonth, localDate))
  const isWorkingToday = isWorkingDay(todayDateObj)

  const rawPendingTermins = await prisma.purchase.findMany({
    where: { status_pelunasan: "BELUM_LUNAS" },
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
      nama: p.supplier?.nama || "Supplier Terhapus"
    }
  }))

  // ──────────────────────────────────────────
  // 1. Quick stats
  // ──────────────────────────────────────────
  const totalTonaseThisMonthData = await prisma.purchaseItem.aggregate({
    _sum: { berat_final_item: true },
    where: {
      purchase: {
        status_approval: { in: ["menunggu_double_cek", "menunggu_approval_harga", "approved", "sudah_transfer"] },
        createdAt: { gte: monthStart, lt: monthEnd }
      }
    }
  })
  const totalTonase = (totalTonaseThisMonthData._sum.berat_final_item || 0) / 1000

  const waitingApprovalHarga = await prisma.purchase.count({
    where: { status_approval: "menunggu_approval_harga" }
  })
  const waitingApprovalDP = await prisma.downPayment.count({
    where: { status_approval: "menunggu_approval_manager" }
  })

  // ──────────────────────────────────────────
  // 2. Recent audit logs
  // ──────────────────────────────────────────
  const recentLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: true }
  })

  // ──────────────────────────────────────────
  // 3. Warehouses & targets (filtered by selected month/year)
  // ──────────────────────────────────────────
  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })
  const targets = await prisma.warehouseTarget.findMany({
    where: {
      bulan: selectedBulan,
      tahun: selectedTahun,
    }
  })

  // ──────────────────────────────────────────
  // 5. Valid purchases (12 months) for all analytics
  // ──────────────────────────────────────────
  const validPurchases = await prisma.purchase.findMany({
    where: {
      status_approval: { in: ["menunggu_double_cek", "menunggu_approval_harga", "approved", "sudah_transfer"] },
      createdAt: { gte: twelveMonthsAgo, lt: monthEnd }
    },
    include: {
      items: true,
      supplier: true,
      warehouse: true
    }
  })

  // ──────────────────────────────────────────
  // 6. Build ManagerAnalytics dataMap AND Expense Metrics
  // ──────────────────────────────────────────
  const dataMap: Record<string, any> = {}
  const warehouseExpenses = []
  const globalExpenses = { harian: 0, mingguan: 0, bulanan: 0 }

  for (const w of warehouses) {
    const target    = targets.find(t => t.warehouseId === w.id)
    const wPurchases = validPurchases.filter(p => p.warehouseId === w.id)

    // Pengeluaran (Expenses) calculation
    const getExpense = (p: any) => p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0
    const expHarian = wPurchases.filter(p => p.createdAt >= todayStart && p.createdAt < todayEnd).reduce((s, p) => s + getExpense(p), 0)
    const expMingguan = wPurchases.filter(p => p.createdAt >= weekStart && p.createdAt < weekEnd).reduce((s, p) => s + getExpense(p), 0)
    const expBulanan = wPurchases.filter(p => p.createdAt >= monthStart && p.createdAt < monthEnd).reduce((s, p) => s + getExpense(p), 0)
    
    warehouseExpenses.push({ id: w.id, nama: w.nama, expenses: { harian: expHarian, mingguan: expMingguan, bulanan: expBulanan } })
    globalExpenses.harian += expHarian
    globalExpenses.mingguan += expMingguan
    globalExpenses.bulanan += expBulanan

    const actual_harian   = wPurchases.filter(p => p.createdAt >= todayStart && p.createdAt < todayEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
    const actual_mingguan = wPurchases.filter(p => p.createdAt >= weekStart && p.createdAt < weekEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
    const actual_bulanan  = wPurchases.filter(p => p.createdAt >= monthStart && p.createdAt < monthEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)

    const yearlyData: { label: string; weight: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d      = new Date(selectedTahun, selectedBulan - 1 - i, 1)
      const label  = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
      const mStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
      const mEnd   = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
      const weight = wPurchases.filter(p => p.createdAt >= mStart && p.createdAt < mEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
      yearlyData.push({ label, weight })
    }

    // ── Per-day data for the selected month ──────────────────
    const daysInMonth = new Date(Date.UTC(selectedTahun, selectedBulan, 0)).getUTCDate()
    const dailyData: { label: string; weight: number; target: number }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dStart = new Date(Date.UTC(selectedTahun, selectedBulan - 1, d, 0, 0, 0) - 7 * 60 * 60 * 1000)
      const dEnd   = new Date(dStart.getTime() + 24 * 60 * 60 * 1000)
      const weight = wPurchases.filter(p => p.createdAt >= dStart && p.createdAt < dEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
      dailyData.push({ label: `${d}`, weight, target: target?.target_harian_kg || 0 })
    }

    // ── Per-week data (last 8 weeks) ──────────────────────────
    const weeklyData: { label: string; weight: number; target: number }[] = []
    for (let w8 = 7; w8 >= 0; w8--) {
      const wkStart = new Date(weekStart.getTime() - w8 * 7 * 24 * 60 * 60 * 1000)
      const wkEnd   = new Date(wkStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      const wkLabel = new Date(wkStart.getTime() + 7 * 60 * 60 * 1000) // shift back to WIB for display
      const wNum = `${wkLabel.getUTCDate()}/${wkLabel.getUTCMonth() + 1}`
      const weight = wPurchases.filter(p => p.createdAt >= wkStart && p.createdAt < wkEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
      weeklyData.push({ label: `Mg ${wNum}`, weight, target: target?.target_mingguan_kg || 0 })
    }

    dataMap[w.id] = {
      id: w.id,
      nama: w.nama,
      target_harian: target?.target_harian_kg || 0,
      target_mingguan: target?.target_mingguan_kg || 0,
      target_bulanan: target?.target_bulanan_kg || 0,
      actual_harian,
      actual_mingguan,
      actual_bulanan,
      yearlyData,
      dailyData,
      weeklyData,
    }
  }

  const monthlyPurchases = validPurchases.filter(p => p.createdAt >= monthStart && p.createdAt < monthEnd)

  // ──────────────────────────────────────────
  // 7. Calendar data: per-day aggregation (selected month)
  // ──────────────────────────────────────────
  const calendarMap: Record<string, { totalKg: number; totalTransaksi: number; warehouses: Record<string, number> }> = {}

  for (const purchase of monthlyPurchases) {
    const localDateObj = new Date(purchase.createdAt.getTime() + 7 * 60 * 60 * 1000)
    const dateKey = localDateObj.toISOString().slice(0, 10)
    if (!calendarMap[dateKey]) {
      calendarMap[dateKey] = { totalKg: 0, totalTransaksi: 0, warehouses: {} }
    }
    const entry = calendarMap[dateKey]
    entry.totalTransaksi += 1
    const kg = purchase.items.reduce((s, i) => s + (i.berat_final_item || 0), 0)
    entry.totalKg += kg
    const wName = purchase.warehouse?.nama || "Lainnya"
    entry.warehouses[wName] = (entry.warehouses[wName] || 0) + kg
  }

  const calendarData = Object.entries(calendarMap).map(([date, val]) => ({
    date,
    totalKg: val.totalKg,
    totalTransaksi: val.totalTransaksi,
    warehouses: Object.entries(val.warehouses).map(([nama, kg]) => ({ nama, kg }))
  }))

  // Global sum harian target (for calendar indicator)
  const totalTargetHarian = targets.reduce((s, t) => s + t.target_harian_kg, 0)

  // ──────────────────────────────────────────
  // 8. Top 10 Lapak per warehouse (selected month)
  // ──────────────────────────────────────────
  const warehouseTopData = warehouses.map(w => {
    const wPurchases = validPurchases.filter(p => p.warehouseId === w.id && p.createdAt >= monthStart && p.createdAt < monthEnd)

    // Aggregate per supplier
    const supplierMap: Record<string, { nama: string; totalKg: number; totalNilai: number; totalItems: number; transaksi: number }> = {}
    for (const p of wPurchases) {
      const sid  = p.supplierId
      const nama = p.supplier?.nama || "Unknown"
      if (!supplierMap[sid]) supplierMap[sid] = { nama, totalKg: 0, totalNilai: 0, totalItems: 0, transaksi: 0 }
      const entry = supplierMap[sid]
      entry.transaksi += 1
      for (const item of p.items) {
        entry.totalKg    += item.berat_final_item || 0
        entry.totalNilai += item.subtotal || 0
        entry.totalItems += 1
      }
    }

    const supplierArr = Object.entries(supplierMap).map(([supplierId, v]) => ({
      supplierId,
      nama: v.nama,
      totalKg: v.totalKg,
      avgHarga: v.totalKg > 0 ? v.totalNilai / v.totalKg : 0,
      transaksi: v.transaksi
    }))

    const topByVolume = [...supplierArr].sort((a, b) => b.totalKg - a.totalKg).slice(0, 10)
    const topByHarga  = [...supplierArr].sort((a, b) => b.avgHarga - a.avgHarga).slice(0, 10)

    return {
      warehouseId: w.id,
      warehouseName: w.nama,
      topByVolume,
      topByHarga
    }
  })

  // ──────────────────────────────────────────
  // 10. Susut & Lebih Timbangan per Lapak (selected month)
  // ──────────────────────────────────────────
  // Hanya transaksi yang sudah melewati double-check (ada berat_timbangan_gudang)
  const susutLebihMap: Record<string, {
    nama: string
    warehouseId: string
    warehouseName: string
    totalLapak: number
    totalGudang: number
    totalSusut: number   // akumulasi selisih negatif (gudang < lapak)
    totalLebih: number   // akumulasi selisih positif (gudang > lapak)
    transaksi: number
    detailTransaksi: any[]
  }> = {}

  for (const p of monthlyPurchases) {
    // Hanya jika ada kedua data timbangan
    const lapak = p.berat_timbangan_lapak
    const gudang = p.berat_timbangan_gudang
    if (!lapak || !gudang) continue

    const sid = p.supplierId
    const wh = warehouses.find(w => w.id === p.warehouseId)
    if (!susutLebihMap[sid]) {
      susutLebihMap[sid] = {
        nama: p.supplier?.nama || "Unknown",
        warehouseId: p.warehouseId,
        warehouseName: wh?.nama || "—",
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

  const susutSummaryTotalLapak = lapakSusutData.reduce((s, d) => s + d.totalLapak, 0)
  const susutSummaryTotalGudang = lapakSusutData.reduce((s, d) => s + d.totalGudang, 0)
  const susutSummaryTotalSusut = lapakSusutData.reduce((s, d) => s + d.totalSusut, 0)
  const susutSummaryTotalLebih = lapakSusutData.reduce((s, d) => s + d.totalLebih, 0)

  const susutLebihSummary = {
    totalLapakAll: susutSummaryTotalLapak,
    totalGudangAll: susutSummaryTotalGudang,
    totalSusutAll: susutSummaryTotalSusut,
    totalLebihAll: susutSummaryTotalLebih,
    totalSelisihBersih: susutSummaryTotalGudang - susutSummaryTotalLapak,
    pctSusutAll: susutSummaryTotalLapak > 0 ? (susutSummaryTotalSusut / susutSummaryTotalLapak) * 100 : 0,
    pctLebihAll: susutSummaryTotalLapak > 0 ? (susutSummaryTotalLebih / susutSummaryTotalLapak) * 100 : 0,
    transaksiDenganData: lapakSusutData.reduce((s, d) => s + d.transaksi, 0),
  }

  // ──────────────────────────────────────────
  // 11. Rekap DP & Kasbon per Lapak
  // ──────────────────────────────────────────
  const approvedDps = await prisma.downPayment.findMany({
    where: {
      status_approval: "approved"
    },
    include: {
      supplier: {
        include: {
          warehouse: true
        }
      }
    }
  })

  const dpSummaryMap: Record<string, {
    supplierId: string
    namaLapak: string
    warehouseId: string
    warehouseName: string
    totalDp: number
    totalUsed: number
    sisaDp: number
    transaksiDp: number
  }> = {}

  for (const dp of approvedDps) {
    if (!dp.supplier) continue
    const sid = dp.supplierId
    const wId = dp.supplier.warehouseId || "none"
    const wName = dp.supplier.warehouse?.nama || "—"
    
    if (!dpSummaryMap[sid]) {
      dpSummaryMap[sid] = {
        supplierId: sid,
        namaLapak: dp.supplier.nama,
        warehouseId: wId,
        warehouseName: wName,
        totalDp: 0,
        totalUsed: 0,
        sisaDp: 0,
        transaksiDp: 0
      }
    }
    const entry = dpSummaryMap[sid]
    entry.totalDp += dp.nominal_disetujui || 0
    entry.totalUsed += dp.dp_used_amount || 0
    entry.sisaDp += dp.sisa_dp || 0
    entry.transaksiDp += 1
  }

  const dpSummaryData = Object.values(dpSummaryMap).sort((a, b) => b.sisaDp - a.sisaDp)

  // ──────────────────────────────────────────
  // 9. SKU Average Prices by Spec (Gabyuk / Grading) per Warehouse / Collection Center
  // ──────────────────────────────────────────
  const skuPricesMap: Record<string, {
    sku_name: string
    gabyuk_avg: number
    gabyuk_kg: number
    grading_avg: number
    grading_kg: number
    all_avg: number
    all_kg: number
  }[]> = {}

  // 1) Global ("all")
  const globalSkuSpecMap: Record<string, {
    gabyuk_kg: number; gabyuk_val: number;
    grading_kg: number; grading_val: number;
    all_kg: number; all_val: number
  }> = {}

  for (const p of monthlyPurchases) {
    for (const item of p.items) {
      const sku = item.sku_name
      if (!globalSkuSpecMap[sku]) {
        globalSkuSpecMap[sku] = { gabyuk_kg: 0, gabyuk_val: 0, grading_kg: 0, grading_val: 0, all_kg: 0, all_val: 0 }
      }
      const kg = item.berat_final_item || 0
      const val = item.subtotal || 0
      const spec = (item.spec || "").toLowerCase()
      globalSkuSpecMap[sku].all_kg += kg
      globalSkuSpecMap[sku].all_val += val
      if (spec === "gabyuk") {
        globalSkuSpecMap[sku].gabyuk_kg += kg
        globalSkuSpecMap[sku].gabyuk_val += val
      } else if (spec === "grading") {
        globalSkuSpecMap[sku].grading_kg += kg
        globalSkuSpecMap[sku].grading_val += val
      }
    }
  }

  skuPricesMap["all"] = Object.entries(globalSkuSpecMap)
    .map(([sku_name, v]) => ({
      sku_name,
      gabyuk_avg: v.gabyuk_kg > 0 ? v.gabyuk_val / v.gabyuk_kg : 0,
      gabyuk_kg: v.gabyuk_kg,
      grading_avg: v.grading_kg > 0 ? v.grading_val / v.grading_kg : 0,
      grading_kg: v.grading_kg,
      all_avg: v.all_kg > 0 ? v.all_val / v.all_kg : 0,
      all_kg: v.all_kg
    }))
    .sort((a, b) => a.sku_name.localeCompare(b.sku_name))

  // 2) Per Warehouse
  for (const w of warehouses) {
    const wPurchases = monthlyPurchases.filter(p => p.warehouseId === w.id)
    const wSkuSpecMap: Record<string, {
      gabyuk_kg: number; gabyuk_val: number;
      grading_kg: number; grading_val: number;
      all_kg: number; all_val: number
    }> = {}

    for (const p of wPurchases) {
      for (const item of p.items) {
        const sku = item.sku_name
        if (!wSkuSpecMap[sku]) {
          wSkuSpecMap[sku] = { gabyuk_kg: 0, gabyuk_val: 0, grading_kg: 0, grading_val: 0, all_kg: 0, all_val: 0 }
        }
        const kg = item.berat_final_item || 0
        const val = item.subtotal || 0
        const spec = (item.spec || "").toLowerCase()
        wSkuSpecMap[sku].all_kg += kg
        wSkuSpecMap[sku].all_val += val
        if (spec === "gabyuk") {
          wSkuSpecMap[sku].gabyuk_kg += kg
          wSkuSpecMap[sku].gabyuk_val += val
        } else if (spec === "grading") {
          wSkuSpecMap[sku].grading_kg += kg
          wSkuSpecMap[sku].grading_val += val
        }
      }
    }

    skuPricesMap[w.id] = Object.entries(wSkuSpecMap)
      .map(([sku_name, v]) => ({
        sku_name,
        gabyuk_avg: v.gabyuk_kg > 0 ? v.gabyuk_val / v.gabyuk_kg : 0,
        gabyuk_kg: v.gabyuk_kg,
        grading_avg: v.grading_kg > 0 ? v.grading_val / v.grading_kg : 0,
        grading_kg: v.grading_kg,
        all_avg: v.all_kg > 0 ? v.all_val / v.all_kg : 0,
        all_kg: v.all_kg
      }))
      .sort((a, b) => a.sku_name.localeCompare(b.sku_name))
  }

  const missedTargetWarehouses = warehouses
    .map(w => {
      const data = dataMap[w.id]
      return {
        nama: w.nama,
        target: data?.target_harian || 0,
        actual: data?.actual_harian || 0,
        kekurangan: Math.max((data?.target_harian || 0) - (data?.actual_harian || 0), 0)
      }
    })
    .filter(w => w.target > 0 && w.kekurangan > 0)

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PendingTerminAlerts initialAlerts={pendingTermins} />

      {/* Alert target harian: hanya tampil di hari kerja */}
      {isCurrentMonth && isWorkingToday && missedTargetWarehouses.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 border-b border-rose-200 pb-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-500 shrink-0 animate-pulse">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider">Laporan Target Harian Belum Tercapai</h3>
              <p className="text-xs text-rose-600 font-medium">Ada {missedTargetWarehouses.length} Collection Center yang belum mencapai target harian hari ini</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missedTargetWarehouses.map((w, index) => {
              const pct = w.target > 0 ? (w.actual / w.target) * 100 : 0
              return (
                <div key={index} className="bg-white border border-rose-100 p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-slate-800">{w.nama}</span>
                    <span className="text-xs font-bold text-rose-600 px-2.5 py-0.5 bg-rose-50 rounded-full">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Realisasi: <strong>{(w.actual / 1000).toFixed(2)} Ton</strong> dari target <strong>{(w.target / 1000).toFixed(2)} Ton</strong> (Kurang <strong className="text-rose-650 text-rose-600">{(w.kekurangan / 1000).toFixed(2)} Ton</strong>)
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800">Analitik &amp; Overview</h2>
            <MonthYearFilter selectedBulan={selectedBulan} selectedTahun={selectedTahun} />
          </div>
          <p className="text-slate-500 text-sm mt-1">Pantau performa pembelian PET recycle secara real-time.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Link
            href="/dashboard/manager/reports"
            className="flex-1 md:flex-initial bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-cyan-500/10 transition-all flex items-center justify-center gap-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-100 group-hover:text-white">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Rekap Laporan
          </Link>
          <Link
            href="/dashboard/manager/sku-prices"
            className="flex-1 md:flex-initial bg-white border border-slate-200 text-slate-700 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-cyan-500">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Harga Standar SKU
          </Link>
          <a
            href={`/api/manager/export?bulan=${selectedBulan}&tahun=${selectedTahun}`}
            className="flex-1 md:flex-initial bg-white border border-slate-200 text-slate-700 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-cyan-500">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Export Laporan Excel
          </a>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-cyan-100 font-medium text-sm uppercase tracking-wider mb-1">Total Tonase (Seluruh Gudang)</h3>
            <div className="text-4xl font-extrabold">{totalTonase.toFixed(2)} <span className="text-xl font-medium text-cyan-200">Ton</span></div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M4 14V20H20V14H4ZM2 14C2 12.8954 2.89543 12 4 12H20C21.1046 12 22 12.8954 22 14V20C22 21.1046 21.1046 22 20 22H4C2.89543 22 2 21.1046 2 20V14ZM4 4V10H20V4H4ZM2 4C2 2.89543 2.89543 2 4 2H20C21.1046 2 22 2.89543 22 4V10C22 11.1046 21.1046 12 20 12H4C2.89543 12 2 11.1046 2 10V4Z"/></svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wider mb-1">Menunggu Approval Harga</h3>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-extrabold text-orange-600">{waitingApprovalHarga}</div>
            <Link href="/dashboard/manager/approval-harga" className="text-sm font-medium mb-1 border-b border-orange-200 text-orange-500 pb-0.5 cursor-pointer hover:text-orange-700 transition-colors">
              Lihat detail →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wider mb-1">Menunggu Approval DP</h3>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-extrabold text-indigo-600">{waitingApprovalDP}</div>
            <Link href="/dashboard/manager/approval-dp" className="text-sm font-medium mb-1 border-b border-indigo-200 text-indigo-500 pb-0.5 cursor-pointer hover:text-indigo-700 transition-colors">
              Lihat detail →
            </Link>
          </div>
        </div>
      </div>

      {/* Pengeluaran Analytics */}
      <ExpenseAnalytics globalExpenses={globalExpenses} warehouseExpenses={warehouseExpenses} />

      {/* Target vs Realisasi Charts */}
      <ManagerAnalytics warehouses={warehouses} dataMap={dataMap} skuPricesMap={skuPricesMap} />


      {/* Calendar + Top Lapak (side by side on large screens) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ManagerCalendar calendarData={calendarData} targetHarian={totalTargetHarian} />
        <div className="space-y-4">
          {/* Placeholder so Top Lapak fills the right column on xl */}
        </div>
      </div>

      {/* Top 10 Lapak full width */}
      <TopLapakAnalytics warehouseTopData={warehouseTopData} />

      {/* Susut & Lebih Timbangan per Lapak */}
      <SusutLebihAnalytics
        lapakData={lapakSusutData}
        summary={susutLebihSummary}
        warehouseNames={warehouses.map(w => ({ id: w.id, nama: w.nama }))}
      />

      {/* Rekap Saldo DP & Kasbon per Lapak */}
      <DpSummaryAnalytics
        dpData={dpSummaryData}
        warehouseNames={warehouses.map(w => ({ id: w.id, nama: w.nama }))}
      />

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Aktivitas Terbaru</h3>
          <p className="text-xs text-slate-500">Log audit seluruh gudang</p>
        </div>
        <div className="p-2 max-h-[300px] overflow-auto">
          {recentLogs.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">Belum ada aktivitas.</div>
          ) : (
            <ul className="space-y-1">
              {recentLogs.map(log => (
                <li key={log.id} className="p-4 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded uppercase">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</span>
                  </div>
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{log.user.nama}</span> melakukan perubahan pada <span className="font-mono text-xs">{log.table_name}</span>.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
