import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { positiveNumber } from "@/lib/numberValidation"
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

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) {
      return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 })
    }

    if (supplier.warehouseId !== session.user.warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke supplier ini" }, { status: 403 })
    }

    const requestedNominal = positiveNumber(nominal_diajukan, "Nominal kasbon")
    const status = session.user.role === "STAFF"
      ? "menunggu_approval_admin"
      : requestedNominal > 2000000
        ? "menunggu_approval_manager"
        : "approved"

    const dp = await prisma.downPayment.create({
      data: {
        supplierId,
        nominal_diajukan: requestedNominal,
        keterangan,
        status_approval: status,
        ...(status === "approved" && {
          nominal_disetujui: requestedNominal,
          sisa_dp: requestedNominal,
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
    return NextResponse.json({ error: message }, { status: message.includes("harus") ? 400 : 500 })
  }
}
