"use client"

import { useState, useMemo, useEffect } from "react"

// ─────────────────────────────────────────────────────
// Helper: format angka Indonesia (5000 → 5.000)
// ─────────────────────────────────────────────────────
export function fmtAngka(v: number, desimal = 0): string {
  return v.toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  })
}

export function fmtKgId(v: number): string {
  const ton = v / 1000
  const decimalPlaces = ton % 1 === 0 ? 0 : (ton % 0.1 === 0 ? 1 : 2)
  return `${fmtAngka(ton, decimalPlaces)} ton`
}

// ─────────────────────────────────────────────────────
// Hari Libur Nasional Indonesia 2024-2027
// ─────────────────────────────────────────────────────
const HARI_LIBUR: Record<string, string> = {
  // ── 2024 ──
  "2024-01-01": "Tahun Baru Masehi",
  "2024-02-08": "Isra Mikraj",
  "2024-02-10": "Tahun Baru Imlek",
  "2024-03-11": "Hari Raya Nyepi",
  "2024-03-29": "Wafat Isa Al-Masih",
  "2024-04-10": "Hari Raya Idul Fitri",
  "2024-04-11": "Hari Raya Idul Fitri 2",
  "2024-05-01": "Hari Buruh",
  "2024-05-09": "Kenaikan Isa Al-Masih",
  "2024-05-23": "Hari Raya Waisak",
  "2024-06-01": "Hari Lahir Pancasila",
  "2024-06-17": "Hari Raya Idul Adha",
  "2024-07-07": "Tahun Baru Islam 1446 H",
  "2024-08-17": "HUT Kemerdekaan RI",
  "2024-09-16": "Maulid Nabi Muhammad",
  "2024-12-25": "Hari Raya Natal",
  "2024-12-26": "Cuti Bersama Natal",

  // ── 2025 ──
  "2025-01-01": "Tahun Baru Masehi",
  "2025-01-27": "Isra Mikraj",
  "2025-01-28": "Tahun Baru Imlek",
  "2025-01-29": "Cuti Bersama Imlek",
  "2025-03-28": "Hari Raya Nyepi",
  "2025-03-31": "Cuti Bersama Idul Fitri",
  "2025-04-01": "Hari Raya Idul Fitri",
  "2025-04-02": "Hari Raya Idul Fitri 2",
  "2025-04-03": "Cuti Bersama Idul Fitri",
  "2025-04-04": "Cuti Bersama Idul Fitri",
  "2025-04-07": "Cuti Bersama Idul Fitri",
  "2025-04-18": "Wafat Isa Al-Masih",
  "2025-05-01": "Hari Buruh",
  "2025-05-12": "Kenaikan Isa Al-Masih",
  "2025-05-13": "Cuti Bersama Kenaikan",
  "2025-05-29": "Hari Raya Waisak",
  "2025-06-01": "Hari Lahir Pancasila",
  "2025-06-06": "Hari Raya Idul Adha",
  "2025-06-27": "Tahun Baru Islam 1447 H",
  "2025-08-17": "HUT Kemerdekaan RI",
  "2025-09-05": "Maulid Nabi Muhammad",
  "2025-12-25": "Hari Raya Natal",
  "2025-12-26": "Cuti Bersama Natal",

  // ── 2026 ──
  "2026-01-01": "Tahun Baru Masehi",
  "2026-01-16": "Isra Mikraj",
  "2026-02-17": "Tahun Baru Imlek",
  "2026-03-19": "Tahun Baru Saka (Nyepi)",
  "2026-03-20": "Wafat Isa Al-Masih",
  "2026-03-21": "Hari Raya Idul Fitri",
  "2026-03-22": "Hari Raya Idul Fitri 2",
  "2026-04-03": "Cuti Bersama Idul Fitri",
  "2026-05-01": "Hari Buruh",
  "2026-05-14": "Kenaikan Isa Al-Masih",
  "2026-05-16": "Hari Raya Waisak",
  "2026-05-26": "Hari Raya Idul Adha",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-16": "Tahun Baru Islam 1448 H",
  "2026-08-17": "HUT Kemerdekaan RI",
  "2026-08-25": "Maulid Nabi Muhammad",
  "2026-12-25": "Hari Raya Natal",

  // ── 2027 ──
  "2027-01-01": "Tahun Baru Masehi",
  "2027-01-06": "Isra Mikraj",
  "2027-02-06": "Tahun Baru Imlek",
  "2027-03-09": "Hari Raya Nyepi",
  "2027-03-10": "Wafat Isa Al-Masih",
  "2027-03-11": "Hari Raya Idul Fitri",
  "2027-03-12": "Hari Raya Idul Fitri 2",
  "2027-05-01": "Hari Buruh",
  "2027-05-04": "Kenaikan Isa Al-Masih",
  "2027-05-06": "Hari Raya Waisak",
  "2027-05-16": "Hari Raya Idul Adha",
  "2027-06-01": "Hari Lahir Pancasila",
  "2027-06-06": "Tahun Baru Islam 1449 H",
  "2027-08-17": "HUT Kemerdekaan RI",
  "2027-08-15": "Maulid Nabi Muhammad",
  "2027-12-25": "Hari Raya Natal",
}

