import test from "node:test"
import assert from "node:assert/strict"
import { risetAktif } from "../src/lib/riset"

/*
 * Sakelar ini menjaga dua hal sekaligus: halaman harness dan endpoint
 * penerima unggahan penelitian. Keduanya menerima berkas dari luar, jadi
 * yang berbahaya bukan kalau sakelarnya mati, melainkan kalau ia menyala
 * tanpa disengaja.
 *
 * Karena itu tesnya menekankan sisi sebaliknya dari kebiasaan: yang
 * dipastikan adalah bahwa hampir semua isi variabel TIDAK menyalakannya.
 */

function dengan(nilai: string | undefined, jalankan: () => void) {
  const sebelumnya = process.env.RISET_ENABLED
  if (nilai === undefined) delete process.env.RISET_ENABLED
  else process.env.RISET_ENABLED = nilai
  try {
    jalankan()
  } finally {
    if (sebelumnya === undefined) delete process.env.RISET_ENABLED
    else process.env.RISET_ENABLED = sebelumnya
  }
}

test("mati kalau variabelnya tidak diisi", () => {
  dengan(undefined, () => assert.equal(risetAktif(), false))
})

test("hanya kata true yang menyalakan", () => {
  dengan("true", () => assert.equal(risetAktif(), true))
  dengan("TRUE", () => assert.equal(risetAktif(), true))
  dengan("  true  ", () => assert.equal(risetAktif(), true))
})

test("isi lain tetap mematikan, termasuk yang sekilas tampak menyala", () => {
  // "1" dan "yes" sengaja TIDAK diterima. Sakelar yang menerima banyak
  // ejaan mudah menyala karena salah salin dari catatan lama.
  for (const isi of ["", " ", "1", "yes", "on", "false", "benar", "TRUE!"]) {
    dengan(isi, () =>
      assert.equal(risetAktif(), false, `isi ${JSON.stringify(isi)} seharusnya tidak menyalakan`),
    )
  }
})
