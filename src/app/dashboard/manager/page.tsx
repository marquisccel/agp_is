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
import { ACTIVE_PURCHASE_STATUSES } from "@/lib/purchaseStatus"

const formatActivityAction = (action: string) => {
  const actionMap: Record<string, { label: string; description: string; tone: string }> = {
    CREATE_DRAFT: {
      label: "Draft transaksi dibuat",
      description: "membuat draft transaksi pembelian baru",
      tone: "bg-sky-50 text-sky-700 border-sky-100",
    },
    SUPERVISOR_VERIFY_PURCHASE: {
      label: "Pembelian diverifikasi",
      description: "memverifikasi transaksi pembelian",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    MANAGER_APPROVE_PRICE: {
      label: "Harga disetujui",
      description: "menyetujui harga pembelian",
      tone: "bg-teal-50 text-teal-700 border-teal-100",
    },
    MANAGER_REJECT_PRICE: {
      label: "Harga ditolak",
      description: "menolak pengajuan harga pembelian",
      tone: "bg-rose-50 text-rose-700 border-rose-100",
    },
    APPROVE_DP: {
      label: "DP disetujui",
      description: "menyetujui pengajuan DP lapak",
      tone: "bg-violet-50 text-violet-700 border-violet-100",
    },
    REJECT_DP: {
      label: "DP ditolak",
      description: "menolak pengajuan DP lapak",
      tone: "bg-rose-50 text-rose-700 border-rose-100",
    },
    FORWARD_DP: {
      label: "DP diteruskan",
      description: "meneruskan pengajuan DP ke manager",
      tone: "bg-orange-50 text-orange-700 border-orange-100",
    },
  }

  if (actionMap[action]) return actionMap[action]

  const readable = action
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  return {
    label: readable || "Aktivitas sistem",
    description: "memperbarui data operasional",
    tone: "bg-slate-50 text-slate-700 border-slate-100",
  }
}

const formatActivityScope = (tableName: string) => {
  const scopeMap: Record<string, string> = {
    Purchase: "Transaksi pembelian",
    PurchaseItem: "Item pembelian",
    DownPayment: "DP lapak",
    Supplier: "Data lapak",
    Warehouse: "Collection Center",
    WarehouseTarget: "Target gudang",
  }

  return scopeMap[tableName] || "Operasional"
}

const getGreeting = (date: Date) => {
  const hour = date.getUTCHours()

  if (hour >= 4 && hour < 11) return "Selamat pagi"
  if (hour >= 11 && hour < 15) return "Selamat siang"
  if (hour >= 15 && hour < 18) return "Selamat sore"
  return "Selamat malam"
}

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
  const displayName = session.user.name || "Manager"

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
  const calendarAnchor =
    selectedTahun * 12 + selectedBulan >= now.getUTCFullYear() * 12 + (now.getUTCMonth() + 1)
      ? { bulan: selectedBulan, tahun: selectedTahun }
      : { bulan: now.getUTCMonth() + 1, tahun: now.getUTCFullYear() }
  const calendarStart = new Date(Date.UTC(calendarAnchor.tahun, calendarAnchor.bulan - 12, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const calendarEnd = new Date(Date.UTC(calendarAnchor.tahun, calendarAnchor.bulan, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const trendMonths = Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(Date.UTC(selectedTahun, selectedBulan - 12 + idx, 1))
    return { bulan: d.getUTCMonth() + 1, tahun: d.getUTCFullYear() }
  })

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
      nama: p.supplier?.nama || "Lapak Terhapus"
    }
  }))

  // ──────────────────────────────────────────
  // 1. Quick stats
  // ──────────────────────────────────────────
  const totalTonaseThisMonthData = await prisma.purchaseItem.aggregate({
    _sum: { berat_final_item: true },
    where: {
      purchase: {
        status_approval: { in: ACTIVE_PURCHASE_STATUSES },
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
  const latestTargets = await prisma.warehouseTarget.findMany({
    orderBy: [
      { tahun: "desc" },
      { bulan: "desc" },
      { updatedAt: "desc" },
    ],
  })
  const latestTargetMap = new Map<string, (typeof latestTargets)[number]>()
  for (const target of latestTargets) {
    if (!latestTargetMap.has(target.warehouseId)) {
      latestTargetMap.set(target.warehouseId, target)
    }
  }
  const trendTargets = await prisma.warehouseTarget.findMany({
    where: {
      OR: trendMonths.map(({ bulan, tahun }) => ({ bulan, tahun }))
    }
  })
  const trendTargetMap = new Map(
    trendTargets.map(t => [`${t.warehouseId}-${t.tahun}-${t.bulan}`, t])
  )

  // ──────────────────────────────────────────
  // 5. Valid purchases (12 months) for all analytics
  // ──────────────────────────────────────────
  const validPurchases = await prisma.purchase.findMany({
    where: {
      status_approval: { in: ACTIVE_PURCHASE_STATUSES },
      createdAt: { gte: twelveMonthsAgo, lt: monthEnd }
    },
    include: {
      items: true,
      supplier: true,
      warehouse: true
    }
  })

  const calendarPurchases = await prisma.purchase.findMany({
    where: {
      status_approval: { in: ACTIVE_PURCHASE_STATUSES },
      createdAt: { gte: calendarStart, lt: calendarEnd }
    },
    include: {
      items: true,
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
    const fallbackTarget = latestTargetMap.get(w.id)
    const displayTarget = target || fallbackTarget
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

    const yearlyData: { label: string; weight: number; target: number | null }[] = []
    for (let i = 11; i >= 0; i--) {
      const d      = new Date(selectedTahun, selectedBulan - 1 - i, 1)
      const label  = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
      const mStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
      const mEnd   = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
      const weight = wPurchases.filter(p => p.createdAt >= mStart && p.createdAt < mEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
      const monthlyTarget = trendTargetMap.get(`${w.id}-${d.getFullYear()}-${d.getMonth() + 1}`)?.target_bulanan_kg || 0
      yearlyData.push({ label, weight, target: monthlyTarget > 0 ? monthlyTarget : null })
    }

    // ── Per-day data for the selected month ──────────────────
    const daysInMonth = new Date(Date.UTC(selectedTahun, selectedBulan, 0)).getUTCDate()
    const dailyData: { label: string; weight: number; target: number }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dStart = new Date(Date.UTC(selectedTahun, selectedBulan - 1, d, 0, 0, 0) - 7 * 60 * 60 * 1000)
      const dEnd   = new Date(dStart.getTime() + 24 * 60 * 60 * 1000)
      const weight = wPurchases.filter(p => p.createdAt >= dStart && p.createdAt < dEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
      dailyData.push({ label: `${d}`, weight, target: displayTarget?.target_harian_kg || 0 })
    }

    // ── Per-week data (last 8 weeks) ──────────────────────────
    const weeklyData: { label: string; weight: number; target: number }[] = []
    for (let w8 = 7; w8 >= 0; w8--) {
      const wkStart = new Date(weekStart.getTime() - w8 * 7 * 24 * 60 * 60 * 1000)
      const wkEnd   = new Date(wkStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      const wkLabel = new Date(wkStart.getTime() + 7 * 60 * 60 * 1000) // shift back to WIB for display
      const wNum = `${wkLabel.getUTCDate()}/${wkLabel.getUTCMonth() + 1}`
      const weight = wPurchases.filter(p => p.createdAt >= wkStart && p.createdAt < wkEnd).flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
      weeklyData.push({ label: `Mg ${wNum}`, weight, target: displayTarget?.target_mingguan_kg || 0 })
    }

    dataMap[w.id] = {
      id: w.id,
      nama: w.nama,
      target_harian: displayTarget?.target_harian_kg || 0,
      target_mingguan: displayTarget?.target_mingguan_kg || 0,
      target_bulanan: displayTarget?.target_bulanan_kg || 0,
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

  for (const purchase of calendarPurchases) {
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
  const totalTargetHarian = Object.values(dataMap).reduce((s, d: any) => s + (d.target_harian || 0), 0)

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
    const wName = dp.supplier.warehouse?.nama || "-"
    
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
      <section className="page-hero border border-white/70 p-7 md:p-9">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">
              Agrapana Greenworks Polymer Information System
            </p>
            <h2 className="mt-3 max-w-4xl whitespace-nowrap text-3xl font-semibold leading-none tracking-[-0.04em] text-slate-950 md:text-[2.65rem] xl:text-[3.05rem]">
              {getGreeting(now)}, <span className="font-black">{displayName}</span>.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
              Pantau tonase, target, approval, dan risiko seluruh Collection Center dalam satu tampilan kerja.
            </p>
          </div>
          <div className="w-full rounded-[26px] border border-slate-200/80 bg-white/72 p-4 shadow-sm backdrop-blur-xl xl:w-[540px]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Periode Laporan</p>
                <p className="mt-1 text-xs text-slate-400">Kontrol data dashboard</p>
              </div>
              <MonthYearFilter selectedBulan={selectedBulan} selectedTahun={selectedTahun} />
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              <Link
                href="/dashboard/manager/reports"
                className="premium-button bg-slate-950 text-white hover:bg-slate-800 px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 group whitespace-nowrap"
              >
                Rekap Laporan
              </Link>
              <Link
                href="/dashboard/manager/sku-prices"
                className="premium-button bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50 px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 group whitespace-nowrap"
              >
                Harga Standar SKU
              </Link>
              <a
                href={`/api/manager/export?bulan=${selectedBulan}&tahun=${selectedTahun}`}
                className="premium-button bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50 px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 group whitespace-nowrap"
              >
                Export Excel
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="premium-metric group relative isolate overflow-hidden rounded-[28px] border border-teal-900/10 bg-gradient-to-br from-[#05736c] via-[#08796f] to-[#0b5c72] p-5 text-white shadow-[0_18px_48px_rgba(6,95,70,0.16)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-950/20">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(255,255,255,0.22),transparent_36%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.32),transparent_28%)] opacity-70 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:opacity-100" />
          <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-70 transition-opacity duration-700 group-hover:opacity-100" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-teal-50/80">Total Tonase Bulan Ini</h3>
              <p className="mt-1 text-xs text-teal-50/72">Akumulasi seluruh Collection Center</p>
            </div>
            <span className="rounded-full border border-white/20 bg-white/20 px-2.5 py-1 text-[10px] font-black text-teal-50 shadow-sm backdrop-blur transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-white/25">Live</span>
          </div>
          <div className="premium-number inline-flex origin-left items-end gap-2 will-change-transform">
            <span className="text-4xl font-black leading-none tracking-[-0.06em] text-white">{totalTonase.toFixed(2)}</span>
            <span className="mb-1 text-sm font-bold text-teal-50/75">Ton</span>
          </div>
        </div>

        <div className="interactive-surface group relative overflow-hidden rounded-[28px] border border-slate-200/80 p-5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-amber-200/90">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,255,255,0)_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative mb-3 flex items-start gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase text-slate-500">Approval Harga</h3>
                <p className="mt-1 text-xs text-slate-400">Transaksi menunggu keputusan harga</p>
              </div>
            </div>
          </div>
          <div className="relative flex items-end justify-between gap-3">
            <div>
              <div className="premium-number inline-block origin-left text-3xl font-black text-slate-950 will-change-transform">{waitingApprovalHarga}</div>
              <p className="mt-1 text-xs font-semibold text-slate-400">item pending</p>
            </div>
            <Link href="/dashboard/manager/approval-harga" className="premium-button mb-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800">
              Lihat detail
            </Link>
          </div>
        </div>

        <div className="interactive-surface group relative overflow-hidden rounded-[28px] border border-slate-200/80 p-5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-sky-200/90">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,0)_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative mb-3 flex items-start gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7h-9" />
                  <path d="M14 17H5" />
                  <circle cx="17" cy="17" r="3" />
                  <circle cx="7" cy="7" r="3" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase text-slate-500">Approval DP</h3>
                <p className="mt-1 text-xs text-slate-400">Pengajuan kasbon menunggu validasi</p>
              </div>
            </div>
          </div>
          <div className="relative flex items-end justify-between gap-3">
            <div>
              <div className="premium-number inline-block origin-left text-3xl font-black text-slate-950 will-change-transform">{waitingApprovalDP}</div>
              <p className="mt-1 text-xs font-semibold text-slate-400">item pending</p>
            </div>
            <Link href="/dashboard/manager/approval-dp" className="premium-button mb-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800">
              Lihat detail
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
        <ManagerCalendar
          key={`${selectedTahun}-${selectedBulan}`}
          calendarData={calendarData}
          targetHarian={totalTargetHarian}
          selectedBulan={selectedBulan}
          selectedTahun={selectedTahun}
        />
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
      <div className="interactive-surface overflow-hidden border border-slate-200/80">
        <div className="border-b border-slate-100 bg-slate-50/60 p-5">
          <span className="text-xs font-bold uppercase text-teal-700">Operational feed</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-950">Aktivitas Terbaru</h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{recentLogs.length} aktivitas</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Aktivitas paling baru dan jejak operasional terakhir.</p>
        </div>
        <div className="p-5">
          {recentLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">Belum ada aktivitas.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden grid-cols-[220px_minmax(0,1fr)_180px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase text-slate-500 sm:grid">
                <span>Aktivitas</span>
                <span>Detail</span>
                <span />
              </div>
              <ul className="max-h-[320px] divide-y divide-slate-100 overflow-auto bg-white">
              {recentLogs.map(log => {
                const activity = formatActivityAction(log.action)
                const scope = formatActivityScope(log.table_name)

                return (
                <li key={log.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:grid-cols-[220px_minmax(0,1fr)_180px] sm:items-center">
                  <div className="min-w-0">
                    <span className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-[11px] font-bold ${activity.tone}`}>
                      {activity.label}
                    </span>
                    <p className="mt-2 text-xs font-semibold text-slate-400 sm:hidden">{scope}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm leading-6 text-slate-700">
                      <span className="font-bold text-slate-950">{log.user.nama}</span> {activity.description}.
                    </p>
                    <p className="mt-1 hidden text-xs font-semibold text-slate-400 sm:block">{scope}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 sm:text-right">{new Date(log.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
                )
              })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
