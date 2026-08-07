import test from "node:test"
import assert from "node:assert/strict"
import { findPotentialDuplicates, normalizeSupplierName } from "../src/lib/supplierDuplicate"

test("normalizeSupplierName mengabaikan kapitalisasi, tanda baca, dan spasi ganda", () => {
  assert.equal(normalizeSupplierName("Pengepul  A."), normalizeSupplierName("pengepul a"))
})

test("nama identik terdeteksi sebagai duplikat", () => {
  const matches = findPotentialDuplicates(
    { nama: "Pengepul Jaya" },
    [{ id: "1", nama: "pengepul jaya" }]
  )
  assert.equal(matches.length, 1)
  assert.equal(matches[0].reason, "nama_identik")
})

test("nama mirip (typo kecil) terdeteksi sebagai kandidat duplikat", () => {
  const matches = findPotentialDuplicates(
    { nama: "Pengepul Jayaa" },
    [{ id: "1", nama: "Pengepul Jaya" }]
  )
  assert.equal(matches.length, 1)
  assert.equal(matches[0].reason, "nama_mirip")
})

test("nama yang jauh berbeda tidak dianggap duplikat", () => {
  const matches = findPotentialDuplicates(
    { nama: "Pengepul Barokah" },
    [{ id: "1", nama: "Toko Plastik Sejahtera" }]
  )
  assert.equal(matches.length, 0)
})

test("lokasi berdekatan (<75m) terdeteksi walau nama beda", () => {
  const matches = findPotentialDuplicates(
    { nama: "Lapak Baru", latitude: -7.8166, longitude: 112.0112 },
    [{ id: "1", nama: "Lapak Lama Sekali", latitude: -7.81665, longitude: 112.01125 }]
  )
  assert.equal(matches.length, 1)
  assert.equal(matches[0].reason, "lokasi_berdekatan")
})

test("lokasi berjauhan tidak dianggap duplikat meski nama beda", () => {
  const matches = findPotentialDuplicates(
    { nama: "Lapak Baru", latitude: -7.8166, longitude: 112.0112 },
    [{ id: "1", nama: "Lapak Lain", latitude: -7.95, longitude: 112.6 }]
  )
  assert.equal(matches.length, 0)
})
