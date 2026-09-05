import test from "node:test"
import assert from "node:assert/strict"
import { batasUnggahMb, batasUnggahByte, periksaUkuranUnggahan } from "../src/lib/batasUnggah"

/*
 * Batas ini dulu ditulis dua kali di dua endpoint berbeda. Tes berikut
 * menjaga agar penggantinya berperilaku satu macam, dan agar variabel
 * lingkungan yang salah isi tidak diam-diam mematikan batasnya.
 */

function denganEnv(nilai: string | undefined, jalankan: () => void) {
  const sebelumnya = process.env.UPLOAD_MAX_MB
  if (nilai === undefined) delete process.env.UPLOAD_MAX_MB
  else process.env.UPLOAD_MAX_MB = nilai
  try {
    jalankan()
  } finally {
    if (sebelumnya === undefined) delete process.env.UPLOAD_MAX_MB
    else process.env.UPLOAD_MAX_MB = sebelumnya
  }
}

test("tanpa variabel lingkungan, batasnya tetap 2 MB seperti sebelumnya", () => {
  denganEnv(undefined, () => {
    assert.equal(batasUnggahMb(), 2)
    assert.equal(batasUnggahByte(), 2 * 1024 * 1024)
  })
})

test("variabel lingkungan menaikkan batas", () => {
  denganEnv("10", () => {
    assert.equal(batasUnggahMb(), 10)
    assert.equal(periksaUkuranUnggahan(9 * 1024 * 1024, "foto nota"), null)
  })
})

test("isi yang tidak masuk akal diabaikan, bukan dipakai", () => {
  // Salah ketik pada variabel lingkungan tidak boleh berakhir dengan batas
  // nol atau batas yang hilang sama sekali.
  for (const isi of ["", "   ", "abc", "0", "-5"]) {
    denganEnv(isi, () => {
      assert.equal(batasUnggahMb(), 2, `isi ${JSON.stringify(isi)} seharusnya jatuh ke bawaan`)
    })
  }
})

test("berkas tepat sebesar batas masih diterima", () => {
  denganEnv(undefined, () => {
    assert.equal(periksaUkuranUnggahan(2 * 1024 * 1024, "bukti transfer"), null)
    assert.equal(periksaUkuranUnggahan(2 * 1024 * 1024 + 1, "bukti transfer"), "Ukuran bukti transfer maksimal 2 MB.")
  })
})

test("pesan galat menyebut nama berkas menurut layarnya", () => {
  denganEnv(undefined, () => {
    assert.equal(periksaUkuranUnggahan(5_000_000, "nota pelunasan"), "Ukuran nota pelunasan maksimal 2 MB.")
    assert.equal(periksaUkuranUnggahan(5_000_000, "bukti transfer"), "Ukuran bukti transfer maksimal 2 MB.")
  })
})
