import test from "node:test"
import assert from "node:assert/strict"
import { bacaRincian, normalisasiRincian, rincianCocok, totalRincian } from "../src/lib/rincianTimbangan"

test("normalisasiRincian: kosong atau tidak ada menjadi null", () => {
  assert.equal(normalisasiRincian(undefined), null)
  assert.equal(normalisasiRincian(null), null)
  assert.equal(normalisasiRincian([]), null)
})

test("normalisasiRincian membuang baris kosong dan membulatkan", () => {
  const hasil = normalisasiRincian([
    { kg: 350.504, karung: 12 },
    { kg: 0, karung: 0 },
    { kg: "349.5", karung: "11.4" },
  ])
  assert.deepEqual(hasil, [
    { kg: 350.5, karung: 12 },
    { kg: 349.5, karung: 11 },
  ])
})

test("normalisasiRincian menolak bentuk salah dan nilai negatif", () => {
  assert.throws(() => normalisasiRincian("bukan array"), /tidak valid/)
  assert.throws(() => normalisasiRincian([42]), /tidak valid/)
  assert.throws(() => normalisasiRincian([{ kg: "abc", karung: 1 }]), /tidak valid/)
  assert.throws(() => normalisasiRincian([{ kg: -1, karung: 1 }]), /negatif/)
  assert.throws(() => normalisasiRincian(new Array(201).fill({ kg: 1, karung: 1 })), /terlalu banyak/)
})

test("totalRincian dan rincianCocok", () => {
  const r = [{ kg: 350.5, karung: 12 }, { kg: 349.5, karung: 11 }]
  assert.deepEqual(totalRincian(r), { kg: 700, karung: 23 })
  assert.equal(rincianCocok(r, 700), true)
  assert.equal(rincianCocok(r, 700.01), true)
  assert.equal(rincianCocok(r, 690), false)
  assert.equal(rincianCocok(null, 700), false)
  assert.deepEqual(totalRincian(null), { kg: 0, karung: 0 })
})

test("bacaRincian tidak melempar untuk nilai aneh dari basis data", () => {
  assert.equal(bacaRincian({ a: 1 }), null)
  assert.equal(bacaRincian("x"), null)
  assert.deepEqual(bacaRincian([{ kg: 5, karung: 1 }]), [{ kg: 5, karung: 1 }])
})
