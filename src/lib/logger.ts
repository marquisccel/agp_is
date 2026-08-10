/**
 * Structured logging minimal (Fase 7 - Error/log monitoring).
 *
 * Sebelumnya hanya console.error ad-hoc tanpa format konsisten, sehingga
 * sulit ditarik/di-grep dari `docker logs` atau `journalctl` saat insiden.
 * Output satu baris JSON per log, gampang diparse alat log aggregator
 * apa pun nanti (tidak mengunci ke vendor tertentu seperti Sentry).
 */

type LogLevel = "info" | "warn" | "error"

type LogFields = Record<string, unknown>

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { error_name: error.name, error_message: error.message, stack: error.stack }
  }
  return { error_value: error }
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, error?: unknown, fields?: LogFields) =>
    write("error", message, { ...(error !== undefined ? serializeError(error) : {}), ...fields }),
}
