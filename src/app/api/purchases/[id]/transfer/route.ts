import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { isOperationalRole } from "@/lib/roles"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const ALLOWED_PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (!isOperationalRole(session.user.role) && session.user.role !== "MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } })
    if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (isOperationalRole(session.user.role) && purchase.warehouseId !== session.user.warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }
    
    if (!["approved", "sudah_transfer"].includes(purchase.status_approval)) {
      return NextResponse.json({ error: "Hanya transaksi yang approved atau sudah transfer yang bisa ditandai/diubah transfer" }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get("bukti") as File | null

    if (!file && !purchase.bukti_transfer) {
      return NextResponse.json({ error: "Bukti transfer wajib diupload untuk transfer pertama." }, { status: 400 })
    }

    if (file && file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran bukti transfer maksimal 2 MB." }, { status: 400 })
    }

    let buktiUrl = purchase.bukti_transfer
    if (file) {
      const mimeType = file.type || "image/jpeg"
      const extension = ALLOWED_PROOF_TYPES[mimeType]
      if (!extension) {
        return NextResponse.json({ error: "Format bukti transfer harus JPG, PNG, WEBP, atau PDF." }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uploadDir = path.join(process.cwd(), "public", "uploads", "transfer-proofs")
      await mkdir(uploadDir, { recursive: true })

      const fileName = `${purchaseId}-${Date.now()}.${extension}`
      await writeFile(path.join(uploadDir, fileName), buffer)
      buktiUrl = `/uploads/transfer-proofs/${fileName}`
    }

    const updated = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status_approval: "sudah_transfer",
        bukti_transfer: buktiUrl,
        tanggal_transfer: new Date()
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: purchase.bukti_transfer ? "REPLACE_TRANSFER_PROOF" : "UPLOAD_TRANSFER_PROOF",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: {
        status_approval: purchase.status_approval,
        bukti_transfer: purchase.bukti_transfer ? "available" : null,
        tanggal_transfer: purchase.tanggal_transfer,
      },
      new_data: {
        status_approval: updated.status_approval,
        bukti_transfer: updated.bukti_transfer ? "available" : null,
        tanggal_transfer: updated.tanggal_transfer,
        changedByRole: session.user.role,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
