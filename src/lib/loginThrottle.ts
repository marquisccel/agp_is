const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

type Attempt = { count: number; firstAttemptAt: number; lockedUntil?: number }

const attempts = new Map<string, Attempt>()

export function isLockedOut(email: string) {
  const entry = attempts.get(email.toLowerCase())
  if (!entry?.lockedUntil) return false
  if (Date.now() >= entry.lockedUntil) {
    attempts.delete(email.toLowerCase())
    return false
  }
  return true
}

export function recordFailedAttempt(email: string) {
  const key = email.toLowerCase()
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now })
    return
  }

  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + WINDOW_MS
  }
}

export function clearAttempts(email: string) {
  attempts.delete(email.toLowerCase())
}
