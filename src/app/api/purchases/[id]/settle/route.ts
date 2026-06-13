import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
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
  } catch (error: any) {
    console.error("Error settling purchase:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
