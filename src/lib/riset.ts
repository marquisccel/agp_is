/**
 * Sakelar untuk perangkat pengukuran penelitian.
 *
 * Halaman harness dan endpoint penerimanya bukan bagian dari alur kerja
 * perusahaan. Keduanya hanya hidup kalau RISET_ENABLED diisi "true", dan
 * di produksi variabel itu dibiarkan kosong sehingga keduanya menjawab
 * seperti alamat yang memang tidak ada.
 *
 * Diletakkan pada satu berkas supaya halaman dan endpointnya tidak bisa
 * hidup sendiri-sendiri. Kalau syaratnya ditulis dua kali, cepat atau
 * lambat yang satu diubah dan yang lain tertinggal.
 */
export function risetAktif(): boolean {
  return process.env.RISET_ENABLED?.trim().toLowerCase() === "true"
}
