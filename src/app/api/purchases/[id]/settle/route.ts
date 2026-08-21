import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { isOperationalRole } from "@/lib/roles"
import { fileUrl, putFile } from "@/lib/objectStorage"

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

    // Nota pelunasan wajib (hasil meeting Manager): pelunasan tanpa bukti
    // membuat sisa termin bisa ditutup tanpa jejak apa pun.
    const formData = await req.formData()
    const file = formData.get("nota") as File | null

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Nota pelunasan wajib diunggah." }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran nota pelunasan maksimal 2 MB." }, { status: 400 })
    }

    const extension = ALLOWED_PROOF_TYPES[file.type]
    if (!extension) {
      return NextResponse.json({ error: "Format nota pelunasan harus JPG, PNG, WEBP, atau PDF." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `settlement-notes/${purchaseId}-${Date.now()}.${extension}`
    await putFile(key, buffer, file.type)
    const notaUrl = fileUrl(key)

    // Update to LUNAS status
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status_pelunasan: "LUNAS",
        nominal_belum_lunas: 0,
        persentase_pembayaran: 100,
        bukti_pelunasan: notaUrl,
        tanggal_pelunasan: new Date(),
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
