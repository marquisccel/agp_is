import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { parseSupplierCoordinateCsv, normalizeWarehouseLabel } from "@/lib/supplierCsvImport"
import { buildSupplierLocationPayload } from "@/lib/supplierLocation"
import { normalizeSupplierName } from "@/lib/supplierDuplicate"

type RowResult = {
  rowNumber: number
  nama: string
  status: "updated" | "skipped"
  message: string
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { csv } = await req.json()
    if (typeof csv !== "string" || !csv.trim()) {
      return NextResponse.json({ error: "Isi CSV tidak boleh kosong." }, { status: 400 })
    }

    const { rows, errors: parseErrors } = parseSupplierCoordinateCsv(csv)
    if (parseErrors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: parseErrors[0].message }, { status: 400 })
    }

    const warehouses = await prisma.warehouse.findMany()
    const suppliers = await prisma.supplier.findMany({
      select: { id: true, nama: true, warehouseId: true },
    })

    const results: RowResult[] = parseErrors.map((e) => ({
      rowNumber: e.rowNumber,
      nama: "-",
      status: "skipped",
      message: e.message,
    }))

    const updates: { id: string; latitude: number; longitude: number; link: string | null }[] = []

    for (const row of rows) {
      const warehouse = warehouses.find(
        (w) => normalizeWarehouseLabel(w.nama) === normalizeWarehouseLabel(row.gudang)
      )
      if (!warehouse) {
        results.push({ rowNumber: row.rowNumber, nama: row.nama, status: "skipped", message: `Gudang "${row.gudang}" tidak dikenali.` })
        continue
      }

      const candidates = suppliers.filter(
        (s) => s.warehouseId === warehouse.id && normalizeSupplierName(s.nama) === normalizeSupplierName(row.nama)
      )
      if (candidates.length === 0) {
        results.push({ rowNumber: row.rowNumber, nama: row.nama, status: "skipped", message: `Supplier "${row.nama}" tidak ditemukan di gudang ${warehouse.nama}.` })
        continue
      }
      if (candidates.length > 1) {
        results.push({ rowNumber: row.rowNumber, nama: row.nama, status: "skipped", message: `Ada ${candidates.length} supplier dengan nama serupa di gudang ${warehouse.nama}, lengkapi manual untuk menghindari salah tempel.` })
        continue
      }

      const locationPayload = buildSupplierLocationPayload({ link: row.link, latitude: row.latitude, longitude: row.longitude })
      if (locationPayload.latitude === null || locationPayload.longitude === null) {
        results.push({ rowNumber: row.rowNumber, nama: row.nama, status: "skipped", message: "Koordinat tidak valid atau tidak dapat diekstrak dari link." })
        continue
      }

      updates.push({
        id: candidates[0].id,
        latitude: locationPayload.latitude,
        longitude: locationPayload.longitude,
        link: locationPayload.link,
      })
      results.push({ rowNumber: row.rowNumber, nama: row.nama, status: "updated", message: `Koordinat diperbarui (${warehouse.nama}).` })
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.supplier.update({
            where: { id: u.id },
            data: { latitude: u.latitude, longitude: u.longitude, link: u.link },
          })
        )
      )

      await createAuditLog({
        userId: session.user.id,
        action: "SUPPLIER_COORDINATES_BULK_IMPORT",
        table_name: "Supplier",
        record_id: "bulk",
        old_data: null,
        new_data: { updatedCount: updates.length, totalRows: rows.length },
      })
    }

    return NextResponse.json({
      updatedCount: updates.length,
      totalRows: rows.length,
      results,
    })
  } catch (error) {
    console.error("Error importing supplier coordinates:", error)
    return NextResponse.json({ error: "Gagal memproses import koordinat supplier." }, { status: 500 })
  }
}
