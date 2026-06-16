import type { Prisma } from "@prisma/client"

export const ACTIVE_SUPPLIER_TRANSACTION_STATUS = "GREEN"
export const DEFAULT_SUPPLIER_TRANSACTION_STATUS = "RED"

export async function markSupplierGreen(tx: Prisma.TransactionClient, supplierId: string) {
  await tx.supplier.update({
    where: { id: supplierId },
    data: { transactionStatus: ACTIVE_SUPPLIER_TRANSACTION_STATUS },
  })
}
