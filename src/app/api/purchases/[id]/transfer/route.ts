import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } })
    if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 })
    
    if (!["approved", "sudah_transfer"].includes(purchase.status_approval)) {
      return NextResponse.json({ error: "Hanya transaksi yang approved atau sudah transfer yang bisa ditandai/diubah transfer" }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get("bukti") as File | null

    let buktiUrl = purchase.bukti_transfer
    if (file && typeof (file as any).arrayBuffer === "function") {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const mimeType = file.type || "image/jpeg"
      const base64 = buffer.toString("base64")
      buktiUrl = `data:${mimeType};base64,${base64}`
    }

    const updated = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status_approval: "sudah_transfer",
        bukti_transfer: buktiUrl,
        tanggal_transfer: new Date()
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

