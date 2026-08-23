/**
 * Perhitungan pencatatan pembayaran atas sisa sebuah nota.
 *
 * Dipisah dari route-nya supaya bisa diuji tanpa basis data maupun
 * penyimpanan berkas -- lihat tests/settlement.test.ts. Yang diuji di sana
 * bukan tampilannya, tapi hal yang dulu keliru: berapa pun yang benar-benar
 * dibayar, notanya langsung ditandai LUNAS, sehingga kekurangannya hilang
 * dari sistem.
 */

export class SettlementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SettlementError"
  }
}

export type HasilPelunasan = {
  /** Yang dicatat dibayar pada langkah ini. */
  dibayar: number
  /** Sisa setelah pembayaran ini. */
  sisa: number
  lunas: boolean
  /** Akumulasi yang sudah dibayar, untuk disimpan ke nominal_pembayaran_awal. */
  sudahDibayar: number
  persentasePembayaran: number
  statusPelunasan: "LUNAS" | "BELUM_LUNAS"
}

const bulat2 = (n: number) => Math.round(n * 100) / 100

/** Toleransi satu rupiah untuk pembulatan yang datang dari sisi klien. */
const TOLERANSI = 1

export function hitungPelunasan({
  sisaSekarang,
  sudahDibayarSebelumnya,
  nominal,
}: {
  sisaSekarang: number
  sudahDibayarSebelumnya: number
  /** Kosong berarti melunasi seluruh sisa. */
  nominal?: number | null
}): HasilPelunasan {
  if (sisaSekarang <= 0) {
    throw new SettlementError("Transaksi ini tidak memiliki sisa yang perlu dibayar.")
  }

  let dibayar = sisaSekarang
  if (nominal != null) {
    if (!Number.isFinite(nominal) || nominal <= 0) {
      throw new SettlementError("Nominal pembayaran harus lebih dari nol.")
    }
    if (nominal - sisaSekarang > TOLERANSI) {
      throw new SettlementError(
        `Nominal melebihi sisa yang harus dibayar (${Math.round(sisaSekarang).toLocaleString("id-ID")}).`,
      )
    }
    dibayar = Math.min(nominal, sisaSekarang)
  }

  const sisa = bulat2(sisaSekarang - dibayar)
  // Sisa di bawah satu sen dianggap nol: pembayaran penuh yang dihitung
  // dari persentase bisa menyisakan pecahan yang tidak akan pernah dibayar.
  const lunas = sisa <= 0.01
  const sudahDibayar = bulat2(sudahDibayarSebelumnya + dibayar)
  const nilaiTransfer = bulat2(sudahDibayar + (lunas ? 0 : sisa))

  return {
    dibayar,
    sisa: lunas ? 0 : sisa,
    lunas,
    sudahDibayar,
    persentasePembayaran: lunas || nilaiTransfer <= 0 ? 100 : bulat2((sudahDibayar / nilaiTransfer) * 100),
    statusPelunasan: lunas ? "LUNAS" : "BELUM_LUNAS",
  }
}

export type HasilKoreksi = {
  /** Kekurangan yang dibuka kembali. */
  kurang: number
  /** Yang benar-benar sudah dibayar setelah dikoreksi. */
  sudahDibayar: number
  /** Total yang harus diterima lapak setelah potongan kasbon. */
  kewajiban: number
  persentasePembayaran: number
}

/**
 * Membuka kembali nota yang terlanjur ditandai LUNAS karena ternyata
 * pembayarannya kurang.
 *
 * Ini jalur koreksi, bukan alur normal: satu-satunya cara sebuah nota
 * kembali berstatus BELUM_LUNAS setelah ditutup. Angkanya sengaja
 * diturunkan dari `kewajiban`, bukan diterima apa adanya, supaya invarian
 * yang diperiksa scripts/audit-data.mjs tetap terjaga:
 *
 *   nominal_pembayaran_awal + nominal_belum_lunas = nilai nota - kasbon
 *
 * Kalau kekurangannya ditulis begitu saja tanpa mengoreksi sisi "sudah
 * dibayar", kedua angka itu berhenti berjumlah sama dengan kewajibannya
 * dan basis datanya jadi tidak konsisten.
 */
export function hitungKoreksiKekurangan({
  kewajiban,
  kurang,
}: {
  kewajiban: number
  kurang: number
}): HasilKoreksi {
  if (kewajiban <= 0) {
    throw new SettlementError("Nota ini tidak memiliki kewajiban pembayaran ke lapak.")
  }
  if (!Number.isFinite(kurang) || kurang <= 0) {
    throw new SettlementError("Nominal kekurangan harus lebih dari nol.")
  }
  if (kurang - kewajiban > TOLERANSI) {
    throw new SettlementError(
      `Kekurangan tidak boleh melebihi kewajiban ke lapak (${Math.round(kewajiban).toLocaleString("id-ID")}).`,
    )
  }

  const kurangDipakai = Math.min(kurang, kewajiban)
  const sudahDibayar = bulat2(kewajiban - kurangDipakai)

  return {
    kurang: bulat2(kurangDipakai),
    sudahDibayar,
    kewajiban: bulat2(kewajiban),
    persentasePembayaran: bulat2((sudahDibayar / kewajiban) * 100),
  }
}

type NotaKewajiban = {
  total_nilai_setelah_retur?: number | null
  potongan_sampah?: number | null
  potongan_susut?: number | null
  potongan_air?: number | null
  potongan_karung?: number | null
  dp_yang_digunakan?: number | null
}

/**
 * Total yang harus diterima lapak untuk sebuah nota, setelah potongan dan
 * setelah saldo kasbonnya dipakai.
 *
 * Rumusnya harus SAMA PERSIS dengan yang dipakai scripts/audit-data.mjs
 * saat memeriksa "pembayaran awal + sisa = nilai nota - kasbon". Karena
 * itu ia tinggal di satu tempat: endpoint koreksi memakainya untuk
 * menentukan batas, dan layar memakainya untuk menampilkan batas yang
 * sama. Kalau keduanya menghitung sendiri-sendiri, selisih sekecil apa pun
 * membuat koreksi yang lolos di layar ditolak di server -- atau lebih
 * buruk, tersimpan lalu dilaporkan melanggar oleh auditnya sendiri.
 */
export function kewajibanKeLapak(nota: NotaKewajiban): number {
  const nilaiNota =
    (nota.total_nilai_setelah_retur ?? 0) -
    ((nota.potongan_sampah ?? 0) +
      (nota.potongan_susut ?? 0) +
      (nota.potongan_air ?? 0) +
      (nota.potongan_karung ?? 0))
  return bulat2(nilaiNota - (nota.dp_yang_digunakan ?? 0))
}
