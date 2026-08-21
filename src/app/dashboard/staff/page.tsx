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

  // Calculate this week's range (Monday to Sunday)
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

  const rentangMinggu = `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })} - ${new Date(weekEnd.getTime() - 1).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}`
  const namaBulan = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })

  // Ketiga target mengukur hal yang sama pada jendela waktu berbeda, jadi
  // dirakit dari satu bentuk data dan dirender oleh satu potong markup.
  const kartuTarget = [
    { kunci: 'harian',   label: 'Target Hari Ini',  rentang: namaGudang,     realisasi: beratHariIni,   target: targetHarian,   progres: progressHarian,   kurang: kekuranganHarian,   libur: !isWorkingToday },
    { kunci: 'mingguan', label: 'Target Minggu Ini', rentang: rentangMinggu,  realisasi: beratMingguIni, target: targetMingguan, progres: progressMingguan, kurang: kekuranganMingguan, libur: false },
    { kunci: 'bulanan',  label: 'Target Bulan Ini',  rentang: namaBulan,      realisasi: beratBulanIni,  target: targetBulanan,  progres: progressBulanan,  kurang: kekuranganBulanan,  libur: false },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Banner Hari Libur */}
      {!isWorkingToday && (
        <div className="notice tone-info animate-in fade-in duration-200">
          <span className="notice-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
          </span>
          <div>
            <h3 className="notice-title">Hari Libur / Tidak Ada Target Harian</h3>
            <p className="notice-body">
              Hari ini hari libur (Minggu atau libur nasional), jadi tidak ada target harian yang perlu dikejar.
            </p>
            <p className="notice-foot">Selamat beristirahat. Target mingguan tetap berjalan.</p>
          </div>
        </div>
      )}

      {/* Alert mitigasi: hanya tampil di hari kerja */}
      {isWorkingToday && targetHarian > 0 && kekuranganHarian > 0 && (
        <div className="notice tone-warning animate-in fade-in duration-200">
          <span className="notice-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <div>
            <h3 className="notice-title">Mitigasi Pencapaian Target</h3>
            <p className="notice-body">
              Target harian belum tercapai, kurang <strong>{fmtTon(kekuranganHarian)}</strong> lagi.
            </p>
            <p className="notice-foot">
              Maksimalkan pengambilan dan koordinasi supplier besok agar target mingguan ({fmtTon(targetMingguan)}) tetap aman.
            </p>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Operational input"
        title="Input Pembelian PET"
        description={`Kelola transaksi pembelian dan target harian untuk ${namaGudang}.`}
      />

      {/* Target harian / mingguan / bulanan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kartuTarget.map((t) => {
          const tercapai = t.target > 0 && t.kurang === 0
          return (
            <div key={t.kunci} className="goal-card interactive-surface">
              <div className="goal-head">
                <div>
                  <p className="goal-label">{t.label}</p>
                  <p className="goal-range">{t.rentang}</p>
                </div>
                {t.libur ? (
                  <span className="goal-chip">Libur</span>
                ) : t.target > 0 ? (
                  <span className={`goal-chip ${tercapai ? 'ok' : 'warn'}`}>
                    {tercapai ? 'Tercapai' : `${t.progres.toFixed(0)}%`}
                  </span>
                ) : (
                  <span className="goal-chip">Belum diset</span>
                )}
              </div>

              {t.libur ? (
                <p className="goal-foot">Tidak ada target hari ini karena hari libur.</p>
              ) : (
                <>
                  <div className="goal-value">
                    <b>{fmtTon(t.realisasi)}</b>
                    <span>/ {t.target > 0 ? fmtTon(t.target) : '-'}</span>
                  </div>
                  <div className="goal-track">
                    <i className={tercapai ? 'done' : undefined} style={{ width: `${t.progres}%` }} />
                  </div>
                  {t.target > 0 ? (
                    tercapai ? (
                      <p className="goal-foot ok">Target sudah tercapai.</p>
                    ) : (
                      <p className="goal-foot">Kurang <strong>{fmtTon(t.kurang)}</strong> lagi</p>
                    )
                  ) : (
                    <p className="goal-foot empty">Target belum diset oleh Manager</p>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* H-1 Pickup Reminders */}
      <PickupReminders suppliers={suppliers} />

      {/* Outstanding Kasbon Recap */}
      <RemainingKasbonList />

      {/* Input Form */}
      <div className="section">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Transaksi</span>
            <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Input Transaksi Baru</h2>
          </div>
          <p className="text-xs" style={{ color: "var(--muted-faint)" }}>Disimpan sebagai draft untuk diverifikasi Supervisor gudang.</p>
        </div>
        <div className="mt-5" />
        <PurchaseForm suppliers={suppliers} namaGudang={namaGudang} />
      </div>
    </div>
  )
}
