import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { positiveNumber } from "@/lib/numberValidation"
import type { Prisma } from "@prisma/client"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    // Hanya Manager yang boleh memutus kasbon (keputusan meeting Manager).
    if (!session || !session.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dpId } = await params
    const { action, nominal_disetujui } = await req.json()

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const currentDp = await prisma.downPayment.findUnique({
      where: { id: dpId },
      include: { supplier: true }
    })

    if (!currentDp) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (["approved", "rejected"].includes(currentDp.status_approval)) {
      return NextResponse.json({ error: "Pengajuan kasbon ini sudah final." }, { status: 400 })
    }

    if (currentDp.status_approval !== "menunggu_approval_manager") {
      return NextResponse.json({ error: "Pengajuan kasbon ini tidak berada di antrean manager." }, { status: 400 })
    }

    let updateData: Prisma.DownPaymentUncheckedUpdateInput = {}

    if (action === "reject") {
      // Identitas dan waktu penolakan ikut dicatat (memakai field approver
      // yang sama), agar riwayat keputusan pada pemantauan Manager lengkap --
      // bukan hanya persetujuan.
      updateData = {
        status_approval: "rejected",
        approvedByUserId: session.user.id,
        tanggal_approval: new Date(),
      }
    } else if (action === "approve") {
      // Kebijakan: keputusan Manager bersifat FINAL, berapa pun nominalnya.
      // Identitas penyetuju tetap dicatat pada approvedByUserId untuk jejak
      // audit.
      const finalNominal = nominal_disetujui === null || nominal_disetujui === undefined || nominal_disetujui === ""
        ? currentDp.nominal_diajukan
        : positiveNumber(nominal_disetujui, "Nominal disetujui")
      if (finalNominal > currentDp.nominal_diajukan) {
        return NextResponse.json({ error: "Nominal disetujui tidak boleh melebihi nominal diajukan." }, { status: 400 })
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
      action: action === "approve" ? "APPROVE_DP" : action === "reject" ? "REJECT_DP" : "FORWARD_DP",
      table_name: "DownPayment",
      record_id: dpId,
      old_data: currentDp,
      new_data: updatedDp,
    })

    return NextResponse.json(updatedDp)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error approving DP:", error)
    return NextResponse.json({ error: message }, { status: message.includes("harus") ? 400 : 500 })
  }
}
