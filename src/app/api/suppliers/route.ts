import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
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

    const locationPayload = buildSupplierLocationPayload({ link, latitude, longitude })

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
        target_bulanan_kg: parseFloat(target_bulanan_kg) || 0,
        frekuensi_ambilan_mingguan: parseInt(frekuensi_ambilan_mingguan) || 1,
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
