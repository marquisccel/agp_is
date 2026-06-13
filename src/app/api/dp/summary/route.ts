import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { getErrorMessage } from "@/lib/errors"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    const warehouseId = session.user.warehouseId

    // Fetch suppliers belonging to the current warehouse (or all for MANAGER)
    const suppliers = await prisma.supplier.findMany({
      where: role === "MANAGER" ? {} : { warehouseId: warehouseId || undefined },
      include: {
        downPayments: {
          where: { status_approval: "approved" }
        },
        purchases: {
          where: { status_approval: "approved" }
        }
      }
    })

    const summary = suppliers.map(s => {
      const totalApproved = s.downPayments.reduce((sum, dp) => sum + (dp.nominal_disetujui || 0), 0)
      const totalUsed = s.downPayments.reduce((sum, dp) => sum + (dp.dp_used_amount || 0), 0)
      const remaining = s.downPayments.reduce((sum, dp) => sum + (dp.sisa_dp || 0), 0)
      const totalDeliveries = s.purchases.length

      return {
        supplierId: s.id,
        supplierNama: s.nama,
        kontakWa: s.kontak_wa,
        totalApproved,
        totalUsed,
        remaining,
        totalDeliveries
      }
    })

    // Sort by remaining kasbon (highest first)
    summary.sort((a, b) => b.remaining - a.remaining)

    return NextResponse.json(summary)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error fetching DP summary:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
