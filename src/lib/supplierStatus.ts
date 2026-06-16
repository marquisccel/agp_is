import type { Prisma } from "@prisma/client"
import { createAuditLogTx } from "@/lib/audit"

export const ACTIVE_SUPPLIER_TRANSACTION_STATUS = "GREEN"
export const DEFAULT_SUPPLIER_TRANSACTION_STATUS = "RED"

export async function markSupplierGreen(
  tx: Prisma.TransactionClient,
  params: {
    supplierId: string
    userId: string
    trigger:
      | "supervisor_verify_purchase"
      | "admin_double_check_purchase"
      | "manager_approve_purchase"
      | "manager_approve_harga"
    purchaseId: string
  }
) {
  const supplier = await tx.supplier.findUnique({
    where: { id: params.supplierId },
    select: {
      id: true,
      nama: true,
      transactionStatus: true,
    },
  })

  if (!supplier || supplier.transactionStatus === ACTIVE_SUPPLIER_TRANSACTION_STATUS) {
    return false
  }

  const updatedSupplier = await tx.supplier.update({
    where: { id: params.supplierId },
    data: { transactionStatus: ACTIVE_SUPPLIER_TRANSACTION_STATUS },
    select: {
      id: true,
      nama: true,
      transactionStatus: true,
    },
  })

  await createAuditLogTx(tx, {
    userId: params.userId,
    action: "SUPPLIER_STATUS_AUTO_GREEN",
    table_name: "Supplier",
    record_id: params.supplierId,
    old_data: {
      nama: supplier.nama,
      transactionStatus: supplier.transactionStatus,
    },
    new_data: {
      nama: updatedSupplier.nama,
      transactionStatus: updatedSupplier.transactionStatus,
      trigger: params.trigger,
      purchaseId: params.purchaseId,
    },
  })

  return true
}
