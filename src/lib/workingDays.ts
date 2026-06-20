/**
 * workingDays.ts
 * Utility: menghitung hari kerja Indonesia (Senin-Sabtu, minus libur nasional)
 * Hari Minggu dan hari libur nasional TIDAK dihitung sebagai hari kerja.
 */

// ─── Daftar Libur Nasional Indonesia ────────────────────────────────────────
// Format: "YYYY-MM-DD"
// Sumber: SKB 3 Menteri / Kepmenaker RI
const NATIONAL_HOLIDAYS: Set<string> = new Set([
  // ── 2024 ──
  "2024-01-01", // Tahun Baru Masehi
  "2024-02-08", // Isra Miraj
  "2024-02-10", // Tahun Baru Imlek
  "2024-03-11", // Hari Suci Nyepi
  "2024-03-29", // Jumat Agung
  "2024-04-10", // Idul Fitri (1 Syawal)
  "2024-04-11", // Idul Fitri (2 Syawal)
  "2024-04-08", // Cuti Bersama Idul Fitri
  "2024-04-09", // Cuti Bersama Idul Fitri
  "2024-04-12", // Cuti Bersama Idul Fitri
  "2024-05-01", // Hari Buruh Internasional
  "2024-05-09", // Kenaikan Isa Almasih
  "2024-05-23", // Hari Raya Waisak
  "2024-06-01", // Hari Lahir Pancasila
  "2024-06-17", // Idul Adha
  "2024-06-18", // Cuti Bersama Idul Adha
  "2024-07-07", // Tahun Baru Islam 1446H
  "2024-08-17", // HUT Kemerdekaan RI
  "2024-09-16", // Maulid Nabi
  "2024-12-25", // Natal
  "2024-12-26", // Cuti Bersama Natal

  // ── 2025 ──
  "2025-01-01", // Tahun Baru Masehi
  "2025-01-27", // Cuti Bersama Tahun Baru Imlek
  "2025-01-28", // Tahun Baru Imlek
  "2025-01-29", // Cuti Bersama Tahun Baru Imlek
  "2025-03-28", // Hari Suci Nyepi
  "2025-03-29", // Idul Fitri (1 Syawal)
  "2025-03-30", // Idul Fitri (2 Syawal)
  "2025-03-31", // Cuti Bersama Idul Fitri
  "2025-04-01", // Cuti Bersama Idul Fitri
  "2025-04-02", // Cuti Bersama Idul Fitri
  "2025-04-18", // Jumat Agung
  "2025-05-01", // Hari Buruh Internasional
  "2025-05-12", // Hari Raya Waisak
  "2025-05-29", // Kenaikan Isa Almasih
  "2025-05-30", // Cuti Bersama Kenaikan Isa Almasih
  "2025-06-01", // Hari Lahir Pancasila
  "2025-06-06", // Idul Adha
  "2025-06-07", // Cuti Bersama Idul Adha
  "2025-06-27", // Tahun Baru Islam 1447H
  "2025-08-17", // HUT Kemerdekaan RI
  "2025-09-05", // Maulid Nabi
  "2025-12-25", // Natal
  "2025-12-26", // Cuti Bersama Natal

  // ── 2026 ──
  "2026-01-01", // Tahun Baru Masehi
  "2026-02-17", // Tahun Baru Imlek
  "2026-03-03", // Cuti Bersama Isra Miraj
  "2026-03-17", // Hari Suci Nyepi
  "2026-03-20", // Jumat Agung
  "2026-03-19", // Idul Fitri (eve cuti)
  "2026-03-20", // Idul Fitri (1 Syawal)
  "2026-03-21", // Idul Fitri (2 Syawal)
  "2026-03-23", // Cuti Bersama Idul Fitri
  "2026-03-24", // Cuti Bersama Idul Fitri
  "2026-05-01", // Hari Buruh Internasional
  "2026-05-14", // Kenaikan Isa Almasih
  "2026-05-27", // Idul Adha
  "2026-06-01", // Hari Lahir Pancasila
  "2026-06-02", // Hari Raya Waisak
  "2026-06-16", // Tahun Baru Islam 1448H
  "2026-08-17", // HUT Kemerdekaan RI
  "2026-08-25", // Maulid Nabi
  "2026-12-25", // Natal
  "2026-12-26", // Cuti Bersama Natal

  // ── 2027 ──
  "2027-01-01", // Tahun Baru Masehi
  "2027-02-06", // Tahun Baru Imlek
  "2027-03-07", // Hari Suci Nyepi
  "2027-03-09", // Idul Fitri (1 Syawal) - perkiraan
  "2027-03-10", // Idul Fitri (2 Syawal)
  "2027-04-02", // Jumat Agung
  "2027-05-01", // Hari Buruh Internasional
  "2027-05-17", // Idul Adha - perkiraan
  "2027-05-20", // Kenaikan Isa Almasih
  "2027-06-01", // Hari Lahir Pancasila
  "2027-06-06", // Tahun Baru Islam 1449H
  "2027-06-07", // Hari Raya Waisak
  "2027-08-17", // HUT Kemerdekaan RI
  "2027-08-14", // Maulid Nabi - perkiraan
  "2027-12-25", // Natal
  "2027-12-26", // Cuti Bersama Natal
])

/**
 * Mendapatkan representasi tanggal dan hari dalam WIB (UTC+7)
 */
export function getWibParts(date: Date) {
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return {
    key: wibTime.getUTCFullYear() + "-" + 
         String(wibTime.getUTCMonth() + 1).padStart(2, "0") + "-" + 
         String(wibTime.getUTCDate()).padStart(2, "0"),
    dayOfWeek: wibTime.getUTCDay() // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  }
}

/**
 * Cek apakah tanggal tertentu adalah hari libur nasional
 */
export function isNationalHoliday(date: Date): boolean {
  const { key } = getWibParts(date)
  return NATIONAL_HOLIDAYS.has(key)
}

/**
 * Cek apakah tanggal tertentu adalah hari kerja
 * (Senin-Sabtu dan bukan libur nasional)
 */
export function isWorkingDay(date: Date): boolean {
  const { key, dayOfWeek } = getWibParts(date)
  if (dayOfWeek === 0) return false // Minggu = libur
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
