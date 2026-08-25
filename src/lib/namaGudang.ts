/**
 * Nama gudang untuk ditampilkan di layar -- SATU sumber kebenaran.
 *
 * Kolom `nama` di basis data hanya memuat kotanya ("Kediri", "Madiun",
 * "Malang"), tanpa kata bendanya. Ditampilkan apa adanya, label seperti
 * "Kediri" di daftar pilihan tidak menjelaskan sedang memilih apa, jadi
 * kata "Gudang" ditempelkan di sini.
 *
 * Kenapa dijadikan satu fungsi: penempelan ini sebelumnya ditulis ulang
 * di tujuh berkas, masing-masing menyalin pola pembuang awalan yang sama,
 * dan sudah sempat berbeda-beda isinya. Sebagian menulis "CC", sebagian
 * "Collection Center", sebagian "Gudang / CC" -- padahal menu, data
 * bawaan, dan seluruh dokumennya menyebut gudang.
 *
 * Awalan yang sudah ada dibuang lebih dulu supaya gudang yang terlanjur
 * dinamai "Gudang Kediri" tidak terbaca "Gudang Gudang Kediri".
 */
export function namaGudang(nama: string | null | undefined): string {
  const bersih = (nama ?? "").trim().replace(/^gudang\s+/i, "")
  return bersih ? `Gudang ${bersih}` : "Gudang tidak diketahui"
}
