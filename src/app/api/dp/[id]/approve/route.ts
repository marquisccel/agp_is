import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dpId } = await params
    const { action, nominal_disetujui } = await req.json()
    const role = session.user.role

    if (!action || !["approve", "reject", "forward"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const currentDp = await prisma.downPayment.findUnique({
      where: { id: dpId }
    })

    if (!currentDp) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let updateData: any = {}

    if (action === "reject") {
      updateData = { status_approval: "rejected" }
    } else if (action === "forward" && role === "ADMIN") {
      updateData = { status_approval: "menunggu_approval_manager" }
    } else if (action === "approve") {
      const finalNominal = nominal_disetujui || currentDp.nominal_diajukan
      if (role === "ADMIN" && finalNominal > 2000000) {
         return NextResponse.json({ error: "Admin cannot approve DP > 2,000,000" }, { status: 403 })
      }
      
      updateData = {
        status_approval: "approved",
        nominal_disetujui: finalNominal,
        sisa_dp: finalNominal,
        approvedByUserId: session.user.id,
        tanggal_approval: new Date(),
        expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }

    const updatedDp = await prisma.downPayment.update({
      where: { id: dpId },
      data: updateData
    })

    await createAuditLog({
      userId: session.user.id,
      action: `DP_${action.toUpperCase()}`,
      table_name: "DownPayment",
      record_id: dpId,
      old_data: currentDp,
      new_data: updatedDp,
    })

    return NextResponse.json(updatedDp)
  } catch (error: any) {
    console.error("Error approving DP:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
