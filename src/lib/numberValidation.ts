export type NumericInput = number | string | null | undefined

export function optionalFiniteNumber(value: NumericInput, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback
  const parsed = typeof value === "number" ? value : Number(String(value).trim())
  if (!Number.isFinite(parsed)) {
    throw new Error("Input numerik tidak valid.")
  }
  return parsed
}

export function nonNegativeNumber(value: NumericInput, fieldName: string, fallback = 0) {
  const parsed = optionalFiniteNumber(value, fallback)
  if (parsed < 0) {
    throw new Error(`${fieldName} tidak boleh bernilai negatif.`)
  }
  return parsed
}

export function positiveNumber(value: NumericInput, fieldName: string) {
  const parsed = optionalFiniteNumber(value, Number.NaN)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} harus lebih besar dari 0.`)
  }
  return parsed
}

export function percentageNumber(value: NumericInput, fieldName: string, fallback = 100) {
  const parsed = nonNegativeNumber(value, fieldName, fallback)
  if (parsed > 100) {
    throw new Error(`${fieldName} tidak boleh lebih dari 100.`)
  }
  return parsed
}

export function positiveInteger(value: NumericInput, fieldName: string, fallback?: number) {
  const parsed = fallback === undefined
    ? positiveNumber(value, fieldName)
    : optionalFiniteNumber(value, fallback)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} harus berupa angka bulat lebih dari 0.`)
  }

  return parsed
}
