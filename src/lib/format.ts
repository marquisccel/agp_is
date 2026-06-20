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
