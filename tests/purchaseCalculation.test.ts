import test from "node:test"
import assert from "node:assert/strict"
import {
  calculatePurchaseTotals,
  hasPriceAboveStandard,
  resolveWeightForPricing,
  PurchaseCalculationError,
} from "../src/lib/purchaseCalculation"

const base = {
  totalNilaiSebelumRetur: 0,
  totalPotonganRetur: 0,
  potonganSampah: 0,
  potonganSusut: 0,
  potonganAir: 0,
  potonganKarung: 0,
  dpDigunakan: 0,
  persentasePembayaran: 100,
}

test("retur dan potongan mengurangi nilai transaksi", () => {
  const t = calculatePurchaseTotals({
    ...base,
    totalNilaiSebelumRetur: 1_000_000,
    totalPotonganRetur: 100_000,
    potonganSampah: 50_000,
    potonganSusut: 30_000,
    potonganAir: 20_000,
    potonganKarung: 10_000,
  })
  assert.equal(t.totalNilaiSetelahRetur, 900_000)
  assert.equal(t.totalPotonganLain, 110_000)
  assert.equal(t.totalNetPayout, 790_000)
  assert.equal(t.totalDibayar, 790_000)
  assert.equal(t.statusPelunasan, "LUNAS")
})

test("potongan retur ikut diperhitungkan (regresi D-3)", () => {
  // Jalur edit transaksi sebelumnya mengabaikan retur tersimpan, sehingga
  // nilai transaksi bisa berubah hanya karena disimpan ulang.
  const t = calculatePurchaseTotals({
    ...base,
    totalNilaiSebelumRetur: 1_000_000,
    totalPotonganRetur: 250_000,
  })
  assert.equal(t.totalDibayar, 750_000)
})

test("DP mengurangi total yang dibayarkan ke supplier", () => {
  const t = calculatePurchaseTotals({
    ...base,
    totalNilaiSebelumRetur: 1_000_000,
    dpDigunakan: 400_000,
  })
  assert.equal(t.totalNetPayout, 1_000_000)
  assert.equal(t.totalDibayar, 600_000)
})

test("skema termin menghitung pembayaran awal dan sisa", () => {
  const t = calculatePurchaseTotals({
    ...base,
    totalNilaiSebelumRetur: 1_000_000,
    persentasePembayaran: 60,
  })
  assert.equal(t.nominalPembayaranAwal, 600_000)
  assert.equal(t.nominalBelumLunas, 400_000)
  assert.equal(t.statusPelunasan, "BELUM_LUNAS")
})

test("perhitungan bersifat idempoten (regresi D-3)", () => {
  const input = {
    ...base,
    totalNilaiSebelumRetur: 1_234_567,
    totalPotonganRetur: 111_111,
    potonganSampah: 22_222,
    potonganSusut: 3_333,
    potonganAir: 444,
    potonganKarung: 55,
    dpDigunakan: 100_000,
    persentasePembayaran: 70,
  }
  assert.deepEqual(calculatePurchaseTotals(input), calculatePurchaseTotals(input))
})

test("total pembayaran negatif ditolak", () => {
  assert.throws(
    () => calculatePurchaseTotals({ ...base, totalNilaiSebelumRetur: 100_000, potonganSampah: 200_000 }),
    PurchaseCalculationError
  )
})

test("DP melebihi nilai nota: dipakai sebatas nilainya, sisanya dikembalikan", () => {
  // Terjadi kalau Staff mengalokasikan DP dari taksiran berat, lalu
  // timbangan gudang keluar lebih kecil sehingga nilai notanya turun di
  // bawah DP. Dulu seluruh verifikasi ditolak dan notanya mentok.
  const t = calculatePurchaseTotals({ ...base, totalNilaiSebelumRetur: 100_000, dpDigunakan: 150_000 })
  assert.equal(t.totalNetPayout, 100_000)
  assert.equal(t.dpTerpakai, 100_000)
  assert.equal(t.dpDikembalikan, 50_000)
  assert.equal(t.totalDibayar, 0)
})

test("DP pas sebesar nilai nota: tidak ada yang dikembalikan", () => {
  const t = calculatePurchaseTotals({ ...base, totalNilaiSebelumRetur: 100_000, dpDigunakan: 100_000 })
  assert.equal(t.dpTerpakai, 100_000)
  assert.equal(t.dpDikembalikan, 0)
  assert.equal(t.totalDibayar, 0)
})

test("DP di bawah nilai nota: terpakai seluruhnya", () => {
  const t = calculatePurchaseTotals({ ...base, totalNilaiSebelumRetur: 100_000, dpDigunakan: 40_000 })
  assert.equal(t.dpTerpakai, 40_000)
  assert.equal(t.dpDikembalikan, 0)
  assert.equal(t.totalDibayar, 60_000)
})

test("potongan yang melampaui nilai barang tetap ditolak", () => {
  // Beda dengan kelebihan DP: potongan lebih besar dari nilai barang
  // berarti angkanya memang salah, bukan keadaan yang wajar.
  assert.throws(
    () => calculatePurchaseTotals({ ...base, totalNilaiSebelumRetur: 100_000, potonganSampah: 120_000 }),
    PurchaseCalculationError
  )
})

const standards = [{ sku_name: "PET BENING", max_price_per_kg: 5000 }]

test("harga di atas standar SKU terdeteksi", () => {
  assert.equal(hasPriceAboveStandard([{ sku_name: "PET BENING", harga_per_kg: 5500 }], standards), true)
})

test("harga tepat sama dengan standar tetap lolos", () => {
  assert.equal(hasPriceAboveStandard([{ sku_name: "PET BENING", harga_per_kg: 5000 }], standards), false)
})

test("SKU tanpa standar tidak memicu kontrol harga", () => {
  assert.equal(hasPriceAboveStandard([{ sku_name: "PET WARNA", harga_per_kg: 99_999 }], standards), false)
})

test("satu item melanggar cukup memicu kontrol harga", () => {
  assert.equal(
    hasPriceAboveStandard(
      [
        { sku_name: "PET WARNA", harga_per_kg: 100 },
        { sku_name: "PET BENING", harga_per_kg: 6000 },
      ],
      standards
    ),
    true
  )
})

test("metode timbangan menentukan berat dasar harga", () => {
  assert.equal(resolveWeightForPricing("TIMBANGAN_LAPAK", 100, 95), 100)
  assert.equal(resolveWeightForPricing("TIMBANGAN_GUDANG", 100, 95), 95)
  assert.equal(resolveWeightForPricing(null, 100, 95), 95)
})

test("termin 100 persen selalu berstatus lunas", () => {
  const t = calculatePurchaseTotals({ ...base, totalNilaiSebelumRetur: 500_000 })
  assert.equal(t.statusPelunasan, "LUNAS")
  assert.equal(t.nominalBelumLunas, 0)
  assert.equal(t.nominalPembayaranAwal, t.totalDibayar)
})

test("pembulatan termin tidak menyisakan selisih", () => {
  // 33% dari nilai ganjil rawan menghasilkan pecahan; awal + sisa harus
  // tetap sama persis dengan total yang harus dibayar.
  const t = calculatePurchaseTotals({
    ...base,
    totalNilaiSebelumRetur: 1_000_001,
    persentasePembayaran: 33,
  })
  assert.equal(
    Math.round((t.nominalPembayaranAwal + t.nominalBelumLunas) * 100) / 100,
    t.totalDibayar
  )
})
