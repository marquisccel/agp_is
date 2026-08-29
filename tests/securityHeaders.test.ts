import test from "node:test"
import assert from "node:assert/strict"
import { buatSecurityHeaders, KARAKTER_TERLARANG } from "../src/lib/securityHeaders"

/*
 * Tes ini lahir dari kejadian sungguhan: pemisah direktif CSP tertukar dari
 * "; " menjadi baris baru. Node lalu menolak SETIAP tanggapan dengan
 * "Invalid character in header content", sehingga seluruh halaman jadi 500,
 * bukan cuma CSP-nya yang tidak berlaku.
 *
 * `next build` tetap lolos waktu itu, karena header dirakit saat permintaan
 * masuk dan tidak disentuh tahap build mana pun. Tanpa tes ini, satu-satunya
 * cara menemukannya adalah menjalankan servernya lalu membuka halaman.
 */

for (const produksi of [false, true]) {
  const nama = produksi ? "produksi" : "pengembangan"

  test(`[${nama}] tidak ada nilai header yang memuat karakter terlarang`, () => {
    for (const h of buatSecurityHeaders(produksi)) {
      assert.equal(
        KARAKTER_TERLARANG.test(h.value),
        false,
        `${h.key} memuat baris baru, carriage return, atau NUL: ${JSON.stringify(h.value)}`,
      )
    }
  })

  test(`[${nama}] nama header juga bersih dan tidak kosong`, () => {
    for (const h of buatSecurityHeaders(produksi)) {
      assert.ok(h.key.length > 0, "ada header tanpa nama")
      assert.equal(KARAKTER_TERLARANG.test(h.key), false, `nama header tidak sah: ${h.key}`)
      assert.ok(h.value.length > 0, `${h.key} bernilai kosong`)
    }
  })

  test(`[${nama}] tidak ada header yang didaftarkan dua kali`, () => {
    const nama2 = buatSecurityHeaders(produksi).map((h) => h.key)
    assert.equal(new Set(nama2).size, nama2.length, "ada nama header yang berulang")
  })
}

test("CSP memisahkan direktif dengan '; ', bukan yang lain", () => {
  const csp = buatSecurityHeaders(true).find((h) => h.key === "Content-Security-Policy")
  assert.ok(csp, "header CSP tidak ada")
  // Sepuluh direktif berarti sembilan pemisah. Kalau pemisahnya tertukar,
  // jumlah ini langsung meleset.
  assert.equal(csp.value.split("; ").length, 10)
  assert.ok(csp.value.startsWith("default-src 'self'"))
})

test("direktif yang menutup kelas serangan tertentu tidak boleh hilang", () => {
  const csp = buatSecurityHeaders(true).find((h) => h.key === "Content-Security-Policy").value
  // Masing-masing pernah jadi alasan CSP ini dipasang; kalau ada yang
  // terhapus saat menyunting, tes ini yang memberi tahu.
  for (const arahan of ["frame-ancestors 'none'", "object-src 'none'", "form-action 'self'", "base-uri 'self'"]) {
    assert.ok(csp.includes(arahan), `direktif hilang: ${arahan}`)
  }
})

test("HSTS hanya dipasang di produksi", () => {
  const dev = buatSecurityHeaders(false).map((h) => h.key)
  const prod = buatSecurityHeaders(true).map((h) => h.key)
  // Di localhost yang berjalan http, HSTS membuat peramban memaksa https
  // dan justru menyulitkan pengembangan.
  assert.equal(dev.includes("Strict-Transport-Security"), false)
  assert.equal(prod.includes("Strict-Transport-Security"), true)
})
