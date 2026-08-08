import test from "node:test"
import assert from "node:assert/strict"
import { ACTIVE_PURCHASE_STATUSES, PENDING_VERIFICATION_STATUSES } from "../src/lib/purchaseStatus"

test("PENDING_VERIFICATION_STATUSES hanya berisi status draft yang belum diverifikasi gudang", () => {
  assert.deepEqual(PENDING_VERIFICATION_STATUSES, ["menunggu_verifikasi"])
})

test("ACTIVE_PURCHASE_STATUSES mencakup seluruh status pending plus tahap lanjutan", () => {
  for (const status of PENDING_VERIFICATION_STATUSES) {
    assert.ok(ACTIVE_PURCHASE_STATUSES.includes(status))
  }
  assert.deepEqual(ACTIVE_PURCHASE_STATUSES, [
    "menunggu_verifikasi",
    "menunggu_approval_harga",
    "approved",
    "sudah_transfer",
  ])
})

test("ACTIVE_PURCHASE_STATUSES tidak memasukkan status akhir non-aktif (rejected/dibatalkan)", () => {
  assert.equal(ACTIVE_PURCHASE_STATUSES.includes("rejected"), false)
  assert.equal(ACTIVE_PURCHASE_STATUSES.includes("dibatalkan"), false)
})
