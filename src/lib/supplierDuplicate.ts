/**
 * Deteksi kemiripan supplier baru terhadap supplier yang sudah ada pada
 * gudang yang sama (Fase 6 - Kualitas Data).
 *
 * Ini adalah peringatan lunak (soft warning), bukan larangan mutlak --
 * dua lapak berbeda kadang memang punya nama yang mirip. Klien wajib
 * mengirim ulang permintaan dengan `confirmDuplicate: true` untuk
 * melewati peringatan setelah pengguna meninjau kandidat yang disodorkan.
 */

export type DuplicateCandidateInput = {
  id: string
  nama: string
  latitude?: number | null
  longitude?: number | null
}

export type DuplicateMatch = {
  id: string
  nama: string
  reason: "nama_identik" | "nama_mirip" | "lokasi_berdekatan"
}

export function normalizeSupplierName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const dist: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)])
  for (let j = 0; j < cols; j++) dist[0][j] = j

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost
      )
    }
  }
  return dist[rows - 1][cols - 1]
}

/** Toleransi kemiripan nama relatif terhadap panjang nama terpendek. */
function areNamesSimilar(a: string, b: string): boolean {
  const normA = normalizeSupplierName(a)
  const normB = normalizeSupplierName(b)
  if (!normA || !normB) return false
  if (normA === normB) return true

  const maxAllowedDistance = Math.max(1, Math.floor(Math.min(normA.length, normB.length) * 0.2))
  return levenshteinDistance(normA, normB) <= maxAllowedDistance
}

const EARTH_RADIUS_M = 6_371_000
const DUPLICATE_DISTANCE_METERS = 75

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findPotentialDuplicates(
  candidate: { nama: string; latitude?: number | null; longitude?: number | null },
  existing: DuplicateCandidateInput[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []

  for (const other of existing) {
    const normalizedEqual = normalizeSupplierName(candidate.nama) === normalizeSupplierName(other.nama)
    if (normalizedEqual) {
      matches.push({ id: other.id, nama: other.nama, reason: "nama_identik" })
      continue
    }

    if (areNamesSimilar(candidate.nama, other.nama)) {
      matches.push({ id: other.id, nama: other.nama, reason: "nama_mirip" })
      continue
    }

    if (
      candidate.latitude != null &&
      candidate.longitude != null &&
      other.latitude != null &&
      other.longitude != null
    ) {
      const distance = haversineDistanceMeters(candidate.latitude, candidate.longitude, other.latitude, other.longitude)
      if (distance <= DUPLICATE_DISTANCE_METERS) {
        matches.push({ id: other.id, nama: other.nama, reason: "lokasi_berdekatan" })
      }
    }
  }

  return matches
}
