import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { nonNegativeNumber, positiveInteger } from "@/lib/numberValidation"
import { isOperationalRole } from "@/lib/roles"
import { buildSupplierLocationPayload } from "@/lib/supplierLocation"
import { validateSupplierContactFields } from "@/lib/supplierValidation"
import { findPotentialDuplicates } from "@/lib/supplierDuplicate"

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
      confirmDuplicate,
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

    const contactError = validateSupplierContactFields({ kontak_wa, nomor_rekening })
    if (contactError) {
      return NextResponse.json({ error: contactError }, { status: 400 })
    }

    const locationPayload = buildSupplierLocationPayload({ link, latitude, longitude })
    const targetBulananKg = nonNegativeNumber(target_bulanan_kg, "Target bulanan supplier")
    const frekuensiAmbilanMingguan = positiveInteger(
      frekuensi_ambilan_mingguan,
      "Frekuensi ambilan mingguan",
      1
    )

    if (!confirmDuplicate) {
      const existingInWarehouse = await prisma.supplier.findMany({
        where: { warehouseId },
        select: { id: true, nama: true, latitude: true, longitude: true },
      })
      const duplicates = findPotentialDuplicates(
        { nama, latitude: locationPayload.latitude, longitude: locationPayload.longitude },
        existingInWarehouse
      )
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: "Ditemukan supplier dengan nama/lokasi mirip di gudang ini.",
            duplicates,
            requiresConfirmation: true,
          },
          { status: 409 }
        )
      }
    }

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

    // Pembuatan supplier sebelumnya tidak tercatat sama sekali di audit log
    // (D-5) -- data kontak/rekening baru tidak bisa ditelusuri siapa yang
    // menambahkannya dan kapan.
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_SUPPLIER",
      table_name: "Supplier",
      record_id: supplier.id,
      old_data: null,
      new_data: supplier,
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Gagal menyimpan data supplier" }, { status: 500 })
  }
}
