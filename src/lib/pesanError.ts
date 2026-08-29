/**
 * Mengambil pesan yang bisa dibaca manusia dari apa pun yang dilempar.
 *
 * Sebelumnya setiap blok catch di layar-layar formulir ditulis
 * `catch (err: any)` lalu langsung memakai `err.message`. Dua hal salah di
 * situ, dan yang kedua bukan sekadar soal tipe:
 *
 * 1. `throw` di JavaScript boleh melempar APA SAJA -- string, angka,
 *    objek biasa, bahkan undefined. Yang dilempar `fetch` saat jaringan
 *    putus memang Error, tapi yang dilempar pustaka lain belum tentu.
 *    Kalau yang datang bukan Error, `err.message` bernilai undefined dan
 *    yang tampil di layar adalah kotak galat kosong: pengguna tahu ada
 *    yang gagal, tapi tidak tahu apa.
 *
 * 2. `any` mematikan pemeriksaan tipe di seluruh ekspresi yang
 *    menyentuhnya, jadi salah ketik nama field pun lolos begitu saja.
 *
 * Dengan satu fungsi ini, semua layar memperlakukan kegagalan dengan cara
 * yang sama dan selalu punya kalimat untuk ditampilkan.
 */
export function pesanError(e: unknown, cadangan = "Terjadi kesalahan yang tidak terduga."): string {
  if (e instanceof Error && e.message) return e.message
  // Beberapa pustaka melempar string apa adanya, bukan objek Error.
  if (typeof e === "string" && e.trim()) return e
  return cadangan
}
