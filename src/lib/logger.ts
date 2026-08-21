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

/**
 * Notifikasi error ke webhook (opsional).
 *
 * Tanpa ini, error di produksi hanya mendarat di `docker logs` dan baru
 * ketahuan kalau ada yang mengeluh. Sengaja memakai webhook biasa, bukan
 * SDK vendor tertentu: satu variabel env bisa diarahkan ke Discord,
 * Telegram, Slack, atau penampung lain tanpa mengubah kode maupun
 * menambah beban pada proses build.
 *
 * Dua hal yang dijaga di sini:
 * 1. Pengiriman TIDAK PERNAH menggagalkan permintaan yang sedang berjalan.
 *    Notifikasi yang error sendiri lalu menjatuhkan transaksi pengguna itu
 *    lebih buruk daripada tidak ada notifikasi sama sekali.
 * 2. Ada jeda minimum antar kiriman. Satu error yang terjadi berulang cepat
 *    bisa mengirim ribuan pesan dan justru menenggelamkan sinyalnya.
 */
const WEBHOOK = process.env.ALERT_WEBHOOK_URL
const JEDA_MS = 60_000
let terakhirKirim = 0

function kirimNotifikasi(message: string, fields: LogFields) {
  if (!WEBHOOK) return

  const sekarang = Date.now()
  if (sekarang - terakhirKirim < JEDA_MS) return
  terakhirKirim = sekarang

  const isi = [
    `[AGP IS] ${message}`,
    fields.error_message ? `Penyebab: ${fields.error_message}` : "",
    `Waktu: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n")

  // Format "content" dikenali Discord; penampung lain umumnya menerima
  // JSON apa adanya. Tidak di-await -- permintaan pengguna tidak boleh
  // menunggu notifikasi.
  void fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: isi, text: isi }),
  }).catch(() => {
    // Sengaja dibiarkan: kegagalan notifikasi bukan alasan menggagalkan
    // apa pun, dan menuliskannya lewat logger.error bisa jadi rekursif.
  })
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, error?: unknown, fields?: LogFields) => {
    const gabungan = { ...(error !== undefined ? serializeError(error) : {}), ...fields }
    write("error", message, gabungan)
    kirimNotifikasi(message, gabungan)
  },
}
