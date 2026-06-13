import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"

// Helper formatters
function fmtRp(n: number) {
  return "Rp " + (n || 0).toLocaleString("id-ID")
}
function fmtKg(n: number) {
  return (n || 0).toLocaleString("id-ID") + " KG"
}
function fmtTon(n: number) {
  return ((n || 0) / 1000).toFixed(2) + " Ton"
}

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const { tahun: qTahun } = await searchParams
  const nowUtc = new Date()
  const now = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000) // Shifted to GMT+7 (WIB)
  const selectedTahun = qTahun ? parseInt(qTahun) : now.getUTCFullYear()

  // Date bounds for the entire selected year (WIB timezone start of year and next year)
  const yearStart = new Date(Date.UTC(selectedTahun, 0, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const yearEnd   = new Date(Date.UTC(selectedTahun + 1, 0, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)

  // 1. Fetch valid purchases for the year
  const purchases = await prisma.purchase.findMany({
    where: {
      status_approval: { in: ["approved", "sudah_transfer"] },
      createdAt: { gte: yearStart, lt: yearEnd },
    },
    include: {
      items: true,
      returs: true,
      warehouse: true,
    },
  })

  // 2. Fetch targets set for the year
  const targets = await prisma.warehouseTarget.findMany({
    where: { tahun: selectedTahun },
  })

  // 3. Fetch warehouses
  const warehouses = await prisma.warehouse.findMany({ orderBy: { nama: "asc" } })

  // 4. Calculate month-by-month performance (Months 1-12)
  const monthlyData = Array.from({ length: 12 }, (_, monthIdx) => {
    const bulan = monthIdx + 1
    const mStart = new Date(Date.UTC(selectedTahun, monthIdx, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
    const mEnd   = new Date(Date.UTC(selectedTahun, monthIdx + 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)

    // Filter purchases strictly in this month
    const mPurchases = purchases.filter(p => p.createdAt >= mStart && p.createdAt < mEnd)

    const totalKg = mPurchases.flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
    const totalSpent = mPurchases.reduce(
      (s, p) => s + (p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0),
      0
    )
    const avgPrice = totalKg > 0 ? totalSpent / totalKg : 0

    const totalReturKg = mPurchases.flatMap(p => p.returs).reduce((s, r) => s + (r.berat_retur || 0), 0)
    const totalReturRp = mPurchases.reduce((s, p) => s + (p.total_potongan_retur || 0), 0)

    // Targets set for this month
    const mTargets = targets.filter(t => t.bulan === bulan)
    const totalTarget = mTargets.reduce((s, t) => s + (t.target_bulanan_pet_final || t.target_bulanan_kg || 0), 0)

    const achievement = totalTarget > 0 ? (totalKg / totalTarget) * 100 : 0

    return {
      bulan,
      namaBulan: mStart.toLocaleDateString("id-ID", { month: "long", timeZone: "Asia/Jakarta" }),
      totalKg,
      totalSpent,
      avgPrice,
      totalReturKg,
      totalReturRp,
      totalTarget,
      achievement,
    }
  })

  // 5. YTD Aggregates
  const ytdKg = monthlyData.reduce((s, m) => s + m.totalKg, 0)
  const ytdSpent = monthlyData.reduce((s, m) => s + m.totalSpent, 0)
  const ytdAvgPrice = ytdKg > 0 ? ytdSpent / ytdKg : 0

  const monthsWithTargets = monthlyData.filter(m => m.totalTarget > 0)
  const ytdAvgAchievement =
    monthsWithTargets.length > 0
      ? monthsWithTargets.reduce((s, m) => s + m.achievement, 0) / monthsWithTargets.length
      : 0

  // 6. CC Year Contribution Breakdown
  const ccContributions = warehouses.map(w => {
    const wPurchases = purchases.filter(p => p.warehouseId === w.id)
    const totalKg = wPurchases.flatMap(p => p.items).reduce((s, i) => s + (i.berat_final_item || 0), 0)
    const totalSpent = wPurchases.reduce(
      (s, p) => s + (p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0),
      0
    )
    const pctContribution = ytdKg > 0 ? (totalKg / ytdKg) * 100 : 0
    return {
      nama: w.nama,
      totalKg,
      totalSpent,
      pctContribution,
    }
  }).sort((a, b) => b.totalKg - a.totalKg)

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Header section (hidden on print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Rekap Laporan Performa</h2>
          <p className="text-slate-500 text-sm mt-1">
            Analisis performa realisasi target bulanan dan tahunan seluruh CC.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Year selector form */}
          <form method="GET" className="flex items-center gap-2 flex-1 sm:flex-initial">
            <select
              name="tahun"
              defaultValue={selectedTahun}
              // @ts-ignore
              onChange={e => e.target.form.submit()}
              className="w-full sm:w-auto border border-slate-200 rounded-xl px-4 py-2 bg-white text-slate-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const y = now.getFullYear() - 2 + i
                return (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                )
              })}
            </select>
          </form>

          <button
            // @ts-ignore
            onClick={() => window.print()}
            className="bg-white border border-slate-200 text-slate-700 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Cetak Laporan
          </button>

          <Link href="/dashboard/manager">
            <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all">
              ← Dashboard
            </button>
          </Link>
        </div>
      </div>

      {/* Print Title Header (Visible on print only) */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-xl font-bold text-slate-900 uppercase">REKAPITULASI LAPORAN TAHUNAN PET RECYCLE</h1>
        <p className="text-sm text-slate-600 mt-1">Periode Penilaian: Januari – Desember {selectedTahun}</p>
        <p className="text-xs text-slate-400 mt-0.5">Dicetak pada: {new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p>
      </div>

      {/* YTD Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3">
        {/* Tonase YTD */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tonase YTD</span>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{fmtTon(ytdKg)}</div>
          <div className="text-xs text-slate-500 mt-1">{fmtKg(ytdKg)}</div>
        </div>

        {/* Belanja YTD */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Belanja YTD</span>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{fmtRp(ytdSpent)}</div>
          <div className="text-xs text-slate-500 mt-1">Pengeluaran Pembelian PET</div>
        </div>

        {/* Avg Price */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Harga Rata-rata / kg</span>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{fmtRp(ytdAvgPrice)}</div>
          <div className="text-xs text-slate-500 mt-1">Biaya Per-kilogram YTD</div>
        </div>

        {/* Avg Achievement */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Target YTD</span>
          <div className={`text-2xl font-black mt-1.5 ${ytdAvgAchievement >= 100 ? 'text-emerald-600' : 'text-cyan-600'}`}>
            {ytdAvgAchievement.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Pencapaian CC Terhadap Target</div>
        </div>
      </div>

      {/* Monthly Recap Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:border-slate-300">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 print:px-4 print:py-2">
          <h3 className="font-bold text-slate-800 text-base">Rincian Performa Bulanan ({selectedTahun})</h3>
          <p className="text-xs text-slate-400 print:hidden">Breakdown tonase, pengeluaran belanja, target dan tingkat pencapaian.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm print:text-[11px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 print:bg-slate-200">
                <th className="py-3 px-6 print:py-2 print:px-4">Bulan</th>
                <th className="py-3 px-6 text-right print:py-2 print:px-4">Realisasi (KG)</th>
                <th className="py-3 px-6 text-right print:py-2 print:px-4">Total Belanja</th>
                <th className="py-3 px-6 text-right print:py-2 print:px-4">Harga Avg /kg</th>
                <th className="py-3 px-6 text-right print:py-2 print:px-4">Target (KG)</th>
                <th className="py-3 px-6 text-center print:py-2 print:px-4">Pencapaian (%)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(m => {
                const isTargetSet = m.totalTarget > 0
                return (
                  <tr key={m.bulan} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-800 print:py-2 print:px-4">{m.namaBulan}</td>
                    <td className="py-3.5 px-6 text-right text-slate-700 font-mono print:py-2 print:px-4">{fmtKg(m.totalKg)}</td>
                    <td className="py-3.5 px-6 text-right text-slate-700 font-mono print:py-2 print:px-4">{fmtRp(m.totalSpent)}</td>
                    <td className="py-3.5 px-6 text-right text-slate-500 font-mono print:py-2 print:px-4">{fmtRp(m.avgPrice)}</td>
                    <td className="py-3.5 px-6 text-right text-slate-500 font-mono print:py-2 print:px-4">
                      {isTargetSet ? fmtKg(m.totalTarget) : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-center print:py-2 print:px-4">
                      {isTargetSet ? (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold print:p-0 ${
                          m.achievement >= 100
                            ? 'bg-emerald-100 text-emerald-800 print:text-emerald-700'
                            : m.achievement >= 50
                            ? 'bg-amber-100 text-amber-800 print:text-amber-700'
                            : 'bg-rose-100 text-rose-800 print:text-rose-700'
                        }`}>
                          {m.achievement.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Side-by-Side: CC Contributions Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1 print:gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:border-slate-300 print:p-4">
          <h3 className="font-bold text-slate-800 text-base mb-1">Kontribusi Collection Center (YTD)</h3>
          <p className="text-xs text-slate-400 mb-6 print:hidden">Urutan CC dengan kontribusi pasokan bahan baku PET terbesar tahun ini.</p>
          
          <div className="space-y-4">
            {ccContributions.map((cc, i) => (
              <div key={cc.nama} className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    {cc.nama}
                  </span>
                  <span className="text-slate-800">
                    {fmtTon(cc.totalKg)} <span className="text-xs font-medium text-slate-400">({cc.pctContribution.toFixed(1)}%)</span>
                  </span>
                </div>
                {/* Visual contribution bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    style={{ width: `${cc.pctContribution}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Volume: {fmtKg(cc.totalKg)}</span>
                  <span>Belanja: {fmtRp(cc.totalSpent)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes & Approval section (highly formal for print recaps) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between print:border-slate-300 print:p-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base mb-4">Catatan Laporan</h3>
            <p className="text-slate-500 text-xs leading-relaxed space-y-2">
              Laporan ini merangkum seluruh transaksi pembelian PET Recycle yang telah disetujui (Approved) dan sudah ditransfer. Target bulanan yang tercantum adalah akumulasi target seluruh CC untuk masing-masing periode.
            </p>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 space-y-4 print:mt-12 print:pt-4">
            <div className="text-xs text-center text-slate-400">
              Menyetujui &amp; Mengesahkan,
            </div>
            <div className="h-16 border-b border-slate-300 border-dashed w-3/4 mx-auto" />
            <div className="text-xs font-bold text-center text-slate-700">
              {session.user.name}
              <div className="text-[10px] text-slate-400 font-normal mt-0.5">Manager Operational PET</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
