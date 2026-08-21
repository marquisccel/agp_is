import test from "node:test"
import assert from "node:assert/strict"
import { isianAwal, ketik, sinkronDariLuar, nilaiDariTeks, bersihkan } from "../src/lib/numericField"

/**
 * Menirukan satu kolom angka terkendali: pengguna menekan tombol satu
 * per satu, dan tiap tombol menempel di TEKS YANG SEDANG TERLIHAT.
 * Itu bagian yang penting -- kalau kolom sempat dikosongkan di tengah
 * ketikan, karakter berikutnya menempel di kolom kosong.
 */
function mengetik(tombolTombol: string[], awal = isianAwal(0)) {
  let keadaan = awal
  for (const tombol of tombolTombol) {
    keadaan = ketik(keadaan.teks + tombol)
  }
  return keadaan
}

test("mengetik 0.5 menghasilkan 0,5 -- bukan 5", () => {
  // Regresi: pendekatan lama menurunkan teks dari number (`nilai || ""`),
  // jadi menekan "0" mengosongkan kolom, "." jatuh di kolom kosong dan
  // ikut hilang, dan yang tersisa cuma "5". Pengguna bermaksud 0,5 kg
  // dan yang tercatat 5 kg -- sepuluh kali lipat, tanpa pesan apa pun.
  const hasil = mengetik(["0", ".", "5"])
  assert.equal(hasil.teks, "0.5")
  assert.equal(hasil.nilai, 0.5)
})

test("keadaan setengah jadi bertahan di layar", () => {
  assert.equal(mengetik(["0"]).teks, "0")
  assert.equal(mengetik(["0", "."]).teks, "0.")
  // ...meski nilainya masih 0, teksnya tidak boleh ikut dikosongkan.
  assert.equal(mengetik(["0", "."]).nilai, 0)
})

test("desimal tanpa nol di depan tetap jalan", () => {
  const hasil = mengetik([".", "2", "5"])
  assert.equal(hasil.nilai, 0.25)
})

test("angka biasa dan desimal panjang", () => {
  assert.equal(mengetik(["1", "2", "5", "0"]).nilai, 1250)
  assert.equal(mengetik(["0", ".", "0", "1"]).nilai, 0.01)
  assert.equal(mengetik(["1", "0", ".", "5"]).nilai, 10.5)
})

test("isian kosong dan masukan tak masuk akal dibaca sebagai nol", () => {
  assert.equal(nilaiDariTeks(""), 0)
  assert.equal(nilaiDariTeks("abc"), 0)
  assert.equal(nilaiDariTeks("."), 0)
})

test("nilai dari luar menimpa teks, tapi tidak memotong ketikan berjalan", () => {
  const sedangDiketik = mengetik(["0", "."])

  // Form direset ke nilai lain -> teks harus ikut berubah.
  assert.equal(sinkronDariLuar(sedangDiketik, 7).teks, "7")

  // Nilainya sama dengan yang sedang diketik (keduanya 0) -> jangan
  // diganggu, kalau tidak "0." terhapus di tengah ketikan.
  assert.equal(sinkronDariLuar(sedangDiketik, 0).teks, "0.")
})

test("isian awal dari data yang sudah ada", () => {
  assert.equal(isianAwal(0).teks, "")
  assert.equal(isianAwal(12.5).teks, "12.5")
})

test("koma dipakai sebagai pemisah desimal", () => {
  // Di Indonesia pemisah desimal adalah koma. Sebelumnya mengetik "0,5"
  // membuat parseFloat berhenti di koma dan menghasilkan 0 -- potongan
  // jadi hilang sama sekali tanpa pesan apa pun.
  assert.equal(mengetik(["0", ",", "5"]).teks, "0,5")
  assert.equal(mengetik(["0", ",", "5"]).nilai, 0.5)
  assert.equal(nilaiDariTeks("12,25"), 12.25)
})

test("karakter yang bukan angka disaring", () => {
  assert.equal(bersihkan("12ab3"), "123")
  assert.equal(bersihkan("1.2.3"), "1.23")   // pemisah kedua dibuang
  assert.equal(bersihkan("1,2,3"), "1,23")
  assert.equal(bersihkan("--5"), "-5")       // minus hanya boleh di depan
  assert.equal(bersihkan("5-3"), "53")
})
