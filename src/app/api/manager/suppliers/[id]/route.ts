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

    await prisma.supplier.delete({
      where: { id }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        table_name: "Supplier",
        record_id: id,
        old_data: "Deleted by manager"
      }
    })

    return NextResponse.json({ message: "Data Lapak berhasil dihapus" })
  } catch (error: any) {
    console.error("Delete Supplier Error:", error)
    return NextResponse.json({ error: "Gagal menghapus data lapak. Terjadi kesalahan pada server." }, { status: 500 })
  }
}
