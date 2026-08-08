import test from "node:test"
import assert from "node:assert/strict"
import {
  nonNegativeNumber,
  optionalFiniteNumber,
  percentageNumber,
  positiveInteger,
  positiveNumber,
} from "../src/lib/numberValidation"

test("optionalFiniteNumber mengembalikan fallback untuk null/undefined/string kosong", () => {
  assert.equal(optionalFiniteNumber(null), 0)
  assert.equal(optionalFiniteNumber(undefined), 0)
  assert.equal(optionalFiniteNumber(""), 0)
  assert.equal(optionalFiniteNumber(null, 5), 5)
})

test("optionalFiniteNumber mem-parse angka dari string dan menolak nilai tidak finite", () => {
  assert.equal(optionalFiniteNumber("42.5"), 42.5)
  assert.equal(optionalFiniteNumber(42.5), 42.5)
  assert.throws(() => optionalFiniteNumber("abc"), /tidak valid/)
  assert.throws(() => optionalFiniteNumber(Infinity), /tidak valid/)
  assert.throws(() => optionalFiniteNumber(NaN), /tidak valid/)
})

test("nonNegativeNumber menolak nilai negatif, menerima nol", () => {
  assert.equal(nonNegativeNumber(0, "Berat"), 0)
  assert.equal(nonNegativeNumber(10, "Berat"), 10)
  assert.throws(() => nonNegativeNumber(-1, "Berat"), /tidak boleh bernilai negatif/)
})

test("positiveNumber menolak nol dan negatif, hanya menerima > 0", () => {
  assert.equal(positiveNumber(0.01, "Harga"), 0.01)
  assert.throws(() => positiveNumber(0, "Harga"), /harus lebih besar dari 0/)
  assert.throws(() => positiveNumber(-5, "Harga"), /harus lebih besar dari 0/)
  assert.throws(() => positiveNumber(null, "Harga"), /harus lebih besar dari 0/)
})

test("percentageNumber membatasi rentang 0-100", () => {
  assert.equal(percentageNumber(0, "Persentase"), 0)
  assert.equal(percentageNumber(100, "Persentase"), 100)
  assert.equal(percentageNumber(null, "Persentase", 80), 80)
  assert.throws(() => percentageNumber(101, "Persentase"), /tidak boleh lebih dari 100/)
  assert.throws(() => percentageNumber(-1, "Persentase"), /tidak boleh bernilai negatif/)
})

test("positiveInteger menolak pecahan", () => {
  assert.equal(positiveInteger(7, "Frekuensi"), 7)
  assert.throws(() => positiveInteger(7.5, "Frekuensi"), /angka bulat lebih dari 0/)
})

test("positiveInteger tanpa fallback menolak nol/negatif lewat positiveNumber (pesan \"lebih besar dari 0\")", () => {
  // Tanpa fallback, positiveInteger mendelegasikan validasi awal ke positiveNumber,
  // jadi nol/negatif gagal di sana duluan sebelum sempat dicek keutuhan angkanya.
  assert.throws(() => positiveInteger(0, "Frekuensi"), /harus lebih besar dari 0/)
  assert.throws(() => positiveInteger(-3, "Frekuensi"), /harus lebih besar dari 0/)
})

test("positiveInteger dengan fallback tetap menolak nol/negatif, lewat pesan \"angka bulat\"", () => {
  // Dengan fallback, jalur validasinya beda: lewat optionalFiniteNumber (tidak
  // menolak <=0), sehingga nol/negatif baru ditangkap di pengecekan integer di sini.
  assert.throws(() => positiveInteger(0, "Frekuensi", 1), /angka bulat lebih dari 0/)
  assert.throws(() => positiveInteger(-3, "Frekuensi", 1), /angka bulat lebih dari 0/)
})

test("positiveInteger memakai fallback kalau nilai kosong, tapi tetap validasi bentuk fallback-nya sendiri", () => {
  assert.equal(positiveInteger(null, "Frekuensi", 1), 1)
  assert.equal(positiveInteger("", "Frekuensi", 3), 3)
})
