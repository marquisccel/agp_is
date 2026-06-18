import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { nonNegativeNumber, positiveInteger } from "@/lib/numberValidation"
import { isOperationalRole } from "@/lib/roles"
import { buildSupplierLocationPayload } from "@/lib/supplierLocation"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      warehouseId,
    } = await req.json()

    if (!nama || !warehouseId) {
      return NextResponse.json({ error: "Nama Supplier dan Gudang wajib diisi" }, { status: 400 })
    }

    if (!["STAFF", "ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (isOperationalRole(session.user.role) && session.user.warehouseId !== warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke gudang ini" }, { status: 403 })
    }

    const locationPayload = buildSupplierLocationPayload({ link, latitude, longitude })
    const targetBulananKg = nonNegativeNumber(target_bulanan_kg, "Target bulanan supplier")
    const frekuensiAmbilanMingguan = positiveInteger(
      frekuensi_ambilan_mingguan,
      "Frekuensi ambilan mingguan",
      1
    )

    const supplier = await prisma.supplier.create({
      data: {
        nama,
        kontak_wa,
        link: locationPayload.link,
        latitude: locationPayload.latitude,
        longitude: locationPayload.longitude,
        transactionStatus: transactionStatus === "GREEN" ? "GREEN" : "RED",
        nama_bank,
        nomor_rekening,
        atas_nama,
        target_bulanan_kg: targetBulananKg,
        frekuensi_ambilan_mingguan: frekuensiAmbilanMingguan,
        hari_ambilan: hari_ambilan || null,
        warehouseId
      }
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Gagal menyimpan data supplier" }, { status: 500 })
  }
}
