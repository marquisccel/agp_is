import test from "node:test"
import assert from "node:assert/strict"
import type { Prisma } from "@prisma/client"
import { markSupplierGreen } from "../src/lib/supplierStatus"

type MockAuditLog = { userId: string; action: string; table_name: string; record_id: string; old_data: string | null; new_data: string | null }

function createMockTx(initialSupplier: { id: string; nama: string; transactionStatus: string }) {
  const state = { supplier: { ...initialSupplier }, auditLogs: [] as MockAuditLog[] }

  const tx = {
    supplier: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === state.supplier.id ? { ...state.supplier } : null,
      update: async ({ data }: { where: { id: string }; data: Partial<typeof state.supplier> }) => {
        state.supplier = { ...state.supplier, ...data }
        return { ...state.supplier }
      },
    },
    auditLog: {
      create: async ({ data }: { data: MockAuditLog }) => {
        state.auditLogs.push(data)
        return data
      },
    },
  }

  return { tx: tx as unknown as Prisma.TransactionClient, state }
}

test("markSupplierGreen mengubah RED menjadi GREEN dan mencatat audit log", async () => {
  const { tx, state } = createMockTx({ id: "s1", nama: "Pengepul A", transactionStatus: "RED" })

  const changed = await markSupplierGreen(tx, {
    supplierId: "s1",
    userId: "u1",
    trigger: "admin_double_check_purchase",
    purchaseId: "p1",
  })

  assert.equal(changed, true)
  assert.equal(state.supplier.transactionStatus, "GREEN")
  assert.equal(state.auditLogs.length, 1)
  assert.equal(state.auditLogs[0].action, "SUPPLIER_STATUS_AUTO_GREEN")
})

test("markSupplierGreen adalah no-op kalau supplier sudah GREEN (tidak menulis audit log lagi)", async () => {
  const { tx, state } = createMockTx({ id: "s2", nama: "Pengepul B", transactionStatus: "GREEN" })

  const changed = await markSupplierGreen(tx, {
    supplierId: "s2",
    userId: "u1",
    trigger: "manager_approve_purchase",
    purchaseId: "p2",
  })

  assert.equal(changed, false)
  assert.equal(state.auditLogs.length, 0)
})

test("markSupplierGreen mengembalikan false kalau supplier tidak ditemukan", async () => {
  const { tx, state } = createMockTx({ id: "s3", nama: "Pengepul C", transactionStatus: "RED" })

  const changed = await markSupplierGreen(tx, {
    supplierId: "tidak-ada",
    userId: "u1",
    trigger: "manager_approve_harga",
    purchaseId: "p3",
  })

  assert.equal(changed, false)
  assert.equal(state.auditLogs.length, 0)
})
