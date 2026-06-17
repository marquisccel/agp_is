import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { isOperationalRole } from "@/lib/roles"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (!isOperationalRole(session.user.role) && session.user.role !== "MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    if (isOperationalRole(session.user.role) && purchase.warehouseId !== session.user.warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }

    if (purchase.status_pelunasan === "LUNAS") {
      return NextResponse.json({ error: "Transaksi ini sudah lunas." }, { status: 400 })
    }

    if (!purchase.nominal_belum_lunas || purchase.nominal_belum_lunas <= 0) {
      return NextResponse.json({ error: "Transaksi ini tidak memiliki nominal termin yang perlu dilunasi." }, { status: 400 })
    }

    // Update to LUNAS status
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status_pelunasan: "LUNAS",
        nominal_belum_lunas: 0,
        persentase_pembayaran: 100
      }
    })

    // Log the audit event
    await createAuditLog({
      userId: session.user.id,
      action: "SETTLE_TERMIN",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: purchase,
      new_data: updatedPurchase,
    })

    return NextResponse.json({ success: true, purchase: updatedPurchase })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error settling purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
