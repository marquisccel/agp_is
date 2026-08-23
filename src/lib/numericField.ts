/**
 * Keadaan sebuah isian angka: teks yang terlihat di layar, dan nilai
 * number yang dipakai perhitungan.
 *
 * Dipisah dari komponennya supaya perilaku mengetik bisa diuji tanpa
 * DOM -- lihat tests/numericField.test.ts. Yang diuji di sana bukan
 * tampilannya, tapi kasus yang dulu salah: mengetik "0,5" menghasilkan
 * angka 5.
 */

export type KeadaanIsian = {
  /** Apa adanya yang diketik, termasuk keadaan setengah jadi seperti "0," */
  teks: string
  /** Hasil parse; ini yang dikirim ke perhitungan. */
  nilai: number
}

/**
 * Buang karakter yang tidak mungkin jadi bagian angka, dan sisakan satu
 * pemisah desimal saja. Koma dibiarkan apa adanya di teks -- di
 * Indonesia pemisah desimal memang koma, dan sebelumnya mengetik "0,5"
 * menghasilkan 0 karena parseFloat berhenti di koma.
 */
export function bersihkan(mentah: string): string {
  let hasil = ""
  let sudahAdaPemisah = false
  for (const ch of mentah) {
    if (ch >= "0" && ch <= "9") {
      hasil += ch
    } else if ((ch === "." || ch === ",") && !sudahAdaPemisah) {
      hasil += ch
      sudahAdaPemisah = true
    } else if (ch === "-" && hasil === "") {
      hasil += ch
    }
  }
  return hasil
}

export function nilaiDariTeks(mentah: string): number {
  return parseFloat(bersihkan(mentah).replace(",", ".")) || 0
}

/** Keadaan awal saat isian pertama kali dirender dari data yang ada. */
export function isianAwal(nilai: number): KeadaanIsian {
  return { teks: nilai ? String(nilai) : "", nilai }
}

/**
 * Satu kali perubahan isi kolom.
 *
 * Kuncinya: `teks` disimpan apa adanya (setelah dibersihkan). Pendekatan
 * lama menurunkan teks dari nilai number (`nilai || ""`), sehingga
 * mengetik "0" langsung mengosongkan kolom -- dan karakter berikutnya
 * menempel di kolom kosong, bukan di belakang "0".
 */
export function ketik(mentah: string): KeadaanIsian {
  const teks = bersihkan(mentah)
  return { teks, nilai: nilaiDariTeks(teks) }
}

/**
 * Nilai diubah dari luar (form direset, data dimuat ulang). Teks harus
 * ikut ditimpa. Tapi kalau nilainya sama dengan yang sedang diketik,
 * teks dibiarkan -- kalau tidak, "0," akan langsung terhapus jadi ""
 * di tengah ketikan, karena keduanya sama-sama bernilai 0.
 */
export function sinkronDariLuar(sekarang: KeadaanIsian, nilaiLuar: number): KeadaanIsian {
  if (nilaiLuar === sekarang.nilai) return sekarang
  return isianAwal(nilaiLuar)
}

/**
 * Varian khusus nominal rupiah: hanya bilangan bulat, ditampilkan dengan
 * pemisah ribuan.
 *
 * Kenapa desimalnya dimatikan, bukan ikut diformat: di Indonesia titik
 * adalah pemisah ribuan dan koma pemisah desimal, sementara bersihkan()
 * menerima keduanya sebagai pemisah desimal. Kalau "1.5" boleh diketik
 * DAN titik juga dipakai sebagai pemisah ribuan, angka yang sama bisa
 * terbaca 1,5 atau 1.500 -- pada kolom uang, salah baca itu langsung jadi
 * salah rupiah. Seluruh nominal di sistem ini memang bulat (rupiah
 * ditampilkan tanpa sen di mana pun), jadi pilihan yang aman adalah
 * menolak pemisah desimal sama sekali di kolom bertanda ribuan.
 */
export function hanyaAngkaBulat(mentah: string): string {
  let hasil = ""
  for (const ch of mentah) {
    if (ch >= "0" && ch <= "9") hasil += ch
    else if (ch === "-" && hasil === "") hasil += ch
  }
  return hasil
}

/** "15000000" -> "15.000.000". Teks kosong tetap kosong. */
export function denganPemisahRibuan(teks: string): string {
  const bersih = hanyaAngkaBulat(teks)
  if (bersih === "" || bersih === "-") return bersih
  const negatif = bersih.startsWith("-")
  const angka = negatif ? bersih.slice(1) : bersih
  // Nol di depan dibuang lewat Number(), supaya "007" tampil "7".
  return (negatif ? "-" : "") + Number(angka).toLocaleString("id-ID")
}

export function ketikRibuan(mentah: string): KeadaanIsian {
  const teks = hanyaAngkaBulat(mentah)
  return { teks, nilai: teks === "" || teks === "-" ? 0 : Number(teks) }
}
