/**
 * workingDays.ts
 * Utility: menghitung hari kerja Indonesia (Senin-Sabtu, minus libur nasional)
 * Hari Minggu dan hari libur nasional TIDAK dihitung sebagai hari kerja.
 */

import { logger } from "@/lib/logger"
import holidaysData from "@/data/national-holidays.json"

// Perbaikan D-18: daftar libur nasional sebelumnya hardcode langsung di
// modul ini; sekarang dipisah ke src/data/national-holidays.json supaya
// pembaruan tahunan tidak perlu menyentuh kode.
const NATIONAL_HOLIDAYS: Set<string> = new Set(holidaysData.holidays.map((h) => h.date))

const COVERED_YEARS = new Set(holidaysData.holidays.map((h) => Number(h.date.slice(0, 4))))
const MAX_COVERED_YEAR = Math.max(...COVERED_YEARS)
let warnedStaleYear = false

/**
 * Data libur nasional pada src/data/national-holidays.json bersifat
 * terbatas per tahun (perlu diperbarui manual tiap tahun -- lihat D-18).
 * Tanggal di luar cakupan tahun yang terdaftar akan selalu dianggap bukan
 * libur nasional (mengikuti perilaku lama), tapi kondisi ini dicatat lewat
 * warning satu kali per proses agar terpantau, bukan gagal diam-diam.
 */
function warnIfYearUncovered(year: number) {
  if (warnedStaleYear || COVERED_YEARS.has(year)) return
  if (year <= MAX_COVERED_YEAR) return // tahun lama di luar cakupan awal, bukan data basi
  warnedStaleYear = true
  logger.warn("Data libur nasional belum mencakup tahun ini -- perlu pembaruan tahunan (D-18)", {
    year,
    maxCoveredYear: MAX_COVERED_YEAR,
    file: "src/data/national-holidays.json",
  })
}

/**
 * Mendapatkan representasi tanggal dan hari dalam WIB (UTC+7)
 */
export function getWibParts(date: Date) {
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return {
    key: wibTime.getUTCFullYear() + "-" +
         String(wibTime.getUTCMonth() + 1).padStart(2, "0") + "-" +
         String(wibTime.getUTCDate()).padStart(2, "0"),
    year: wibTime.getUTCFullYear(),
    dayOfWeek: wibTime.getUTCDay() // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  }
}

/**
 * Cek apakah tanggal tertentu adalah hari libur nasional
 */
export function isNationalHoliday(date: Date): boolean {
  const { key, year } = getWibParts(date)
  warnIfYearUncovered(year)
  return NATIONAL_HOLIDAYS.has(key)
}

/**
 * Cek apakah tanggal tertentu adalah hari kerja
 * (Senin-Sabtu dan bukan libur nasional)
 */
export function isWorkingDay(date: Date): boolean {
  const { key, year, dayOfWeek } = getWibParts(date)
  if (dayOfWeek === 0) return false // Minggu = libur
  warnIfYearUncovered(year)
  if (NATIONAL_HOLIDAYS.has(key)) return false // Libur nasional
  return true
}

/**
 * Hitung jumlah hari kerja dalam satu bulan
 * @param year  - Tahun (e.g. 2026)
 * @param month - Bulan 1-12 (e.g. 6 untuk Juni)
 * @returns Jumlah hari kerja (integer)
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate() // tanggal terakhir bulan itu
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d))
    if (isWorkingDay(date)) count++
  }
  return count
}

/**
 * Hitung jumlah hari kerja dalam minggu yang mengandung tanggal tertentu
 * (Senin-Sabtu, minus libur nasional)
 * @param mondayDate - Date objek yang menunjuk ke Senin awal minggu itu (UTC)
 * @returns Jumlah hari kerja dalam minggu itu
 */
export function getWorkingDaysInWeek(mondayDate: Date): number {
  let count = 0
  for (let d = 0; d < 7; d++) {
    const day = new Date(mondayDate.getTime() + d * 24 * 60 * 60 * 1000)
    if (isWorkingDay(day)) count++
  }
  return count
}
