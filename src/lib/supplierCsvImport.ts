/**
 * Import massal koordinat supplier dari CSV (Fase 6 - Kualitas Data).
 *
 * Format kolom mengikuti penamaan yang sudah dipakai pada seksi supplier
 * export (lihat manager/export/route.ts): nama, gudang, latitude,
 * longitude, link. Delimiter didukung ";" (konsisten dengan export CSV
 * yang sudah ada) maupun ",".
 */

export type SupplierCsvRow = {
  rowNumber: number
  nama: string
  gudang: string
  latitude: string
  longitude: string
  link: string
}

export type SupplierCsvParseResult = {
  rows: SupplierCsvRow[]
  errors: { rowNumber: number; message: string }[]
}

const REQUIRED_COLUMNS = ["nama", "gudang"] as const
const KNOWN_COLUMNS = ["nama", "gudang", "latitude", "longitude", "link"] as const

function detectDelimiter(headerLine: string): string {
  return headerLine.includes(";") ? ";" : ","
}

function splitCsvLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""))
}

export function parseSupplierCoordinateCsv(csvText: string): SupplierCsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, message: "Berkas CSV kosong." }] }
  }

  const delimiter = detectDelimiter(lines[0])
  const header = splitCsvLine(lines[0], delimiter).map((h) => h.toLowerCase())

  const missingColumns = REQUIRED_COLUMNS.filter((col) => !header.includes(col))
  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Kolom wajib tidak ditemukan: ${missingColumns.join(", ")}. Kolom yang dikenali: ${KNOWN_COLUMNS.join(", ")}.`,
        },
      ],
    }
  }

  const columnIndex = Object.fromEntries(header.map((name, idx) => [name, idx])) as Record<string, number>
  const rows: SupplierCsvRow[] = []
  const errors: SupplierCsvParseResult["errors"] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1
    const cells = splitCsvLine(lines[i], delimiter)
    const nama = cells[columnIndex.nama] ?? ""
    const gudang = cells[columnIndex.gudang] ?? ""

    if (!nama || !gudang) {
      errors.push({ rowNumber, message: "Kolom nama dan gudang wajib diisi." })
      continue
    }

    rows.push({
      rowNumber,
      nama,
      gudang,
      latitude: columnIndex.latitude !== undefined ? cells[columnIndex.latitude] ?? "" : "",
      longitude: columnIndex.longitude !== undefined ? cells[columnIndex.longitude] ?? "" : "",
      link: columnIndex.link !== undefined ? cells[columnIndex.link] ?? "" : "",
    })
  }

  return { rows, errors }
}

/** Menyamakan "Gudang Kediri" / "Collection Center Kediri" / "Kediri" jadi bentuk yang sama. */
export function normalizeWarehouseLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/^(gudang|collection center)\s+/i, "")
    .trim()
}