// ─────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────
interface DayActivity {
  date: string
  totalKg: number
  totalTransaksi: number
  warehouses: { nama: string; kg: number }[]
}

interface Props {
  calendarData: DayActivity[]
  selectedBulan?: number
  selectedTahun?: number
}

const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
]
const DAYS_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"]

const toDateKey = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────
export default function ManagerCalendar({ calendarData, selectedBulan, selectedTahun }: Props) {
  const today = new Date()
  const [viewYear, setViewYear]   = useState(selectedTahun ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedBulan ? (selectedBulan - 1) : today.getMonth())
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  useEffect(() => {
    if (selectedTahun !== undefined) setViewYear(selectedTahun)
    if (selectedBulan !== undefined) setViewMonth(selectedBulan - 1)
    setSelectedDay(null)
    setHoveredKey(null)
  }, [selectedBulan, selectedTahun])

  const dataMap = useMemo(() => {
    const m: Record<string, DayActivity> = {}
    for (const d of calendarData) m[d.date] = d
    return m
  }, [calendarData])

  const maxKgMonth = useMemo(() => {
    let max = 0
    const first = new Date(viewYear, viewMonth, 1)
    const last  = new Date(viewYear, viewMonth + 1, 0)
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
      if (dataMap[key]) max = Math.max(max, dataMap[key].totalKg)
    }
    return max
  }, [dataMap, viewYear, viewMonth])

  const calendarGrid = useMemo(() => {
    const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  const todayKey = new Date(today.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Warna hijau untuk aktivitas
  const getActivityColor = (kg: number): string => {
    if (kg === 0 || maxKgMonth === 0) return ""
    const r = kg / maxKgMonth
    if (r >= 0.85) return "cal-lvl cal-lvl-5"
    if (r >= 0.65) return "cal-lvl cal-lvl-4"
    if (r >= 0.45) return "cal-lvl cal-lvl-3"
    if (r >= 0.25) return "cal-lvl cal-lvl-2"
    return "cal-lvl cal-lvl-1"
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">Kalender Aktivitas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hijau = volume pembelian / <span className="text-red-400 font-medium">Merah = libur nasional</span>
            </p>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
            <button
              onClick={prevMonth}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-500 transition-colors hover:bg-slate-50 sm:h-8 sm:w-8"
            >&lt;</button>
            <span className="min-w-0 flex-1 text-center text-sm font-bold text-slate-700 sm:min-w-[140px]">
              {MONTHS_ID[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-lg font-bold text-slate-500 transition-colors hover:bg-slate-50 sm:h-8 sm:w-8"
            >&gt;</button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* ── Day Headers ── */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_ID.map((d, i) => (
            <div
              key={d}
              className={`text-center text-[11px] font-bold py-1 ${
                i === 0 ? "text-red-400" : "text-slate-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar Cells ── */}
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((day, idx) => {
            if (!day) return <div key={idx} />

            // Compute column = day of week: idx % 7
            // But we need the actual day of week for this date
            const colIdx   = idx % 7  // 0=Sun, 6=Sat
            const key      = toDateKey(viewYear, viewMonth, day)
            const activity = dataMap[key]
            const kg       = activity?.totalKg || 0
            const isToday  = key === todayKey
            const isSunday = colIdx === 0
            const holiday  = HARI_LIBUR[key]
            const isRed    = isSunday || !!holiday
            const isSelected = selectedDay?.date === key
            const isHovered  = hoveredKey === key

            // Activity color takes priority visually if there's data
            const actColor = getActivityColor(kg)

            // Base background/text class
            let cellBg: string
            let numColor: string
            if (actColor) {
              cellBg   = actColor
              numColor = ""
            } else if (isRed) {
              cellBg   = "bg-red-50 hover:bg-red-100"
              numColor = "text-red-500"
            } else {
              cellBg   = "hover:bg-slate-50"
              numColor = "text-slate-600"
            }

            // Today ring
            const todayRing = isToday ? "cal-ring-today" : ""
            const selRing   = isSelected ? "cal-ring-selected" : ""
            const cursor    = (kg > 0 || holiday) ? "cursor-pointer" : "cursor-default"
            const shadow    = (kg > 0 || holiday) ? "hover:shadow-md" : ""

            return (
              <div key={key} className="relative group">
                <button
                  onClick={() => {
                    if (activity) setSelectedDay(isSelected ? null : activity)
                    else if (holiday) {
                      // Show holiday info by simulating selection
                      setSelectedDay(
                        isSelected
                          ? null
                          : { date: key, totalKg: 0, totalTransaksi: 0, warehouses: [] }
                      )
                    }
                  }}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`
                    w-full aspect-square rounded-md sm:rounded-lg flex flex-col items-center justify-center
                    text-[11px] sm:text-xs font-medium transition-all duration-150
                    ${cellBg} ${todayRing} ${selRing} ${cursor} ${shadow}
                  `}
                >
                  {/* Day number with red override for holidays/sunday when no activity */}
                  <span
                    className={`text-xs font-extrabold leading-none ${
                      actColor
                        ? ""
                        : isRed
                        ? "text-red-500"
                        : isToday
                        ? "cal-today-num"
                        : numColor
                    }`}
                  >
                    {day}
                  </span>

                  {/* Volume mini label */}
                  {kg > 0 && (
                    <span className="hidden text-[8px] leading-tight mt-0.5 opacity-85 font-semibold sm:inline">
                      {fmtKgId(kg)}
                    </span>
                  )}

                  {/* Holiday dot indicator */}
                  {holiday && kg === 0 && (
                    <span className="mt-0.5 w-1 h-1 rounded-full bg-red-400 block" />
                  )}
                </button>

                {/* Tooltip on hover for holiday name */}
                {holiday && isHovered && !isSelected && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                    <div className="bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap max-w-[140px] text-center leading-tight">
                      {holiday}
                    </div>
                    <div className="w-2 h-2 bg-red-600 rotate-45 mx-auto -mt-1" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            {["cal-lvl-1","cal-lvl-2","cal-lvl-3","cal-lvl-4","cal-lvl-5"].map((c, i) => (
              <div key={i} className={`w-4 h-3 rounded ${c}`} />
            ))}
            <span>Volume pembelian</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-red-50 border border-red-200 flex items-center justify-center">
              <span className="text-red-500 font-bold text-[10px]">1</span>
            </div>
            <span>Hari Minggu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-red-50 border border-red-200 flex items-center justify-center">
              <span className="text-red-500 font-bold text-[10px] leading-none">*</span>
            </div>
            <span>Libur Nasional</span>
          </div>
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <div className="w-4 h-4 rounded border-2" style={{ borderColor: "var(--brand)" }} />
            <span>Hari ini</span>
          </div>
        </div>

        {/* ── Detail Popup ── */}
        {selectedDay && (
          <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: "var(--border)" }}>
            {/* Kepala bertint: tanggal + total hari itu. Dipisah dari daftar
                gudang supaya panel punya hierarki, tidak sekadar tumpukan
                baris teks yang rata semua. */}
            <div
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3"
              style={{ background: "var(--brand-soft)" }}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-bold" style={{ color: "var(--brand-strong)" }}>
                  {new Date(selectedDay.date + "T00:00:00").toLocaleDateString("id-ID", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {HARI_LIBUR[selectedDay.date] && (
                    <span className="font-semibold text-red-500">{HARI_LIBUR[selectedDay.date]}</span>
                  )}
                  {HARI_LIBUR[selectedDay.date] && selectedDay.totalTransaksi > 0 && " · "}
                  {selectedDay.totalTransaksi > 0
                    ? `${fmtAngka(selectedDay.totalTransaksi)} transaksi`
                    : !HARI_LIBUR[selectedDay.date] && "Tidak ada transaksi"}
                </p>
              </div>
              {selectedDay.totalKg > 0 && (
                <p className="font-mono text-lg font-extrabold tabular-nums" style={{ color: "var(--brand-strong)" }}>
                  {fmtKgId(selectedDay.totalKg)}
                </p>
              )}
            </div>

            {/* Rincian gudang: bar tipis di belakang nama sebagai latar,
                bukan bar terpisah -- proporsinya kebaca tanpa menambah
                elemen baru ke dalam baris. */}
            {selectedDay.warehouses.length > 0 && (
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {selectedDay.warehouses.map(w => {
                  const share = selectedDay.totalKg > 0 ? (w.kg / selectedDay.totalKg) * 100 : 0
                  return (
                    <li key={w.nama} className="relative px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
                      <span
                        className="absolute inset-y-0 left-0 transition-[width] duration-500"
                        style={{ width: `${share}%`, background: "var(--brand-soft)", opacity: 0.55 }}
                        aria-hidden
                      />
                      <span className="relative flex items-baseline justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-700">{w.nama}</span>
                        <span className="font-mono font-semibold tabular-nums text-slate-700">{fmtKgId(w.kg)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
