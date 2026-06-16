import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import type { Prisma } from "@prisma/client"
import { markSupplierGreen } from "@/lib/supplierStatus"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const { action, rejection_reason } = await req.json()

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const currentPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    })

    if (!currentPurchase) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (currentPurchase.status_approval !== "menunggu_approval_harga") {
      return NextResponse.json({ error: "Purchase is not waiting for manager approval" }, { status: 400 })
    }

    let updateData: Prisma.PurchaseUncheckedUpdateInput = {}
    if (action === "approve") {
      updateData = {
        status_approval: "approved",
        approvedByUserId: session.user.id,
        approvedAt: new Date(),
        nomor_nota: `INV-${Date.now()}` // Generate Nota
      }
    } else {
      updateData = {
        status_approval: "rejected",
        rejection_reason: rejection_reason || "Ditolak oleh Manager tanpa alasan",
        approvedByUserId: session.user.id,
        approvedAt: new Date()
      }
      
      // If there was a DP used in double check, we need to return it back to Supplier's sisa_dp
      if (currentPurchase.dp_yang_digunakan && currentPurchase.dp_yang_digunakan > 0) {
         // Logic to refund DP can go here
         // ...
      }
    }

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: updateData
      })

      if (action === "approve") {
        await markSupplierGreen(tx, {
          supplierId: currentPurchase.supplierId,
          userId: session.user.id,
          trigger: "manager_approve_purchase",
          purchaseId,
        })
      }

      return purchase
    })

    await createAuditLog({
      userId: session.user.id,
      action: action === "approve" ? "MANAGER_APPROVE_PRICE" : "MANAGER_REJECT_PRICE",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: currentPurchase,
      new_data: updatedPurchase,
    })

    return NextResponse.json(updatedPurchase)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error approving purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
