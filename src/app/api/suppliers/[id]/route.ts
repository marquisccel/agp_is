import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
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

    // If STAFF, ensure supplier belongs to their warehouse
    if (role === "STAFF") {
      const staffWarehouseId = session.user.warehouseId
      const existing = await prisma.supplier.findUnique({ where: { id } })
      if (!existing || existing.warehouseId !== staffWarehouseId) {
        return NextResponse.json({ error: "Tidak memiliki akses ke supplier ini" }, { status: 403 })
      }
    }

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
        target_bulanan_kg: parseFloat(target_bulanan_kg) || 0,
        frekuensi_ambilan_mingguan: parseInt(frekuensi_ambilan_mingguan) || 1,
        hari_ambilan: hari_ambilan || null,
      },
    })

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
