import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Check if supplier has purchases
    const purchasesCount = await prisma.purchase.count({
      where: { supplierId: id }
    })

    if (purchasesCount > 0) {
      return NextResponse.json(
        { error: `Lapak ini memiliki ${purchasesCount} riwayat transaksi dan tidak dapat dihapus.` },
        { status: 400 }
      )
    }

    // Check if supplier has down payments
    const dpCount = await prisma.downPayment.count({
      where: { supplierId: id }
    })

    if (dpCount > 0) {
      return NextResponse.json(
        { error: `Lapak ini memiliki ${dpCount} riwayat kasbon (DP) dan tidak dapat dihapus.` },
        { status: 400 }
      )
    }

    // Snapshot lengkap sebelum penghapusan, agar data lapak yang dihapus
    // masih dapat direkonstruksi dari audit log (FR-8.3 / D-5).
    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Data lapak tidak ditemukan" }, { status: 404 })
    }

    await prisma.supplier.delete({
      where: { id }
    })

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_SUPPLIER",
      table_name: "Supplier",
      record_id: id,
      old_data: existing,
      new_data: null,
    })

    return NextResponse.json({ message: "Data Lapak berhasil dihapus" })
  } catch (error) {
    console.error("Delete Supplier Error:", error)
    return NextResponse.json({ error: "Gagal menghapus data lapak. Terjadi kesalahan pada server." }, { status: 500 })
  }
}
