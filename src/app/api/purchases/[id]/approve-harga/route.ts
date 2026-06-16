import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { markSupplierGreen } from "@/lib/supplierStatus"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const { action } = await req.json() // "approve" | "reject"

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    })

    if (!purchase || purchase.status_approval !== "menunggu_approval_harga") {
      return NextResponse.json({ error: "Purchase is not awaiting manager approval" }, { status: 400 })
    }

    const newStatus = action === "approve" ? "approved" : "dibatalkan"
    const nomor_nota = action === "approve" ? `INV-${Date.now()}` : null

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status_approval: newStatus,
          approvedByUserId: session.user.id,
          approvedAt: new Date(),
          nomor_nota: nomor_nota || purchase.nomor_nota,
          ...(action === "reject" ? { rejection_reason: "Ditolak oleh Manager karena harga terlalu tinggi" } : {})
        }
      })

      if (action === "approve") {
        await markSupplierGreen(tx, {
          supplierId: purchase.supplierId,
          userId: session.user.id,
          trigger: "manager_approve_harga",
          purchaseId,
        })
      }

      return updated
    })

    await createAuditLog({
      userId: session.user.id,
      action: action === "approve" ? "MANAGER_APPROVE_PRICE" : "MANAGER_REJECT_PRICE",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: purchase,
      new_data: updatedPurchase,
    })

    return NextResponse.json(updatedPurchase)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error approving price:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
