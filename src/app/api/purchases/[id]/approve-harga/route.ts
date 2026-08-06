import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { markSupplierGreen } from "@/lib/supplierStatus"
import { refundDp } from "@/lib/dpAllocation"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    // rejection_reason bersifat opsional; bila tidak diisi Manager, sistem
    // memakai teks default (sebelumnya teks ini selalu di-hardcode -- D-13).
    const { action, rejection_reason } = await req.json() // "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

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
          ...(action === "reject"
            ? {
                rejection_reason:
                  typeof rejection_reason === "string" && rejection_reason.trim()
                    ? rejection_reason.trim()
                    : "Ditolak oleh Manager karena harga terlalu tinggi",
              }
            : {}),
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

      // Kembalikan saldo DP yang sudah terpotong saat verifikasi gudang,
      // karena transaksinya dibatalkan (D-2). Tanpa ini, saldo kasbon supplier
      // tetap berkurang meskipun pembelian tidak jadi.
      if (action === "reject" && (purchase.dp_yang_digunakan ?? 0) > 0) {
        await refundDp(tx, purchase.supplierId, purchase.dp_yang_digunakan ?? 0)
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
