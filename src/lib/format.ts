/**
 * Utility: Format angka Indonesia
 * 5000       → "5.000"
 * 5000000    → "5.000.000"
 * 5000.5     → "5.000,5"
 */

/** Format angka bulat atau desimal, pisah ribuan pakai titik */
export function fmtAngka(v: number, desimal = 0): string {
  return v.toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  })
}

/** Format berat kg → tampil "5.000 KG" */
export function fmtKg(v: number, useUpperCase = true): string {
  const unit = useUpperCase ? "KG" : "kg"
  return `${fmtAngka(v)} ${unit}`
}

/** Format berat ton → tampil "5 ton" atau "5.000 ton" */
export function fmtTon(vInKg: number): string {
  const ton = vInKg / 1000
  const decimalPlaces = ton % 1 === 0 ? 0 : (ton % 0.1 === 0 ? 1 : 2)
  return `${fmtAngka(ton, decimalPlaces)} ton`
}

/** Format Rupiah, contoh Rp 5.000.000 */
export function fmtRp(v: number): string {
  return `Rp ${fmtAngka(v)}`
}

/** Format Rupiah per kg, contoh Rp 11.000/KG */
export function fmtRpPerKg(v: number): string {
  return `Rp ${fmtAngka(v)}/KG`
}

/** Format persentase */
export function fmtPct(v: number, desimal = 1): string {
  return `${fmtAngka(v, desimal)}%`
}

/**
 * Sebut besaran nominal dalam satuan yang gampang dibaca manusia:
 * 750000 → "750 ribu", 15000000 → "15 juta", 1500000 → "1,5 juta".
 *
 * Dipakai sebagai pendamping input rupiah supaya orang tidak salah baca
 * ratusan ribu vs jutaan hanya dari jumlah digit.
 */
export function fmtSkalaRupiah(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return ""

  const satuan: { batas: number; nama: string }[] = [
    { batas: 1_000_000_000_000, nama: "triliun" },
    { batas: 1_000_000_000, nama: "miliar" },
    { batas: 1_000_000, nama: "juta" },
    { batas: 1_000, nama: "ribu" },
  ]

  for (const { batas, nama } of satuan) {
    if (v >= batas) {
      const hasil = v / batas
      // Tampilkan desimal hanya kalau memang ada sisa (1,5 juta), supaya
      // angka bulat tidak jadi "15,0 juta".
      const desimal = Number.isInteger(hasil) ? 0 : 1
      return `${fmtAngka(hasil, desimal)} ${nama}`
    }
  }

  return fmtAngka(v)
}

/**
 * Sisipkan pemisah ribuan ke string berisi digit mentah (untuk input yang
 * diketik user): "15000000" → "15.000.000". Non-digit diabaikan.
 */
export function fmtDigitInput(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("id-ID")
}
