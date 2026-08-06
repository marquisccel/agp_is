/**
 * Sumber tunggal perhitungan nilai transaksi pembelian.
 *
 * Memperbaiki D-3: sebelumnya verifikasi gudang (double-check) dan edit
 * transaksi memakai dua formula berbeda untuk angka yang sama --
 * double-check mengurangi memakai kelompok field `potongan_*`, sementara
 * edit transaksi memakai kelompok field `harga_potongan_*`, dan edit
 * transaksi juga mengabaikan potongan retur yang tersimpan serta tidak
 * menghitung ulang total dibayar, berat final, dan field termin.
 *
 * Seluruh jalur yang mengubah nilai transaksi wajib memakai modul ini.
 */

export type PurchaseTotalsInput = {
  /** Jumlah subtotal seluruh item, sebelum potongan apa pun. */
  totalNilaiSebelumRetur: number
  /** Total potongan dari seluruh retur item. */
  totalPotonganRetur: number
  potonganSampah: number
  potonganSusut: number
  potonganAir: number
  potonganKarung: number
  /** Nominal DP supplier yang dipakai sebagai pengurang pembayaran. */
  dpDigunakan: number
  /** Persentase pembayaran di muka; 100 berarti lunas di muka. */
  persentasePembayaran: number
}

export type PurchaseTotals = {
  totalNilaiSebelumRetur: number
  totalPotonganRetur: number
  totalNilaiSetelahRetur: number
  totalPotonganLain: number
  /** Nilai bersih sebelum dikurangi DP. */
  totalNetPayout: number
  /** Nilai akhir yang harus dibayarkan ke supplier, setelah dikurangi DP. */
  totalDibayar: number
  nominalPembayaranAwal: number
  nominalBelumLunas: number
  statusPelunasan: "LUNAS" | "BELUM_LUNAS"
}

export class PurchaseCalculationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PurchaseCalculationError"
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function calculatePurchaseTotals(input: PurchaseTotalsInput): PurchaseTotals {
  const {
    totalNilaiSebelumRetur,
    totalPotonganRetur,
    potonganSampah,
    potonganSusut,
    potonganAir,
    potonganKarung,
    dpDigunakan,
    persentasePembayaran,
  } = input

  const totalNilaiSetelahRetur = totalNilaiSebelumRetur - totalPotonganRetur
  const totalPotonganLain = potonganSampah + potonganSusut + potonganAir + potonganKarung
  const totalNetPayout = totalNilaiSetelahRetur - totalPotonganLain
  const totalDibayar = totalNetPayout - dpDigunakan

  if (totalNetPayout < 0 || totalDibayar < 0) {
    throw new PurchaseCalculationError(
      "Total pembayaran tidak boleh negatif. Periksa potongan, retur, dan DP yang digunakan."
    )
  }

  const isTermin = persentasePembayaran < 100
  const nominalPembayaranAwal = isTermin
    ? round2((totalDibayar * persentasePembayaran) / 100)
    : totalDibayar
  const nominalBelumLunas = isTermin ? round2(totalDibayar - nominalPembayaranAwal) : 0

  if (isTermin && (nominalPembayaranAwal <= 0 || nominalPembayaranAwal > totalDibayar || nominalBelumLunas < 0)) {
    throw new PurchaseCalculationError("Skema pembayaran termin tidak valid.")
  }

  return {
    totalNilaiSebelumRetur,
    totalPotonganRetur,
    totalNilaiSetelahRetur,
    totalPotonganLain,
    totalNetPayout,
    totalDibayar,
    nominalPembayaranAwal,
    nominalBelumLunas,
    statusPelunasan: isTermin ? "BELUM_LUNAS" : "LUNAS",
  }
}

/**
 * Menentukan berat yang dipakai sebagai dasar perhitungan nilai item,
 * sesuai metode timbangan yang dipilih.
 */
export function resolveWeightForPricing(
  metode: string | null | undefined,
  beratLapak: number,
  beratGudang: number
) {
  return metode === "TIMBANGAN_LAPAK" ? beratLapak : beratGudang
}

export type SkuPriceStandardLike = { sku_name: string; max_price_per_kg: number }
export type PricedItemLike = { sku_name: string; harga_per_kg: number }

/**
 * Memeriksa apakah terdapat item dengan harga melebihi standar SKU gudang.
 * Kontrol hanya aktif untuk SKU yang standarnya sudah ditetapkan.
 */
export function hasPriceAboveStandard(
  items: PricedItemLike[],
  standards: SkuPriceStandardLike[]
): boolean {
  return items.some((item) => {
    const standard = standards.find((s) => s.sku_name === item.sku_name)
    return !!standard && item.harga_per_kg > standard.max_price_per_kg
  })
}
