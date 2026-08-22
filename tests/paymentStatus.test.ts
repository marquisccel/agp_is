import test from "node:test"
import assert from "node:assert/strict"
import { skemaPembayaran, statusPembayaran } from "../src/lib/paymentStatus"

test("nota yang belum ditransfer tidak boleh terbaca lunas", () => {
  // Ini kasus yang memicu perbaikan: nota bernilai 40 juta dengan kasbon
  // 20 juta. Sisa 20 juta masih harus ditransfer, tapi status_pelunasan
  // sudah berisi "LUNAS" -- artinya cuma "dibayar penuh, tidak dicicil".
  const s = statusPembayaran({
    status_approval: "approved",
    status_pelunasan: "LUNAS",
    nominal_belum_lunas: 0,
  })
  assert.equal(s.label, "Belum dibayar")
  assert.equal(s.tone, "warning")
})

test("nota baru dibuat juga belum dibayar", () => {
  assert.equal(
    statusPembayaran({ status_approval: "menunggu_verifikasi", status_pelunasan: "LUNAS", nominal_belum_lunas: 0 }).label,
    "Belum dibayar",
  )
  assert.equal(
    statusPembayaran({ status_approval: "menunggu_approval_harga", status_pelunasan: "LUNAS", nominal_belum_lunas: 0 }).label,
    "Belum dibayar",
  )
})

test("lunas hanya setelah transfer benar-benar tercatat", () => {
  const s = statusPembayaran({
    status_approval: "sudah_transfer",
    status_pelunasan: "LUNAS",
    nominal_belum_lunas: 0,
  })
  assert.equal(s.label, "Lunas")
  assert.equal(s.tone, "success")
  assert.equal(s.sisa, 0)
})

test("termin yang sudah ditransfer sebagian menampilkan sisanya", () => {
  const s = statusPembayaran({
    status_approval: "sudah_transfer",
    status_pelunasan: "BELUM_LUNAS",
    nominal_belum_lunas: 20_000_000,
  })
  assert.equal(s.label, "Kurang Rp 20.000.000")
  assert.equal(s.tone, "warning")
  assert.equal(s.sisa, 20_000_000)
})

test("nota dibatalkan tidak menagih apa pun", () => {
  const s = statusPembayaran({
    status_approval: "dibatalkan",
    status_pelunasan: "BELUM_LUNAS",
    nominal_belum_lunas: 5_000_000,
  })
  assert.equal(s.label, "Dibatalkan")
  assert.equal(s.sisa, 0)
})

test("skema pembayaran dibaca terpisah dari status pembayaran", () => {
  assert.equal(skemaPembayaran("LUNAS").label, "Penuh")
  assert.equal(skemaPembayaran("BELUM_LUNAS").label, "Termin")
  assert.equal(skemaPembayaran(null).label, "Penuh")
})
