import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { Activity, CheckCircle2, Clock3, Download, FileWarning, ReceiptText } from "lucide-react"
import ReportYearSelect from "@/components/features/ReportYearSelect"
import PageHeader from "@/components/ui/PageHeader"
import PrintButton from "@/components/ui/PrintButton"
import { formatAuditAction } from "@/lib/auditLabels"

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
  searchParams: Promise<{ bulan?: string; tahun?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "MANAGER") {
    redirect("/login")
  }

  const { bulan: qBulan, tahun: qTahun } = await searchParams
  const nowUtc = new Date()
  const now = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000) // Shifted to GMT+7 (WIB)
  const selectedBulan = qBulan ? parseInt(qBulan) : now.getUTCMonth() + 1
  const selectedTahun = qTahun ? parseInt(qTahun) : now.getUTCFullYear()
  const selectedMonthStart = new Date(Date.UTC(selectedTahun, selectedBulan - 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const selectedMonthEnd = new Date(Date.UTC(selectedTahun, selectedBulan, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const selectedPeriodLabel = selectedMonthStart.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" })

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
  const periodAuditLogs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: selectedMonthStart, lt: selectedMonthEnd },
    },
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  })

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
  const periodPurchases = purchases.filter(p => p.createdAt >= selectedMonthStart && p.createdAt < selectedMonthEnd)
  const periodItems = periodPurchases.flatMap(p => p.items)
  const periodKg = periodItems.reduce((sum, item) => sum + (item.berat_final_item || 0), 0)
  const periodSpent = periodPurchases.reduce(
    (sum, p) => sum + (p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.total_nilai_sebelum_retur ?? 0),
    0
  )
  const periodAvgPrice = periodKg > 0 ? periodSpent / periodKg : 0
  const periodTarget = targets
    .filter(t => t.bulan === selectedBulan)
    .reduce((sum, t) => sum + (t.target_bulanan_pet_final || t.target_bulanan_kg || 0), 0)
  const periodAchievement = periodTarget > 0 ? (periodKg / periodTarget) * 100 : 0
  const transferredPurchases = periodPurchases.filter(p => p.status_approval === "sudah_transfer")
  const pendingTransferPurchases = periodPurchases.filter(p => p.status_approval === "approved")
  const openTerminPurchases = periodPurchases.filter(p => p.status_pelunasan === "BELUM_LUNAS" && (p.nominal_belum_lunas || 0) > 0)
  const missingProofPurchases = periodPurchases.filter(p => p.status_approval === "sudah_transfer" && !p.bukti_transfer)
  const reportIssueCount = pendingTransferPurchases.length + openTerminPurchases.length + missingProofPurchases.length
  const reportHealthLabel = reportIssueCount === 0 ? "Siap Review" : "Perlu Follow-up"
  const reportHealthDescription = reportIssueCount === 0
    ? "Tidak ada isu transfer, termin, atau bukti pada periode ini."
    : `${pendingTransferPurchases.length} menunggu transfer, ${openTerminPurchases.length} termin terbuka, ${missingProofPurchases.length} bukti kosong.`

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
      <div className="print:hidden">
        <PageHeader
          eyebrow="Executive report"
          title="Rekap Laporan Performa"
          description="Analisis performa realisasi target bulanan dan tahunan seluruh Collection Center."
          actions={(
            <>
              <ReportYearSelect
                selectedBulan={selectedBulan}
                selectedTahun={selectedTahun}
                years={Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)}
              />
              <Link
                href={`/api/manager/export?bulan=${selectedBulan}&tahun=${selectedTahun}`}
                className="premium-button flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Link>
              <PrintButton />
              <Link
                href="/dashboard/manager"
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
              >
                Kembali ke Dashboard
              </Link>
            </>
          )}
        />
      </div>

      {/* Print Title Header (Visible on print only) */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-xl font-bold text-slate-900 uppercase">REKAPITULASI LAPORAN PET RECYCLE</h1>
        <p className="text-sm text-slate-600 mt-1">Periode Penilaian: {selectedPeriodLabel}</p>
        <p className="text-xs text-slate-400 mt-0.5">Dicetak pada: {new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p>
      </div>

      {/* Executive Overview */}
      <section className="interactive-surface overflow-hidden border border-slate-200/80 bg-white print:hidden">
        <div className="grid gap-px bg-slate-100 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(180px,1fr))]">
          <div className="bg-slate-950 p-6 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Executive overview</p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">Laporan {selectedPeriodLabel}</h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-300">
              Ringkasan siap-review untuk performa tonase, target, pembayaran, dan kualitas data operasional.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black">
              <span className={`h-2 w-2 rounded-full ${reportIssueCount === 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
              {reportHealthLabel}
            </div>
          </div>

          <ExecutiveSignal label="Tonase Periode" value={fmtTon(periodKg)} description={`${fmtKg(periodKg)} pada periode aktif`} />
          <ExecutiveSignal label="Pencapaian Target" value={periodTarget > 0 ? `${periodAchievement.toFixed(1)}%` : "-"} description={periodTarget > 0 ? `${fmtKg(periodTarget)} target bulanan` : "Target belum diset"} />
          <ExecutiveSignal label="Health Note" value={reportIssueCount.toLocaleString("id-ID")} description={reportHealthDescription} />
        </div>
      </section>

      {/* YTD Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3">
        {/* Tonase Periode */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tonase Periode</span>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{fmtTon(periodKg)}</div>
          <div className="text-xs text-slate-500 mt-1">{fmtKg(periodKg)}</div>
        </div>

        {/* Belanja Periode */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Belanja Periode</span>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{fmtRp(periodSpent)}</div>
          <div className="text-xs text-slate-500 mt-1">Pengeluaran bulan aktif</div>
        </div>

        {/* Avg Price */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Harga Rata-rata / kg</span>
          <div className="text-2xl font-black text-slate-800 mt-1.5">{fmtRp(periodAvgPrice)}</div>
          <div className="text-xs text-slate-500 mt-1">Biaya per-kilogram periode</div>
        </div>

        {/* Period Achievement */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm print:p-4 print:border-slate-300">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Periode</span>
          <div className={`text-2xl font-black mt-1.5 ${periodAchievement >= 100 ? 'text-emerald-600' : 'text-cyan-600'}`}>
            {periodTarget > 0 ? `${periodAchievement.toFixed(1)}%` : "-"}
          </div>
          <div className="text-xs text-slate-500 mt-1">{periodTarget > 0 ? `${fmtKg(periodTarget)} target` : "Target belum diset"}</div>
        </div>
      </div>

      {/* Report Integrity Snapshot */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 print:grid-cols-4 print:gap-2">
        <ReportIntegrityCard
          icon={<ReceiptText className="h-4 w-4" />}
          label="Transaksi Valid"
          value={purchases.length.toLocaleString("id-ID")}
          description="Approved dan sudah transfer"
          tone="slate"
        />
        <ReportIntegrityCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Sudah Transfer"
          value={transferredPurchases.length.toLocaleString("id-ID")}
          description="Bukti pembayaran selesai"
          tone="emerald"
        />
        <ReportIntegrityCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Menunggu Transfer"
          value={pendingTransferPurchases.length.toLocaleString("id-ID")}
          description="Perlu follow-up admin"
          tone={pendingTransferPurchases.length > 0 ? "amber" : "slate"}
        />
        <ReportIntegrityCard
          icon={<FileWarning className="h-4 w-4" />}
          label="Data Perlu Cek"
          value={(openTerminPurchases.length + missingProofPurchases.length).toLocaleString("id-ID")}
          description={`${openTerminPurchases.length} termin, ${missingProofPurchases.length} bukti kosong`}
          tone={openTerminPurchases.length + missingProofPurchases.length > 0 ? "rose" : "slate"}
        />
      </div>

      {/* Period Audit Trail */}
      <div className="interactive-surface overflow-hidden border border-slate-200/80 bg-white print:hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">Audit trail</p>
            <h3 className="mt-1 text-base font-black text-slate-950">Aktivitas Periode {selectedPeriodLabel}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">Jejak perubahan penting yang masuk ke periode laporan.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
            {periodAuditLogs.length} aktivitas
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {periodAuditLogs.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm font-medium text-slate-400">
              Belum ada aktivitas audit pada periode ini.
            </div>
          ) : (
            periodAuditLogs.map(log => (
              <div key={log.id} className="grid gap-3 px-6 py-4 text-sm md:grid-cols-[minmax(180px,1fr)_minmax(180px,1.2fr)_minmax(140px,0.8fr)] md:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-black text-slate-950">{formatAuditAction(log.action)}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">{log.table_name}</p>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {log.user.nama} <span className="text-slate-300">/</span> {log.user.role}
                </div>
                <div className="font-mono text-xs font-semibold text-slate-400 md:text-right">
                  {log.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                </div>
              </div>
            ))
          )}
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
                      {isTargetSet ? fmtKg(m.totalTarget) : "-"}
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
                        <span className="text-slate-400 italic">-</span>
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

function ExecutiveSignal({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <div className="bg-white p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function ReportIntegrityCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  description: string
  tone: "slate" | "emerald" | "amber" | "rose"
}) {
  const toneClass = {
    slate: "bg-white text-slate-500 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  }[tone]

  return (
    <div className="interactive-surface flex items-center gap-4 border border-slate-200/80 bg-white p-4 print:shadow-none">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">{value}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{description}</p>
      </div>
    </div>
  )
}
