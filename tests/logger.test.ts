import test from "node:test"
import assert from "node:assert/strict"
import { logger } from "../src/lib/logger"

function captureConsole(method: "log" | "warn" | "error") {
  const original = console[method]
  const lines: string[] = []
  console[method] = (line: string) => { lines.push(line) }
  return {
    lines,
    restore: () => { console[method] = original },
  }
}

test("logger.info menulis satu baris JSON dengan level dan message", () => {
  const cap = captureConsole("log")
  try {
    logger.info("Server started", { port: 3000 })
    assert.equal(cap.lines.length, 1)
    const parsed = JSON.parse(cap.lines[0])
    assert.equal(parsed.level, "info")
    assert.equal(parsed.message, "Server started")
    assert.equal(parsed.port, 3000)
    assert.ok(parsed.timestamp)
  } finally {
    cap.restore()
  }
})

test("logger.warn menulis ke console.warn, bukan console.log", () => {
  const capLog = captureConsole("log")
  const capWarn = captureConsole("warn")
  try {
    logger.warn("Sisa DP tidak konsisten")
    assert.equal(capLog.lines.length, 0)
    assert.equal(capWarn.lines.length, 1)
    assert.equal(JSON.parse(capWarn.lines[0]).level, "warn")
  } finally {
    capLog.restore()
    capWarn.restore()
  }
})

test("logger.error menyertakan nama, pesan, dan stack dari Error asli", () => {
  const cap = captureConsole("error")
  try {
    logger.error("Gagal memproses draft", new TypeError("boom"), { purchaseId: "abc-123" })
    const parsed = JSON.parse(cap.lines[0])
    assert.equal(parsed.level, "error")
    assert.equal(parsed.error_name, "TypeError")
    assert.equal(parsed.error_message, "boom")
    assert.ok(parsed.stack)
    assert.equal(parsed.purchaseId, "abc-123")
  } finally {
    cap.restore()
  }
})

test("logger.error menangani nilai non-Error (misal string/objek yang dilempar)", () => {
  const cap = captureConsole("error")
  try {
    logger.error("Gagal", "bukan objek Error")
    const parsed = JSON.parse(cap.lines[0])
    assert.equal(parsed.error_value, "bukan objek Error")
  } finally {
    cap.restore()
  }
})

test("logger.error tanpa argumen error tetap valid (hanya message + fields)", () => {
  const cap = captureConsole("error")
  try {
    logger.error("Terjadi kesalahan", undefined, { context: "test" })
    const parsed = JSON.parse(cap.lines[0])
    assert.equal(parsed.message, "Terjadi kesalahan")
    assert.equal(parsed.context, "test")
    assert.equal(parsed.error_name, undefined)
  } finally {
    cap.restore()
  }
})
