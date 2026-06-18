import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { nonNegativeNumber, positiveInteger } from "@/lib/numberValidation"
import { isOperationalRole } from "@/lib/roles"
import { buildSupplierLocationPayload } from "@/lib/supplierLocation"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (!["STAFF", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const {
      nama,
      kontak_wa,
      link,
      latitude,
      longitude,
      transactionStatus,
      nama_bank,
      nomor_rekening,
      atas_nama,
      target_bulanan_kg,
      frekuensi_ambilan_mingguan,
      hari_ambilan,
    } = body

    if (!nama) {
      return NextResponse.json({ error: "Nama Supplier wajib diisi" }, { status: 400 })
    }

    const locationPayload = buildSupplierLocationPayload({ link, latitude, longitude })

    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 })
    }

    // Staff/admin can only maintain suppliers in their own warehouse.
    if (isOperationalRole(role)) {
      if (existing.warehouseId !== session.user.warehouseId) {
        return NextResponse.json({ error: "Tidak memiliki akses ke supplier ini" }, { status: 403 })
      }
    }

    const targetBulananKg = nonNegativeNumber(target_bulanan_kg, "Target bulanan supplier")
    const frekuensiAmbilanMingguan = positiveInteger(
      frekuensi_ambilan_mingguan,
      "Frekuensi ambilan mingguan",
      1
    )

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        nama,
        kontak_wa: kontak_wa || null,
        link: locationPayload.link,
        latitude: locationPayload.latitude,
        longitude: locationPayload.longitude,
        transactionStatus: transactionStatus === "GREEN" ? "GREEN" : "RED",
        nama_bank: nama_bank || null,
        nomor_rekening: nomor_rekening || null,
        atas_nama: atas_nama || null,
        target_bulanan_kg: targetBulananKg,
        frekuensi_ambilan_mingguan: frekuensiAmbilanMingguan,
        hari_ambilan: hari_ambilan || null,
      },
    })

    if (existing.transactionStatus !== updated.transactionStatus) {
      await createAuditLog({
        userId: session.user.id,
        action: "SUPPLIER_STATUS_MANUAL_UPDATE",
        table_name: "Supplier",
        record_id: updated.id,
        old_data: {
          nama: existing.nama,
          transactionStatus: existing.transactionStatus,
        },
        new_data: {
          nama: updated.nama,
          transactionStatus: updated.transactionStatus,
          changedByRole: role,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json({ error: "Gagal mengupdate data supplier" }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data supplier" }, { status: 500 })
  }
}
