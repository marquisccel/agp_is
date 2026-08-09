import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { unlink } from "fs/promises"
import path from "path"

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ambil snapshot lengkap sebelum penghapusan agar data yang dihapus masih
    // dapat direkonstruksi dari audit log. Sebelumnya kolom data lama hanya
    // berisi penanda teks "Deleted by manager" (FR-8.3 / D-5).
    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true, returs: true, supplier: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    // Deleting the purchase will automatically cascade delete its items and returs
    // because of `onDelete: Cascade` in the Prisma schema.
    await prisma.purchase.delete({
      where: { id }
    })

    // Bukti transfer disimpan lokal di disk (bukan object storage), jadi
    // baris DB dan berkasnya bisa lepas satu sama lain kalau tidak dibersihkan
    // di sini -- berkas yang gagal dihapus tidak membatalkan penghapusan
    // transaksi yang sudah terjadi (best-effort, sama seperti kegagalan audit log).
    if (existing.bukti_transfer?.startsWith("/uploads/transfer-proofs/")) {
      const filePath = path.join(process.cwd(), "public", existing.bukti_transfer)
      await unlink(filePath).catch((err) => console.error("Gagal menghapus berkas bukti transfer:", err))
    }

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_PURCHASE",
      table_name: "Purchase",
      record_id: id,
      old_data: existing,
      new_data: null,
    })

    return NextResponse.json({ message: "Transaksi berhasil dihapus" })
  } catch (error) {
    console.error("Delete Purchase Error:", error)
    return NextResponse.json({ error: "Gagal menghapus transaksi. Terjadi kesalahan pada server." }, { status: 500 })
  }
}
