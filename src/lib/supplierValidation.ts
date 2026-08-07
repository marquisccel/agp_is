/**
 * Validasi format kontak dan rekening supplier (Fase 6 - Kualitas Data).
 *
 * Ambang panjang digit rekening (5-20) mengikuti rentang umum nomor
 * rekening bank/e-wallet di Indonesia; format nomor WA mengikuti pola
 * nomor seluler Indonesia (08xx / +628xx / 628xx). Kedua ambang ini
 * asumsi teknis, bukan aturan bisnis yang sudah dikonfirmasi stakeholder --
 * lihat catatan pertanyaan terbuka pada roadmap Fase 6.
 */

export function normalizeWaNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "")
  if (digits.startsWith("+62")) return "0" + digits.slice(3)
  if (digits.startsWith("62")) return "0" + digits.slice(2)
  return digits
}

export function isValidIndonesianWaNumber(value: string): boolean {
  const normalized = normalizeWaNumber(value)
  return /^08\d{8,12}$/.test(normalized)
}

export function isValidBankAccountNumber(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "")
  return /^\d{5,20}$/.test(digits)
}

export function validateSupplierContactFields(input: {
  kontak_wa?: string | null
  nomor_rekening?: string | null
}): string | null {
  const wa = input.kontak_wa?.trim()
  if (wa && !isValidIndonesianWaNumber(wa)) {
    return "Format nomor WA tidak valid. Gunakan format 08xxxxxxxxxx atau +628xxxxxxxxxx."
  }

  const rekening = input.nomor_rekening?.trim()
  if (rekening && !isValidBankAccountNumber(rekening)) {
    return "Nomor rekening harus berupa 5-20 digit angka."
  }

  return null
}
