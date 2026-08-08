import test from "node:test"
import assert from "node:assert/strict"
import {
  getWorkingDaysInMonth,
  getWorkingDaysInWeek,
  isNationalHoliday,
  isWorkingDay,
} from "../src/lib/workingDays"

test("isWorkingDay menolak hari Minggu, terlepas dari libur nasional", () => {
  assert.equal(isWorkingDay(new Date(Date.UTC(2026, 0, 4))), false) // Minggu
})

test("isWorkingDay menerima hari Sabtu selama bukan libur nasional", () => {
  assert.equal(isWorkingDay(new Date(Date.UTC(2026, 0, 3))), true) // Sabtu, bukan libur
})

test("isWorkingDay menolak tanggal yang terdaftar sebagai libur nasional", () => {
  assert.equal(isWorkingDay(new Date(Date.UTC(2026, 0, 1))), false) // Tahun Baru Masehi, Kamis
})

test("isWorkingDay menerima hari kerja biasa (Senin-Jumat, bukan libur)", () => {
  assert.equal(isWorkingDay(new Date(Date.UTC(2026, 0, 6))), true) // Selasa biasa
})

test("isNationalHoliday mengenali tanggal pada daftar libur", () => {
  assert.equal(isNationalHoliday(new Date(Date.UTC(2026, 1, 17))), true) // Tahun Baru Imlek 2026
  assert.equal(isNationalHoliday(new Date(Date.UTC(2026, 0, 6))), false)
})

test("getWorkingDaysInWeek menghitung Senin-Sabtu minus libur nasional dalam satu minggu", () => {
  const monday = new Date(Date.UTC(2026, 0, 5)) // Senin, minggu tanpa libur nasional
  assert.equal(getWorkingDaysInWeek(monday), 6)
})

test("getWorkingDaysInMonth konsisten dengan penjumlahan isWorkingDay per hari dalam bulan itu", () => {
  const year = 2026
  const month = 2 // Februari, ada libur nasional (Imlek)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  let manualCount = 0
  for (let d = 1; d <= daysInMonth; d++) {
    if (isWorkingDay(new Date(Date.UTC(year, month - 1, d)))) manualCount++
  }
  assert.equal(getWorkingDaysInMonth(year, month), manualCount)
  assert.equal(getWorkingDaysInMonth(year, month), 23)
})

test("getWorkingDaysInMonth tidak pernah melebihi jumlah hari dalam bulan tersebut", () => {
  const daysInJanuary = new Date(Date.UTC(2026, 1, 0)).getUTCDate()
  assert.ok(getWorkingDaysInMonth(2026, 1) <= daysInJanuary)
  assert.equal(getWorkingDaysInMonth(2026, 1), 26)
})
