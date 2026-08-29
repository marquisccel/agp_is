import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { authOptions } from "@/lib/authOptions"
import ManagerAnalytics, { type WarehouseData } from "@/components/features/ManagerAnalytics"
import ManagerCalendar from "@/components/features/ManagerCalendar"
import TopLapakAnalytics from "@/components/features/TopLapakAnalytics"
import SusutLebihAnalytics, { type TransaksiSusutDetail } from "@/components/features/SusutLebihAnalytics"
import ExpenseAnalytics from "@/components/features/ExpenseAnalytics"
import DpSummaryAnalytics from "@/components/features/DpSummaryAnalytics"
import RekapAmbilKirimAnalytics from "@/components/features/RekapAmbilKirimAnalytics"
import { redirect } from "next/navigation"
import PendingTerminAlerts from "@/components/features/PendingTerminAlerts"
import MonthYearFilter from "@/components/features/MonthYearFilter"
import { isWorkingDay } from "@/lib/workingDays"
import { ACTIVE_PURCHASE_STATUSES } from "@/lib/purchaseStatus"
import { fmtRp } from "@/lib/format"
import { getAuditAction } from "@/lib/auditLabels"
import TautanRincian from "@/components/ui/TautanRincian"

const formatActivityScope = (tableName: string) => {
  const scopeMap: Record<string, string> = {
    Purchase: "Transaksi pembelian",
    PurchaseItem: "Item pembelian",
    DownPayment: "DP lapak",
    Supplier: "Data lapak",
    Warehouse: "Gudang",
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
  const dataMap: Record<string, WarehouseData> = {}
  const warehouseExpenses = []
  const globalExpenses = { harian: 0, mingguan: 0, bulanan: 0 }

  for (const w of warehouses) {
    const target    = targets.find(t => t.warehouseId === w.id)
    const fallbackTarget = latestTargetMap.get(w.id)
    const displayTarget = target || fallbackTarget
    const wPurchases = validPurchases.filter(p => p.warehouseId === w.id)

    // Pengeluaran (Expenses) calculation
    const getExpense = (p: (typeof validPurchases)[number]) => p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0
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
  // 6b. Delta bulan lalu (untuk stat strip) -- validPurchases sudah
  // mencakup 12 bulan ke belakang, jadi bulan sebelumnya selalu ada
  // di dalam rentang tanpa perlu query tambahan.
  // ──────────────────────────────────────────
  const prevMonthStart = new Date(Date.UTC(selectedTahun, selectedBulan - 2, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const prevMonthEnd = monthStart
  const prevMonthPurchases = validPurchases.filter(p => p.createdAt >= prevMonthStart && p.createdAt < prevMonthEnd)
  const prevMonthTonase = prevMonthPurchases.flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0) / 1000
  const getExpenseValue = (p: (typeof validPurchases)[number]) => p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0
  const prevMonthExpense = prevMonthPurchases.reduce((s, p) => s + getExpenseValue(p), 0)
  const tonaseDeltaPct = prevMonthTonase > 0 ? ((totalTonase - prevMonthTonase) / prevMonthTonase) * 100 : null
  const expenseDeltaPct = prevMonthExpense > 0 ? ((globalExpenses.bulanan - prevMonthExpense) / prevMonthExpense) * 100 : null

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
  // 8b. Rekap Ambil / Kirim per gudang (bulan terpilih)
  // Transaksi yang tercatat sebelum field jenis_pengambilan ada bernilai
  // null -- sengaja TIDAK ditebak, cuma dihitung sebagai "belum dicatat".
  // ──────────────────────────────────────────
  const rekapAmbilKirim = warehouses.map(w => {
    const wPurchases = monthlyPurchases.filter(p => p.warehouseId === w.id)
    const beratOf = (p: (typeof monthlyPurchases)[number]) =>
      p.items.reduce((s, i) => s + (i.berat_final_item || 0), 0)

    const ambil = wPurchases.filter(p => p.jenis_pengambilan === "AMBIL")
    const kirim = wPurchases.filter(p => p.jenis_pengambilan === "KIRIM")
    const belumDicatat = wPurchases.filter(p => p.jenis_pengambilan !== "AMBIL" && p.jenis_pengambilan !== "KIRIM")

    return {
      warehouseId: w.id,
      warehouseName: w.nama,
      ambilTransaksi: ambil.length,
      ambilVolume: ambil.reduce((s, p) => s + beratOf(p), 0),
      kirimTransaksi: kirim.length,
      kirimVolume: kirim.reduce((s, p) => s + beratOf(p), 0),
      belumDicatatTransaksi: belumDicatat.length,
      belumDicatatVolume: belumDicatat.reduce((s, p) => s + beratOf(p), 0),
    }
  })

  // Porsi ambil bulan lalu -- dipakai kartu Rekap Ambil/Kirim untuk
  // menjawab "efektivitas armada membaik atau menurun?", bukan cuma
  // memotret kondisi bulan ini. null kalau bulan lalu belum ada data
  // yang jenis pengambilannya tercatat (jangan dibandingkan ke nol).
  const beratPurchase = (p: (typeof validPurchases)[number]) =>
    p.items.reduce((s, i) => s + (i.berat_final_item || 0), 0)
  const prevAmbilVolume = prevMonthPurchases
    .filter(p => p.jenis_pengambilan === "AMBIL")
    .reduce((s, p) => s + beratPurchase(p), 0)
  const prevKirimVolume = prevMonthPurchases
    .filter(p => p.jenis_pengambilan === "KIRIM")
    .reduce((s, p) => s + beratPurchase(p), 0)
  const prevTercatat = prevAmbilVolume + prevKirimVolume
  const prevAmbilPct = prevTercatat > 0 ? (prevAmbilVolume / prevTercatat) * 100 : null

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
    detailTransaksi: TransaksiSusutDetail[]
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
  // 9. Rata-rata harga SKU per spesifikasi (Gabyuk / Grading) per gudang
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

      {/*
        Hari libur: panel target harian di bawah ini memang tidak
        ditampilkan, karena tidak ada target yang perlu dikejar. Dulu ia
        hanya lenyap tanpa keterangan apa pun, sehingga terbaca seperti
        panelnya rusak. Layar Staff sudah menjelaskannya sejak awal; di
        sini keterangannya tidak pernah ada.
      */}
      {isCurrentMonth && !isWorkingToday && (
        <div className="notice tone-info">
          <div className="notice-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <p className="notice-title">Hari libur · tidak ada target harian</p>
            <p className="notice-body">
              Hari ini Minggu atau libur nasional, jadi tidak ada target harian yang dikejar dan laporan pencapaian
              harian tidak ditampilkan. Target mingguan dan bulanan tetap berjalan.
            </p>
          </div>
        </div>
      )}

      {/* Alert target harian: hanya tampil di hari kerja */}
      {isCurrentMonth && isWorkingToday && missedTargetWarehouses.length > 0 && (
        /* Kartunya bernada merah utuh, bukan putih dengan rel oranye di
           tepi. Ini satu-satunya pemberitahuan di dashboard yang menuntut
           tindakan hari itu juga -- kalau bentuknya sama dengan kartu lain,
           ia ikut tenggelam di antara panel-panel ringkasan. */
        <div
          className="animate-in fade-in space-y-4 rounded-[var(--radius-lg)] border p-5 duration-200"
          style={{ background: "var(--danger-soft)", borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)" }}
        >
          <div
            className="flex items-center gap-2.5 border-b pb-3"
            style={{ borderColor: "color-mix(in srgb, var(--danger) 22%, transparent)" }}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
              style={{ background: "var(--surface)", color: "var(--danger)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <div>
              <h3 className="field-label" style={{ color: "var(--danger)", marginBottom: 2 }}>Target Harian Belum Tercapai</h3>
              <p className="text-xs font-medium" style={{ color: "var(--danger)" }}>
                {missedTargetWarehouses.length} gudang belum mencapai target hari ini
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {missedTargetWarehouses.map((w, index) => {
              const pct = w.target > 0 ? (w.actual / w.target) * 100 : 0
              return (
                <div
                  key={index}
                  className="flex flex-col justify-between rounded-[var(--radius-md)] p-4"
                  style={{ background: "var(--surface)" }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{w.nama}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                      Baru <strong style={{ color: "var(--foreground)" }}>{(w.actual / 1000).toFixed(2)} ton</strong> dari{" "}
                      <strong style={{ color: "var(--foreground)" }}>{(w.target / 1000).toFixed(2)} ton</strong>
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-tint)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--danger)" }} />
                    </div>
                    <p className="text-xs font-bold" style={{ color: "var(--danger)" }}>
                      Kurang {(w.kekurangan / 1000).toFixed(2)} ton
                    </p>
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
            <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--brand-strong)" }}>
              Agrapana Greenworks Polymer Information System
            </p>
            <h2 className="mt-3 max-w-4xl whitespace-nowrap text-3xl font-semibold leading-none tracking-[-0.04em] text-slate-950 md:text-[2.65rem] xl:text-[3.05rem]">
              {getGreeting(now)}, <span className="font-black">{displayName}</span>.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
              Pantau tonase, target, approval, dan risiko seluruh gudang dalam satu tampilan kerja.
            </p>
          </div>
          <div className="section section-body w-full xl:w-[540px]">
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
                className="premium-button btn-primer flex items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold group"
              >
                Rekap Laporan
              </Link>
              <Link
                href="/dashboard/manager/sku-prices"
                className="premium-button btn-netral flex items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold group"
              >
                Harga Standar SKU
              </Link>
              <a
                href={`/api/manager/export?bulan=${selectedBulan}&tahun=${selectedTahun}`}
                className="premium-button btn-netral flex items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold group"
              >
                Export Excel
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="stat-strip">
        <div className="stat-tile">
          <span className="stat-label">Total Tonase Bulan Ini</span>
          <div className="stat-value-row">
            <span className="stat-value">{totalTonase.toFixed(2)}</span>
            <span className="stat-unit">Ton</span>
            {tonaseDeltaPct !== null && (
              <span className={`trend ${tonaseDeltaPct >= 0 ? "up" : "down"}`}>
                {Math.abs(tonaseDeltaPct).toFixed(1)}% {tonaseDeltaPct >= 0 ? "↗" : "↘"}
              </span>
            )}
          </div>
          <span className="stat-delta flat">
            {tonaseDeltaPct === null ? "Belum ada data bulan lalu" : "dibanding bulan lalu"}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Approval Harga</span>
          <div className="stat-value-row">
            <span className="stat-value">{waitingApprovalHarga}</span>
            <span className="stat-unit">item</span>
          </div>
          {waitingApprovalHarga > 0 ? (
            <span className="stat-delta pending">● menunggu keputusan</span>
          ) : (
            <span className="stat-delta flat">Semua sudah diputuskan</span>
          )}
          <Link href="/dashboard/manager/approval-harga" className="inline-flex min-h-[38px] items-center text-[11.5px] font-bold" style={{ color: "var(--brand-strong)" }}>
            Lihat detail →
          </Link>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Approval DP</span>
          <div className="stat-value-row">
            <span className="stat-value">{waitingApprovalDP}</span>
            <span className="stat-unit">item</span>
          </div>
          {waitingApprovalDP > 0 ? (
            <span className="stat-delta pending">● menunggu validasi</span>
          ) : (
            <span className="stat-delta flat">Semua sudah divalidasi</span>
          )}
          <Link href="/dashboard/manager/approval-dp" className="inline-flex min-h-[38px] items-center text-[11.5px] font-bold" style={{ color: "var(--brand-strong)" }}>
            Lihat detail →
          </Link>
        </div>

        <div className="stat-tile">
          <span className="stat-label">Pengeluaran Bulan Ini</span>
          <div className="stat-value-row">
            <span className="stat-value">{fmtRp(globalExpenses.bulanan)}</span>
            {expenseDeltaPct !== null && (
              /* Pengeluaran naik itu kabar buruk, jadi panah naik sengaja
                 diberi warna danger -- kebalikan dari metrik tonase. */
              <span className={`trend ${expenseDeltaPct > 0 ? "down" : "up"}`}>
                {Math.abs(expenseDeltaPct).toFixed(1)}% {expenseDeltaPct >= 0 ? "↗" : "↘"}
              </span>
            )}
          </div>
          <span className="stat-delta flat">
            {expenseDeltaPct === null ? "Belum ada data bulan lalu" : "dibanding bulan lalu"}
          </span>
        </div>
      </div>

      {/* Pengeluaran Analytics */}
      <ExpenseAnalytics warehouseExpenses={warehouseExpenses} />

      {/* Target vs Realisasi Charts */}
      <ManagerAnalytics warehouses={warehouses} dataMap={dataMap} skuPricesMap={skuPricesMap} />


      {/* Calendar + Top Lapak (side by side on large screens) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ManagerCalendar
          key={`${selectedTahun}-${selectedBulan}`}
          calendarData={calendarData}
          selectedBulan={selectedBulan}
          selectedTahun={selectedTahun}
        />
        <RekapAmbilKirimAnalytics data={rekapAmbilKirim} prevAmbilPct={prevAmbilPct} />
      </div>

      {/* Top 10 Lapak -- tidak punya menu sendiri, jadi tetap di dashboard */}
      <TopLapakAnalytics warehouseTopData={warehouseTopData} />

      {/* Ringkasan Susut & Lebih -- rincian per lapak ada di menu Analisis Susut */}
      <SusutLebihAnalytics
        summaryOnly
        lapakData={lapakSusutData}
        warehouseNames={warehouses.map(w => ({ id: w.id, nama: w.nama }))}
      />

      {/* Ringkasan Saldo DP -- rincian per lapak ada di menu Rekap DP */}
      <DpSummaryAnalytics
        summaryOnly
        dpData={dpSummaryData}
        warehouseNames={warehouses.map(w => ({ id: w.id, nama: w.nama }))}
      />

      {/* Recent Activities */}
      <div className="section">
        <div className="section-shell-head">
          <div className="min-w-0">
            <p className="section-eyebrow">Operational feed</p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15.5px] font-bold text-slate-950">Aktivitas Terbaru</h3>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{recentLogs.length} aktivitas</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Aktivitas paling baru dan jejak operasional terakhir.</p>
          </div>
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
              <ul className="max-h-[320px] divide-y divide-[var(--border)] overflow-auto bg-white">
              {recentLogs.map(log => {
                const activity = getAuditAction(log.action)
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
        <TautanRincian href="/dashboard/manager/audit-trail">
          Buka Audit Trail lengkap
        </TautanRincian>
      </div>
    </div>
  )
}
