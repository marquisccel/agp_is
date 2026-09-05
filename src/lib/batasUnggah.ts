/**
 * Batas ukuran berkas yang boleh diunggah.
 *
 * Angkanya dulu ditulis langsung di dua endpoint yang berbeda, yaitu
 * penandaan transfer dan pelunasan termin, masing-masing dengan pesan
 * galatnya sendiri. Selama nilainya kebetulan sama, tidak ada yang
 * kelihatan salah. Begitu salah satu dinaikkan dan yang lain tidak,
 * pengguna akan menemui dua aturan berbeda pada aplikasi yang sama tanpa
 * penjelasan apa pun.
 *
 * ── Kenapa bisa diatur lewat variabel lingkungan ──────────────────────
 *
 * Batas 2 MB menolak hampir semua foto kamera telepon genggam masa kini,
 * yang lazimnya berukuran 3 sampai 5 MB. Untuk pemakaian sehari-hari
 * batas itu memang disengaja supaya biaya penyimpanan terkendali, tetapi
 * pengukuran yang membandingkan unggahan tanpa kompresi terhadap unggahan
 * terkompresi mustahil dijalankan kalau berkas aslinya ditolak lebih dulu.
 *
 * Nilai bawaannya tetap 2 MB, jadi perilaku produksi tidak berubah sampai
 * ada yang benar-benar mengubah variabelnya.
 *
 * Catatan penting: menaikkan angka ini TIDAK menaikkan batas yang
 * dipaksakan pelantar. Fungsi serverless punya batas ukuran badan
 * permintaannya sendiri, dan berkas yang melampauinya ditolak sebelum kode
 * ini sempat berjalan.
 */

const BAWAAN_MB = 2

/** Batas dalam megabyte, dibaca sekali saat modul dimuat. */
export function batasUnggahMb(): number {
  const mentah = process.env.UPLOAD_MAX_MB?.trim()
  if (!mentah) return BAWAAN_MB

  const angka = Number(mentah)
  // Nilai yang tidak masuk akal diabaikan, bukan dipakai. Salah ketik pada
  // variabel lingkungan seharusnya tidak diam-diam mematikan batasnya.
  if (!Number.isFinite(angka) || angka <= 0) return BAWAAN_MB
  return angka
}

export function batasUnggahByte(): number {
  return Math.round(batasUnggahMb() * 1024 * 1024)
}

/**
 * Memeriksa ukuran berkas. Mengembalikan pesan galat siap tampil, atau
 * null kalau ukurannya masih boleh.
 *
 * Pesannya menyebut nama berkas menurut istilah yang dipakai pengguna di
 * layar bersangkutan, bukan istilah teknis, dan menyebut batasnya supaya
 * pengguna tahu harus berbuat apa.
 */
export function periksaUkuranUnggahan(ukuran: number, namaBerkas: string): string | null {
  const batas = batasUnggahByte()
  if (ukuran <= batas) return null
  return `Ukuran ${namaBerkas} maksimal ${batasUnggahMb()} MB.`
}
