import type { Prisma } from "@prisma/client"
import { prisma } from "./prisma"

export async function createAuditLog(params: {
  userId: string
  action: string
  table_name: string
  record_id: string
  old_data?: unknown
  new_data?: unknown
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        table_name: params.table_name,
        record_id: params.record_id,
        old_data: params.old_data ? JSON.stringify(params.old_data) : null,
        new_data: params.new_data ? JSON.stringify(params.new_data) : null,
      }
    })
  } catch (error) {
    console.error("Failed to create audit log:", error)
  }
}

export async function createAuditLogTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string
    action: string
    table_name: string
    record_id: string
    old_data?: unknown
    new_data?: unknown
  }
) {
  try {
    await tx.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        table_name: params.table_name,
        record_id: params.record_id,
        old_data: params.old_data ? JSON.stringify(params.old_data) : null,
        new_data: params.new_data ? JSON.stringify(params.new_data) : null,
      },
    })
  } catch (error) {
    console.error("Failed to create audit log in transaction:", error)
  }
}
