/**
 * Rincian timbangan gudang per SKU.
 *
 * Satu SKU biasanya terdiri dari banyak karung yang ditimbang bergantian di
 * gudang: timbangan pertama sekian kilo dan sekian karung, timbangan kedua,
 * dan seterusnya. Rincian itu disimpan di PurchaseItem.rincian_timbangan
 * (JSON, boleh kosong) supaya Manager dapat menelusuri dari mana berat final
 * sebuah SKU berasal -- bukan hanya angka totalnya.
 *
 * Kolomnya sengaja boleh kosong: nota lama dan nota yang tidak ditimbang
 * per putaran tetap sah tanpa rincian.
 */

export type BarisTimbangan = { kg: number; karung: number }
export type RincianTimbangan = BarisTimbangan[]

/** Batas wajar satu SKU; mencegah isian ngawur memenuhi baris basis data. */
const MAKS_BARIS = 200

const bulat2 = (n: number) => Math.round(n * 100) / 100

/**
 * Merapikan masukan rincian dari klien. Mengembalikan null bila kosong
 * (tidak ada baris yang berisi), dan melempar galat bila bentuknya salah.
 * Baris yang kilogram dan karungnya sama-sama nol dibuang: itu baris
 * kosong yang belum diisi, bukan timbangan.
 */
export function normalisasiRincian(input: unknown): RincianTimbangan | null {
  if (input === null || input === undefined) return null
  if (!Array.isArray(input)) throw new Error("Rincian timbangan tidak valid.")
  if (input.length > MAKS_BARIS) throw new Error("Rincian timbangan terlalu banyak baris.")

  const hasil: RincianTimbangan = []
  for (const baris of input) {
    if (typeof baris !== "object" || baris === null) throw new Error("Rincian timbangan tidak valid.")
    const { kg, karung } = baris as Record<string, unknown>
    const kgAngka = kg === undefined || kg === null || kg === "" ? 0 : Number(kg)
    const karungAngka = karung === undefined || karung === null || karung === "" ? 0 : Number(karung)
    if (!Number.isFinite(kgAngka) || !Number.isFinite(karungAngka)) {
      throw new Error("Rincian timbangan tidak valid.")
    }
    if (kgAngka < 0 || karungAngka < 0) {
      throw new Error("Rincian timbangan tidak boleh bernilai negatif.")
    }
    if (kgAngka === 0 && karungAngka === 0) continue
    hasil.push({ kg: bulat2(kgAngka), karung: Math.round(karungAngka) })
  }
  return hasil.length > 0 ? hasil : null
}

export function totalRincian(rincian: RincianTimbangan | null | undefined) {
  const baris = rincian ?? []
  return {
    kg: bulat2(baris.reduce((s, b) => s + b.kg, 0)),
    karung: baris.reduce((s, b) => s + b.karung, 0),
  }
}

/** Rincian cocok bila jumlah kilogramnya sama dengan berat final (toleransi 0,01). */
export function rincianCocok(rincian: RincianTimbangan | null | undefined, beratFinal: number): boolean {
  if (!rincian || rincian.length === 0) return false
  return Math.abs(totalRincian(rincian).kg - beratFinal) <= 0.011
}

/**
 * Membaca nilai JSON dari basis data menjadi rincian yang aman dipakai
 * layar. Nilai yang bentuknya tidak dikenal dianggap tidak ada, bukan
 * dilempar: halaman detail tidak boleh gagal tampil karena satu baris aneh.
 */
export function bacaRincian(nilai: unknown): RincianTimbangan | null {
  try {
    return normalisasiRincian(nilai)
  } catch {
    return null
  }
}
