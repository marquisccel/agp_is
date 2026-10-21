/**
 * Tanggal pembelian pada nota.
 *
 * Arahan Manager 21 Okt 2026: barang bisa dibeli tanggal 10 tetapi nota baru
 * dibuat tanggal 13. Tanpa tanggal pembelian, nota itu tercatat tanggal 13
 * dan seluruh laporan serta target harian ikut salah hari.
 *
 * Yang dimaksud "tanggal pembelian" adalah kolom Purchase.tanggal yang sudah
 * ada sejak awal (bawaannya now()). Kolom createdAt tetap berarti kapan nota
 * diketik, dan dipakai untuk urutan antrean dan jejak audit.
 *
 * ── Hari dihitung menurut WIB ──────────────────────────────────────────
 *
 * Batas hari di sistem ini selalu WIB (UTC+7); target harian, mingguan, dan
 * bulanan dihitung dengan geseran yang sama. Tanggal yang dipilih pengguna
 * karena itu juga ditafsirkan sebagai tanggal WIB, bukan UTC. Tanggal yang
 * dipilih lalu disimpan pada pukul 12.00 WIB: jauh dari kedua batas hari,
 * sehingga geseran zona waktu apa pun tidak memindahkannya ke hari lain.
 * Bila yang dipilih adalah HARI INI, waktu sebenarnya yang disimpan, supaya
 * urutan nota pada hari yang sama tetap benar.
 */

const WIB_MS = 7 * 60 * 60 * 1000
const HARI_MS = 24 * 60 * 60 * 1000

/** Batas mundur untuk Staff. Admin dan Manager tidak dibatasi ke belakang. */
export const MAKS_HARI_MUNDUR_STAFF = 31

/** Tanggal WIB sebagai "YYYY-MM-DD". */
export function tanggalWib(d: Date): string {
  return new Date(d.getTime() + WIB_MS).toISOString().slice(0, 10)
}

export function hariIniWib(sekarang: Date = new Date()): string {
  return tanggalWib(sekarang)
}

/** "YYYY-MM-DD" untuk n hari sebelum hari ini (WIB). */
export function hariMundurWib(n: number, sekarang: Date = new Date()): string {
  return tanggalWib(new Date(sekarang.getTime() - n * HARI_MS))
}

export type HasilTanggal = { ok: true; tanggal: Date } | { ok: false; error: string }

/**
 * Memeriksa tanggal pembelian dari isian pengguna.
 *
 * @param maksHariMundur  null = tidak dibatasi ke belakang.
 */
export function periksaTanggalPembelian(
  masukan: unknown,
  opsi: { maksHariMundur: number | null; sekarang?: Date }
): HasilTanggal {
  const sekarang = opsi.sekarang ?? new Date()
  if (typeof masukan !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(masukan)) {
    return { ok: false, error: "Tanggal pembelian tidak valid." }
  }
  const [y, m, d] = masukan.split("-").map(Number)
  const kalender = new Date(Date.UTC(y, m - 1, d))
  // Date.UTC menggulung 31 Feb menjadi 3 Mar; perbandingan balik menolaknya.
  if (kalender.getUTCFullYear() !== y || kalender.getUTCMonth() !== m - 1 || kalender.getUTCDate() !== d) {
    return { ok: false, error: "Tanggal pembelian tidak valid." }
  }

  const hariIni = tanggalWib(sekarang)
  if (masukan > hariIni) {
    return { ok: false, error: "Tanggal pembelian tidak boleh di masa depan." }
  }
  if (opsi.maksHariMundur !== null && masukan < hariMundurWib(opsi.maksHariMundur, sekarang)) {
    return { ok: false, error: `Tanggal pembelian paling lama ${opsi.maksHariMundur} hari ke belakang.` }
  }

  if (masukan === hariIni) return { ok: true, tanggal: sekarang }
  // 12.00 WIB = 05.00 UTC
  return { ok: true, tanggal: new Date(Date.UTC(y, m - 1, d, 5, 0, 0)) }
}
