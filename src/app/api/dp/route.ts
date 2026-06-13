import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { isOperationalRole } from "@/lib/roles"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !isOperationalRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { supplierId, nominal_diajukan, keterangan } = await req.json()

    if (!supplierId || !nominal_diajukan) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const status = nominal_diajukan > 2000000 ? "menunggu_approval_manager" : "approved"

    const dp = await prisma.downPayment.create({
      data: {
        supplierId,
        nominal_diajukan,
        keterangan,
        status_approval: status,
        ...(status === "approved" && {
          nominal_disetujui: nominal_diajukan,
          sisa_dp: nominal_diajukan,
          approvedByUserId: session.user.id,
          tanggal_approval: new Date(),
          expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        })
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: "REQUEST_DP",
      table_name: "DownPayment",
      record_id: dp.id,
      new_data: dp,
    })

    return NextResponse.json(dp, { status: 201 })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error creating DP request:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
