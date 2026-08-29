import test from "node:test"
import assert from "node:assert/strict"
import { hitungGradeLapak } from "../src/lib/gradeLapak"
import type { PembelianUntukGrade, StandarHargaSku } from "../src/lib/gradeLapak"

const GUDANG = "gudang-1"

const standar: StandarHargaSku[] = [
  { sku_name: "Bening", warehouseId: GUDANG, max_price_per_kg: 11000 },
]

/** Pembelian bersih: tidak susut, harga di bawah standar. */
function pembelian(
  beratLapak: number,
  beratGudang: number,
  hargaPerKg = 10000,
): PembelianUntukGrade {
  return {
    warehouseId: GUDANG,
    berat_timbangan_lapak: beratLapak,
    berat_timbangan_gudang: beratGudang,
    items: [
      { berat_final_item: beratGudang, harga_per_kg: hargaPerKg, subtotal: beratGudang * hargaPerKg, sku_name: "Bening" },
    ],
  }
}

test("lapak tanpa transaksi tidak diberi huruf, bukan diberi C", () => {
  const h = hitungGradeLapak([], 5000, standar)
  // Membedakan "belum ada data" dari "buruk" itu penting: lapak yang baru
  // didaftarkan tidak boleh terlihat seperti lapak bermasalah.
  assert.equal(h.grade, "-")
  assert.equal(h.label, "Belum ada data")
  assert.equal(h.opi, 0)
})

test("memenuhi target, tanpa susut, harga wajar menghasilkan A", () => {
  const h = hitungGradeLapak([pembelian(5000, 5000)], 5000, standar)
  assert.equal(h.grade, "A")
  assert.equal(h.persenTarget, 100)
  assert.equal(h.totalSusut, 0)
  assert.equal(h.jumlahPeringatanHarga, 0)
})

test("susut besar menurunkan grade walau target terpenuhi", () => {
  // 5000 kg di lapak jadi 4000 kg di gudang: susut 20 persen.
  // Skor kualitas = 100 - 20*25 = 0, jadi maksimal OPI = 40*0.4 dari
  // kuantitas saja ditambah komponen harga.
  const h = hitungGradeLapak([pembelian(5000, 4000)], 4000, standar)
  assert.equal(h.totalSusut, 1000)
  assert.equal(h.persenSusut, 20)
  assert.notEqual(h.grade, "A")
})

test("selisih ke arah lebih berat tidak dihitung sebagai susut", () => {
  // Gudang menimbang LEBIH berat daripada lapak. Itu bukan kerugian, jadi
  // tidak boleh ikut menghukum nilai kualitasnya.
  const h = hitungGradeLapak([pembelian(4000, 5000)], 5000, standar)
  assert.equal(h.totalSusut, 0)
  assert.equal(h.persenSusut, 0)
  assert.equal(h.grade, "A")
})

test("pembelian di atas standar harga tercatat sebagai peringatan", () => {
  const h = hitungGradeLapak([pembelian(5000, 5000, 12000)], 5000, standar)
  assert.equal(h.jumlahPeringatanHarga, 1)
  // Satu peringatan memotong skor harga dari 100 ke 80, bobotnya 0,2.
  assert.ok(h.opi < 100)
})

test("SKU tanpa standar harga tidak pernah memicu peringatan", () => {
  const tanpaStandar = hitungGradeLapak([pembelian(1000, 1000, 999999)], 1000, [])
  assert.equal(tanpaStandar.jumlahPeringatanHarga, 0)
})

test("tanpa target bulanan, tonase dinilai lewat tangga", () => {
  // Lapak tanpa target tidak boleh otomatis bernilai nol pada kuantitas.
  const besar = hitungGradeLapak([pembelian(5000, 5000)], 0, standar)
  const kecil = hitungGradeLapak([pembelian(100, 100)], 0, standar)
  assert.equal(besar.persenTarget, 0)
  assert.ok(besar.opi > kecil.opi)
  assert.equal(besar.grade, "A")
})

test("beberapa pembelian dijumlahkan, bukan dirata-rata", () => {
  const h = hitungGradeLapak([pembelian(2000, 2000), pembelian(3000, 3000)], 5000, standar)
  assert.equal(h.totalTransaksi, 2)
  assert.equal(h.totalBeratGudang, 5000)
  assert.equal(h.persenTarget, 100)
})

test("persenTarget boleh melebihi 100 tapi skornya tidak", () => {
  // Angka persennya tetap jujur untuk ditampilkan, tapi lapak yang
  // melampaui target tidak boleh menutupi susut lewat skor kuantitas
  // yang membengkak.
  const h = hitungGradeLapak([pembelian(10000, 10000)], 5000, standar)
  assert.equal(h.persenTarget, 200)
  assert.ok(h.opi <= 100)
})

test("berat null diperlakukan sebagai nol, bukan NaN", () => {
  const h = hitungGradeLapak(
    [{ warehouseId: GUDANG, berat_timbangan_lapak: null, berat_timbangan_gudang: null, items: [] }],
    5000,
    standar,
  )
  assert.equal(h.totalBeratGudang, 0)
  assert.equal(Number.isNaN(h.opi), false)
})
