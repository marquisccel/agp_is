import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Deleting the purchase will automatically cascade delete its items and returs
    // because of `onDelete: Cascade` in the Prisma schema.
    await prisma.purchase.delete({
      where: { id }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        table_name: "Purchase",
        record_id: id,
        old_data: "Deleted by manager"
      }
    })

    return NextResponse.json({ message: "Transaksi berhasil dihapus" })
  } catch (error) {
    console.error("Delete Purchase Error:", error)
    return NextResponse.json({ error: "Gagal menghapus transaksi. Terjadi kesalahan pada server." }, { status: 500 })
  }
}
