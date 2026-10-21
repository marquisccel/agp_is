import test from "node:test"
import assert from "node:assert/strict"
import {
  hariIniWib,
  hariMundurWib,
  MAKS_HARI_MUNDUR_STAFF,
  periksaTanggalPembelian,
  tanggalWib,
} from "../src/lib/tanggalPembelian"

// 13 Okt 2026 pukul 08.00 WIB = 01.00 UTC
const SEKARANG = new Date(Date.UTC(2026, 9, 13, 1, 0, 0))

test("hari WIB: pukul 23.30 WIB masih hari yang sama, 00.30 WIB berikutnya sudah hari baru", () => {
  assert.equal(tanggalWib(new Date(Date.UTC(2026, 9, 13, 16, 30))), "2026-10-13") // 23.30 WIB
  assert.equal(tanggalWib(new Date(Date.UTC(2026, 9, 13, 17, 30))), "2026-10-14") // 00.30 WIB
  assert.equal(hariIniWib(SEKARANG), "2026-10-13")
})

test("hariMundurWib", () => {
  assert.equal(hariMundurWib(3, SEKARANG), "2026-10-10")
  assert.equal(hariMundurWib(MAKS_HARI_MUNDUR_STAFF, SEKARANG), "2026-09-12")
})

test("tanggal hari ini menyimpan waktu sebenarnya", () => {
  const h = periksaTanggalPembelian("2026-10-13", { maksHariMundur: 31, sekarang: SEKARANG })
  assert.ok(h.ok)
  if (h.ok) assert.equal(h.tanggal.getTime(), SEKARANG.getTime())
})

test("tanggal sebelumnya disimpan pukul 12.00 WIB (05.00 UTC) dan tetap hari yang sama di WIB", () => {
  const h = periksaTanggalPembelian("2026-10-10", { maksHariMundur: 31, sekarang: SEKARANG })
  assert.ok(h.ok)
  if (h.ok) {
    assert.equal(h.tanggal.toISOString(), "2026-10-10T05:00:00.000Z")
    assert.equal(tanggalWib(h.tanggal), "2026-10-10")
  }
})

test("menolak masa depan", () => {
  const h = periksaTanggalPembelian("2026-10-14", { maksHariMundur: 31, sekarang: SEKARANG })
  assert.deepEqual(h, { ok: false, error: "Tanggal pembelian tidak boleh di masa depan." })
})

test("batas mundur Staff: 31 hari boleh, 32 hari tidak; Admin/Manager tidak dibatasi", () => {
  assert.ok(periksaTanggalPembelian("2026-09-12", { maksHariMundur: 31, sekarang: SEKARANG }).ok)
  const lewat = periksaTanggalPembelian("2026-09-11", { maksHariMundur: 31, sekarang: SEKARANG })
  assert.equal(lewat.ok, false)
  assert.ok(periksaTanggalPembelian("2026-01-05", { maksHariMundur: null, sekarang: SEKARANG }).ok)
})

test("menolak bentuk salah dan tanggal kalender yang tidak ada", () => {
  for (const x of ["", "13-10-2026", "2026-10-1", "2026-02-31", "2026-13-01", null, undefined, 20261010]) {
    const h = periksaTanggalPembelian(x, { maksHariMundur: null, sekarang: SEKARANG })
    assert.equal(h.ok, false, String(x))
  }
})
