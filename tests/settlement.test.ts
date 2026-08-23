import test from "node:test"
import assert from "node:assert/strict"
import { hitungPelunasan, hitungKoreksiKekurangan, SettlementError } from "../src/lib/settlement"

/**
 * Kasus yang mendasari semua ini: nota Rp 30.000.000 dipotong kasbon
 * Rp 15.000.000, jadi yang masih harus ditransfer Rp 15.000.000. Kalau
 * dibayar bertahap, kekurangannya harus tetap tercatat sampai nol.
 */

test("tanpa nominal, seluruh sisa dilunasi sekaligus", () => {
  const h = hitungPelunasan({ sisaSekarang: 15_000_000, sudahDibayarSebelumnya: 0 })
  assert.equal(h.dibayar, 15_000_000)
  assert.equal(h.sisa, 0)
  assert.equal(h.lunas, true)
  assert.equal(h.statusPelunasan, "LUNAS")
  assert.equal(h.persentasePembayaran, 100)
})

test("pembayaran sebagian menyisakan kekurangan, bukan langsung lunas", () => {
  // Inilah yang dulu salah: berapa pun yang dibayar, notanya jadi LUNAS.
  const h = hitungPelunasan({ sisaSekarang: 15_000_000, sudahDibayarSebelumnya: 0, nominal: 6_000_000 })
  assert.equal(h.dibayar, 6_000_000)
  assert.equal(h.sisa, 9_000_000)
  assert.equal(h.lunas, false)
  assert.equal(h.statusPelunasan, "BELUM_LUNAS")
  assert.equal(h.sudahDibayar, 6_000_000)
  assert.equal(h.persentasePembayaran, 40)
})

test("cicilan beruntun berakhir lunas dan sisanya nol", () => {
  const satu = hitungPelunasan({ sisaSekarang: 15_000_000, sudahDibayarSebelumnya: 0, nominal: 6_000_000 })
  const dua = hitungPelunasan({ sisaSekarang: satu.sisa, sudahDibayarSebelumnya: satu.sudahDibayar, nominal: 4_000_000 })
  assert.equal(dua.sisa, 5_000_000)
  assert.equal(dua.lunas, false)

  const tiga = hitungPelunasan({ sisaSekarang: dua.sisa, sudahDibayarSebelumnya: dua.sudahDibayar })
  assert.equal(tiga.sisa, 0)
  assert.equal(tiga.lunas, true)
  assert.equal(tiga.sudahDibayar, 15_000_000)
  assert.equal(tiga.persentasePembayaran, 100)
})

test("dibayar + sisa selalu sama dengan nilai yang harus ditransfer", () => {
  // Invarian yang sama dengan yang diperiksa scripts/audit-data.mjs:
  // pembayaran awal + sisa = nilai nota dikurangi kasbon.
  const h = hitungPelunasan({ sisaSekarang: 15_000_000, sudahDibayarSebelumnya: 0, nominal: 7_333_333 })
  assert.equal(h.sudahDibayar + h.sisa, 15_000_000)
})

test("nominal melebihi sisa ditolak", () => {
  assert.throws(
    () => hitungPelunasan({ sisaSekarang: 9_000_000, sudahDibayarSebelumnya: 6_000_000, nominal: 10_000_000 }),
    SettlementError,
  )
})

test("nominal nol atau negatif ditolak", () => {
  assert.throws(() => hitungPelunasan({ sisaSekarang: 100, sudahDibayarSebelumnya: 0, nominal: 0 }), SettlementError)
  assert.throws(() => hitungPelunasan({ sisaSekarang: 100, sudahDibayarSebelumnya: 0, nominal: -5 }), SettlementError)
})

test("nota tanpa sisa tidak bisa dibayar lagi", () => {
  assert.throws(() => hitungPelunasan({ sisaSekarang: 0, sudahDibayarSebelumnya: 15_000_000 }), SettlementError)
})

test("kelebihan satu rupiah dari pembulatan klien diterima, tapi tidak lebih", () => {
  const h = hitungPelunasan({ sisaSekarang: 9_000_000, sudahDibayarSebelumnya: 0, nominal: 9_000_001 })
  // Dipotong ke sisa sebenarnya, tidak menghasilkan sisa negatif.
  assert.equal(h.dibayar, 9_000_000)
  assert.equal(h.sisa, 0)
  assert.throws(
    () => hitungPelunasan({ sisaSekarang: 9_000_000, sudahDibayarSebelumnya: 0, nominal: 9_000_002 }),
    SettlementError,
  )
})

test("pecahan sen sisa dianggap lunas", () => {
  // Sisa hasil pembagian persentase bisa menyisakan pecahan yang tidak
  // akan pernah benar-benar dibayar; itu tidak boleh menahan nota terbuka.
  const h = hitungPelunasan({ sisaSekarang: 0.004, sudahDibayarSebelumnya: 1_000_000 })
  assert.equal(h.lunas, true)
  assert.equal(h.sisa, 0)
})

/**
 * Jalur koreksi: nota terlanjur ditandai lunas padahal transfernya kurang.
 * Yang dijaga di sini invarian yang juga diperiksa scripts/audit-data.mjs,
 * yaitu "sudah dibayar + sisa = kewajiban ke lapak" -- kalau kekurangannya
 * ditulis tanpa mengoreksi sisi yang sudah dibayar, kedua angka itu
 * berhenti berjumlah sama dengan kewajibannya.
 */

test("koreksi membuka kembali nota dan angkanya tetap berjumlah utuh", () => {
  const h = hitungKoreksiKekurangan({ kewajiban: 15_000_000, kurang: 6_000_000 })
  assert.equal(h.kurang, 6_000_000)
  assert.equal(h.sudahDibayar, 9_000_000)
  assert.equal(h.sudahDibayar + h.kurang, 15_000_000)
  assert.equal(h.persentasePembayaran, 60)
})

test("koreksi sebesar seluruh kewajiban berarti belum dibayar sama sekali", () => {
  const h = hitungKoreksiKekurangan({ kewajiban: 15_000_000, kurang: 15_000_000 })
  assert.equal(h.sudahDibayar, 0)
  assert.equal(h.persentasePembayaran, 0)
})

test("kekurangan melebihi kewajiban ditolak", () => {
  assert.throws(
    () => hitungKoreksiKekurangan({ kewajiban: 15_000_000, kurang: 15_000_002 }),
    SettlementError,
  )
})

test("kekurangan nol atau negatif ditolak", () => {
  assert.throws(() => hitungKoreksiKekurangan({ kewajiban: 15_000_000, kurang: 0 }), SettlementError)
  assert.throws(() => hitungKoreksiKekurangan({ kewajiban: 15_000_000, kurang: -1 }), SettlementError)
})

test("nota tanpa kewajiban ke lapak tidak bisa dikoreksi", () => {
  // Nota yang seluruh nilainya tertutup kasbon: tidak ada uang yang
  // seharusnya ditransfer, jadi tidak ada yang bisa kurang.
  assert.throws(() => hitungKoreksiKekurangan({ kewajiban: 0, kurang: 100 }), SettlementError)
})

test("koreksi lalu dicicil sampai lunas kembali", () => {
  const koreksi = hitungKoreksiKekurangan({ kewajiban: 15_000_000, kurang: 6_000_000 })
  const bayar = hitungPelunasan({
    sisaSekarang: koreksi.kurang,
    sudahDibayarSebelumnya: koreksi.sudahDibayar,
    nominal: 6_000_000,
  })
  assert.equal(bayar.lunas, true)
  assert.equal(bayar.sudahDibayar, 15_000_000)
  assert.equal(bayar.sisa, 0)
})
