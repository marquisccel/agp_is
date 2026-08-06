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
      where: { id: dpId },
      include: { supplier: true }
    })

    if (!currentDp) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (role === "ADMIN" && currentDp.supplier.warehouseId !== session.user.warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke pengajuan kasbon ini" }, { status: 403 })
    }

    if (["approved", "rejected"].includes(currentDp.status_approval)) {
      return NextResponse.json({ error: "Pengajuan kasbon ini sudah final." }, { status: 400 })
    }

    if (role === "ADMIN" && currentDp.status_approval !== "menunggu_approval_admin") {
      return NextResponse.json({ error: "Pengajuan kasbon ini tidak berada di antrean admin." }, { status: 400 })
    }

    if (role === "MANAGER" && currentDp.status_approval !== "menunggu_approval_manager") {
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
    } else if (action === "forward" && role === "ADMIN") {
      // Eskalasi opsional: Admin dapat meneruskan pengajuan ke Manager bila
      // ragu memutuskan sendiri.
      updateData = { status_approval: "menunggu_approval_manager" }
    } else if (action === "forward") {
      return NextResponse.json({ error: "Action tidak valid untuk role ini." }, { status: 403 })
    } else if (action === "approve") {
      // Kebijakan: approval Admin bersifat FINAL untuk pengajuan Staff,
      // berapa pun nominalnya -- tidak ada lagi ambang Rp 2 juta dan tidak
      // perlu approval Manager lanjutan. Identitas penyetuju tercatat pada
      // approvedByUserId sehingga Manager dapat memantau admin mana yang
      // menyetujui tiap kasbon (lihat riwayat pada halaman approval Manager).
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
