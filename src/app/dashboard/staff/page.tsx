import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import PurchaseForm from "@/components/features/PurchaseForm"
import PickupReminders from "@/components/features/PickupReminders"
import RemainingKasbonList from "@/components/features/RemainingKasbonList"
import { fmtTon } from "@/lib/format"
import { redirect } from "next/navigation"
import { isWorkingDay } from "@/lib/workingDays"
import { ACTIVE_PURCHASE_STATUSES } from "@/lib/purchaseStatus"
import { isOperationalRole } from "@/lib/roles"
import PageHeader from "@/components/ui/PageHeader"

export default async function StaffDashboard() {
  const session = await getServerSession(authOptions)
  if (!session || !isOperationalRole(session.user.role)) {
    redirect("/login")
  }

  const warehouseId = session.user.warehouseId

  // Only fetch suppliers that belong to this staff's warehouse
  const suppliers = await prisma.supplier.findMany({
    where: { warehouseId: warehouseId ?? undefined },
    orderBy: { nama: 'asc' }
  })

  // Calculate today's range in GMT+7 (WIB)
  const nowUtc = new Date()
  const now = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000) // Shifted to GMT+7 (WIB)

  const localYear = now.getUTCFullYear()
  const localMonth = now.getUTCMonth()
  const localDate = now.getUTCDate()

  // Cek apakah hari ini adalah hari kerja (bukan Minggu / libur nasional)
  const todayDateObj = new Date(Date.UTC(localYear, localMonth, localDate))
  const isWorkingToday = isWorkingDay(todayDateObj)

  // Calculate today's range (00:00 WIB is 17:00 UTC of previous day)
  const todayStart = new Date(Date.UTC(localYear, localMonth, localDate, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Calculate this week's range (Monday–Sunday)
  const dayOfWeek = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1
  const weekStart = new Date(Date.UTC(localYear, localMonth, localDate - dayOfWeek, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Calculate this month's range
  const monthStart = new Date(Date.UTC(localYear, localMonth, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)
  const monthEnd = new Date(Date.UTC(localYear, localMonth + 1, 1, 0, 0, 0) - 7 * 60 * 60 * 1000)

  const target = warehouseId ? await prisma.warehouseTarget.findFirst({
    where: {
      warehouseId,
      bulan: localMonth + 1,
      tahun: localYear,
    }
  }) : null

  const todayAgg = warehouseId ? await prisma.purchaseItem.aggregate({
    _sum: { berat_final_item: true },
    where: { purchase: { warehouseId, status_approval: { in: ACTIVE_PURCHASE_STATUSES }, createdAt: { gte: todayStart, lt: todayEnd } } }
  }) : null

  const weekAgg = warehouseId ? await prisma.purchaseItem.aggregate({
    _sum: { berat_final_item: true },
    where: { purchase: { warehouseId, status_approval: { in: ACTIVE_PURCHASE_STATUSES }, createdAt: { gte: weekStart, lt: weekEnd } } }
  }) : null

  const monthAgg = warehouseId ? await prisma.purchaseItem.aggregate({
    _sum: { berat_final_item: true },
    where: { purchase: { warehouseId, status_approval: { in: ACTIVE_PURCHASE_STATUSES }, createdAt: { gte: monthStart, lt: monthEnd } } }
  }) : null

  const beratHariIni   = todayAgg?._sum.berat_final_item || 0
  const beratMingguIni = weekAgg?._sum.berat_final_item  || 0
  const beratBulanIni  = monthAgg?._sum.berat_final_item || 0
  const targetHarian   = target?.target_harian_kg   || 0
  const targetMingguan = target?.target_mingguan_kg || 0
  const targetBulanan  = target?.target_bulanan_kg  || 0

  const progressHarian   = targetHarian   > 0 ? Math.min((beratHariIni   / targetHarian)   * 100, 100) : 0
  const progressMingguan = targetMingguan > 0 ? Math.min((beratMingguIni / targetMingguan) * 100, 100) : 0
  const progressBulanan  = targetBulanan  > 0 ? Math.min((beratBulanIni  / targetBulanan)  * 100, 100) : 0
  const kekuranganHarian   = Math.max(targetHarian   - beratHariIni,   0)
  const kekuranganMingguan = Math.max(targetMingguan - beratMingguIni, 0)
  const kekuranganBulanan  = Math.max(targetBulanan  - beratBulanIni,  0)

  const warehouseInfo = warehouseId
    ? await prisma.warehouse.findUnique({ where: { id: warehouseId } })
    : null
  const namaGudang = warehouseInfo ? `Collection Center ${warehouseInfo.nama.replace(/^Gudang\s+/i, '')}` : "Gudang Anda"

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Banner Hari Libur */}
      {!isWorkingToday && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-3xl p-5 flex items-start gap-3.5 shadow-sm animate-in fade-in duration-200">
          <div className="p-2.5 bg-blue-100/70 border border-blue-200 text-blue-600 rounded-2xl shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Hari Libur / Tidak Ada Target Harian</h3>
            <p className="text-sm text-blue-700 font-medium mt-1">
              Hari ini adalah hari libur (Minggu atau libur nasional). Tidak ada target harian yang perlu dicapai.
            </p>
            <p className="text-xs text-slate-600 mt-1.5">Selamat beristirahat! Target mingguan tetap berjalan 🌟</p>
          </div>
        </div>
      )}

      {/* Alert mitigasi: hanya tampil di hari kerja */}
      {isWorkingToday && targetHarian > 0 && kekuranganHarian > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-3xl p-5 space-y-3.5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-100/70 border border-amber-200 text-amber-600 rounded-2xl shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Mitigasi Pencapaian Target</h3>
              <p className="text-sm text-amber-700 font-semibold mt-1">
                Target harian hari ini belum tercapai! Kurang <strong className="font-extrabold">{fmtTon(kekuranganHarian)}</strong> lagi.
              </p>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Harap maksimalkan pengambilan barang, koordinasi supplier, dan transaksi di hari esok agar target mingguan Anda (<strong className="font-bold text-slate-700">{fmtTon(targetMingguan)}</strong>) tetap aman dan tercapai tepat waktu. Mari maksimalkan ikhtiar besok! 💪🔥
              </p>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Operational input"
        title="Input Pembelian PET"
        description={`Kelola transaksi pembelian dan target harian untuk ${namaGudang}.`}
      />

      {/* Target Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Harian */}
        <div className="interactive-surface bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Hari Ini</p>
              <p className="text-sm text-slate-400 mt-0.5">{namaGudang}</p>
            </div>
            {isWorkingToday ? (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${progressHarian >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'}`}>
                {progressHarian >= 100 ? '✓ Tercapai' : `${progressHarian.toFixed(0)}%`}
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">🏖️ Libur</span>
            )}
          </div>

          {isWorkingToday ? (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-extrabold text-slate-900">{fmtTon(beratHariIni)}</span>
                <span className="text-slate-400 text-sm mb-1">/ {targetHarian > 0 ? fmtTon(targetHarian) : '—'}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ${progressHarian >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                  style={{ width: `${progressHarian}%` }}
                />
              </div>
              {targetHarian > 0 ? (
                kekuranganHarian > 0 ? (
                  <p className="text-sm text-orange-600 font-medium">
                    ⚠ Kurang <strong>{fmtTon(kekuranganHarian)}</strong> untuk capai target hari ini
                  </p>
                ) : (
                  <p className="text-sm text-emerald-600 font-medium">🎉 Target harian sudah tercapai!</p>
                )
              ) : (
                <p className="text-xs text-slate-400 italic">Target belum diset oleh Manager</p>
              )}
            </>
          ) : (
            <p className="text-sm text-blue-600 font-medium mt-4">🏖️ Tidak ada target hari ini (hari libur)</p>
          )}
        </div>

        {/* Mingguan */}
        <div className="interactive-surface bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Minggu Ini</p>
              <p className="text-sm text-slate-400 mt-0.5">
                {weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })} – {new Date(weekEnd.getTime()-1).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${progressMingguan >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-50 text-violet-600'}`}>
              {progressMingguan >= 100 ? '✓ Tercapai' : `${progressMingguan.toFixed(0)}%`}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-900">{fmtTon(beratMingguIni)}</span>
            <span className="text-slate-400 text-sm mb-1">/ {targetMingguan > 0 ? fmtTon(targetMingguan) : '—'}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${progressMingguan >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`}
              style={{ width: `${progressMingguan}%` }}
            />
          </div>
          {targetMingguan > 0 ? (
            kekuranganMingguan > 0 ? (
              <p className="text-sm text-violet-600 font-medium">
                ⚠ Kurang <strong>{fmtTon(kekuranganMingguan)}</strong> untuk capai target minggu ini
              </p>
            ) : (
              <p className="text-sm text-emerald-600 font-medium">🎉 Target mingguan sudah tercapai!</p>
            )
          ) : (
            <p className="text-xs text-slate-400 italic">Target belum diset oleh Manager</p>
          )}
        </div>

        {/* Bulanan */}
        <div className="interactive-surface bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Bulan Ini</p>
              <p className="text-sm text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${progressBulanan >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600'}`}>
              {progressBulanan >= 100 ? '✓ Tercapai' : `${progressBulanan.toFixed(0)}%`}
            </span>
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-extrabold text-slate-900">{fmtTon(beratBulanIni)}</span>
            <span className="text-slate-400 text-sm mb-1">/ {targetBulanan > 0 ? fmtTon(targetBulanan) : '—'}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
            <div
              className={`h-2.5 rounded-full transition-all duration-700 ${progressBulanan >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
              style={{ width: `${progressBulanan}%` }}
            />
          </div>

          {targetBulanan > 0 ? (
            kekuranganBulanan > 0 ? (
              <p className="text-sm text-red-600 font-medium">
                ⚠ Kurang <strong>{fmtTon(kekuranganBulanan)}</strong> untuk capai target bulan ini
              </p>
            ) : (
              <p className="text-sm text-emerald-600 font-medium">🎉 Target bulanan sudah tercapai!</p>
            )
          ) : (
            <p className="text-xs text-slate-400 italic">Target belum diset oleh Manager</p>
          )}
        </div>
      </div>

      {/* H-1 Pickup Reminders */}
      <PickupReminders suppliers={suppliers} />

      {/* Outstanding Kasbon Recap */}
      <RemainingKasbonList />

      {/* Input Form */}
      <div className="interactive-surface bg-white rounded-lg p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Input Transaksi Baru</h2>
        <p className="text-slate-500 text-sm mb-6">Data akan disimpan sebagai draft untuk diverifikasi oleh Supervisor gudang.</p>
        <PurchaseForm suppliers={suppliers} namaGudang={namaGudang} />
      </div>
    </div>
  )
}
