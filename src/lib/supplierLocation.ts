type CoordinateValue = number | string | null | undefined

type SupplierLocationInput = {
  link?: string | null
  latitude?: CoordinateValue
  longitude?: CoordinateValue
}

export function normalizeCoordinateValue(value: CoordinateValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = typeof value === "number" ? value : parseFloat(String(value).trim())
  return Number.isFinite(parsed) ? parsed : null
}

function isValidCoordinatePair(latitude: number, longitude: number) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

function extractCoordinatePair(input: string, pattern: RegExp) {
  const match = input.match(pattern)
  if (!match) return null

  const latitude = parseFloat(match[1])
  const longitude = parseFloat(match[2])

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (!isValidCoordinatePair(latitude, longitude)) return null

  return { latitude, longitude }
}

const LINK_PATTERNS = [
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /[?&](?:q|query|ll|center|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  /\b(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\b/,
]

export function isShortGoogleMapsLink(link: string | null | undefined) {
  if (!link) return false
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(link.trim())
}

export function parseCoordinatesFromMapLink(link: string | null | undefined) {
  if (!link) return null

  const trimmed = link.trim()
  if (!trimmed) return null

  const candidates = [trimmed]
  try {
    candidates.push(decodeURIComponent(trimmed))
  } catch {
    // ignore invalid URI sequences and continue using raw string
  }

  for (const candidate of candidates) {
    for (const pattern of LINK_PATTERNS) {
      const coordinates = extractCoordinatePair(candidate, pattern)
      if (coordinates) return coordinates
    }
  }

  return null
}

export function resolveSupplierCoordinates(input: SupplierLocationInput) {
  const latitude = normalizeCoordinateValue(input.latitude)
  const longitude = normalizeCoordinateValue(input.longitude)

  if (latitude !== null && longitude !== null && isValidCoordinatePair(latitude, longitude)) {
    return { latitude, longitude, source: "manual" as const }
  }

  const parsedFromLink = parseCoordinatesFromMapLink(input.link)
  if (parsedFromLink) {
    return { ...parsedFromLink, source: "link" as const }
  }

  return null
}

export function hasResolvedSupplierCoordinates(input: SupplierLocationInput) {
  return resolveSupplierCoordinates(input) !== null
}

export function buildSupplierLocationPayload(input: SupplierLocationInput) {
  const link = input.link?.trim() || null
  const latitude = normalizeCoordinateValue(input.latitude)
  const longitude = normalizeCoordinateValue(input.longitude)

  if (latitude !== null && longitude !== null && isValidCoordinatePair(latitude, longitude)) {
    return { link, latitude, longitude }
  }

  if (latitude === null && longitude === null) {
    const parsedFromLink = parseCoordinatesFromMapLink(link)
    if (parsedFromLink) {
      return { link, latitude: parsedFromLink.latitude, longitude: parsedFromLink.longitude }
    }
  }

  return { link, latitude, longitude }
}

export function getSupplierMapHref(input: SupplierLocationInput & { nama?: string; warehouseName?: string | null }) {
  const resolvedCoordinates = resolveSupplierCoordinates(input)
  if (resolvedCoordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${resolvedCoordinates.latitude},${resolvedCoordinates.longitude}`
  }

  if (input.link?.trim()) {
    return input.link.trim()
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [input.nama, input.warehouseName].filter(Boolean).join(" ")
  )}`
}
