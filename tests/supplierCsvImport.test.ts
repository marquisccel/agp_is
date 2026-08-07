import test from "node:test"
import assert from "node:assert/strict"
import { normalizeWarehouseLabel, parseSupplierCoordinateCsv } from "../src/lib/supplierCsvImport"

test("parseSupplierCoordinateCsv mem-parse header dan baris dengan delimiter titik koma", () => {
  const csv = "nama;gudang;latitude;longitude\nPengepul A;Kediri;-7.8;112.0\nPengepul B;Madiun;-7.6;111.5"
  const { rows, errors } = parseSupplierCoordinateCsv(csv)
  assert.equal(errors.length, 0)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].nama, "Pengepul A")
  assert.equal(rows[0].gudang, "Kediri")
  assert.equal(rows[0].latitude, "-7.8")
})

test("parseSupplierCoordinateCsv mendukung delimiter koma", () => {
  const csv = "nama,gudang,link\nPengepul C,Malang,https://maps.app.goo.gl/abc"
  const { rows, errors } = parseSupplierCoordinateCsv(csv)
  assert.equal(errors.length, 0)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].link, "https://maps.app.goo.gl/abc")
})

test("parseSupplierCoordinateCsv menolak kalau kolom wajib tidak ada", () => {
  const csv = "latitude;longitude\n-7.8;112.0"
  const { rows, errors } = parseSupplierCoordinateCsv(csv)
  assert.equal(rows.length, 0)
  assert.equal(errors.length, 1)
  assert.match(errors[0].message, /nama, gudang/)
})

test("parseSupplierCoordinateCsv menandai baris dengan nama/gudang kosong sebagai error, baris lain tetap diproses", () => {
  const csv = "nama;gudang;latitude;longitude\n;Kediri;-7.8;112.0\nPengepul B;Madiun;-7.6;111.5"
  const { rows, errors } = parseSupplierCoordinateCsv(csv)
  assert.equal(rows.length, 1)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].rowNumber, 2)
})

test("normalizeWarehouseLabel menyamakan variasi penulisan nama gudang", () => {
  assert.equal(normalizeWarehouseLabel("Gudang Kediri"), normalizeWarehouseLabel("Collection Center Kediri"))
  assert.equal(normalizeWarehouseLabel("Kediri"), "kediri")
})
