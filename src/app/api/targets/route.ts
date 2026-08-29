import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { nonNegativeNumber, positiveInteger } from "@/lib/numberValidation"

function parseMonth(value: string | number | null | undefined, fallback: number) {
  const month = value === null || value === undefined || value === ""
    ? fallback
    : positiveInteger(value, "Bulan")
  if (month < 1 || month > 12) {
    throw new Error("Bulan harus berada di rentang 1-12.")
  }
  return month
}

function parseYear(value: string | number | null | undefined, fallback: number) {
  const year = value === null || value === undefined || value === ""
    ? fallback
    : positiveInteger(value, "Tahun")
  if (year < 2000 || year > 2100) {
    throw new Error("Tahun harus berada di rentang 2000-2100.")
  }
  return year
}

// GET all warehouse targets with monthly and yearly filter
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const qBulan = searchParams.get("bulan")
    const qTahun = searchParams.get("tahun")

    const where: { bulan?: number; tahun?: number } = {}
    if (qBulan) where.bulan = parseMonth(qBulan, new Date().getMonth() + 1)
    if (qTahun) where.tahun = parseYear(qTahun, new Date().getFullYear())

    const targets = await prisma.warehouseTarget.findMany({
      where,
      // updatedBy ikut diambil supaya halaman Setting Target bisa menyebut
      // siapa yang terakhir menetapkan target gudang itu. Tanpa nama, baris
      // "terakhir diubah" hanya memberi tanggal, dan pertanyaan yang
      // sebenarnya muncul di rapat adalah siapa yang menaikkannya.
      include: { warehouse: true, updatedBy: { select: { nama: true } } }
    })
    return NextResponse.json(targets)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[TARGETS GET]", error)
    return NextResponse.json({ error: message }, { status: message.includes("harus") ? 400 : 500 })
  }
}

// PUT - Manager sets target for a warehouse for specific month/year
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const {
      warehouseId,
      bulan,
      tahun,
      target_harian_kg,
      target_mingguan_kg,
      target_bulanan_kg,
      target_harian_pet_final,
      target_mingguan_pet_final,
      target_bulanan_pet_final,
      target_harian_bale_press,
      target_mingguan_bale_press,
      target_bulanan_bale_press,
    } = body

    if (!warehouseId) {
      return NextResponse.json({ error: "warehouseId required" }, { status: 400 })
    }

    const now = new Date()
    const targetBulan = parseMonth(bulan, now.getMonth() + 1)
    const targetTahun = parseYear(tahun, now.getFullYear())

    const userId = session.user.id

    const targetNumber = (v: number | string | null | undefined, fieldName: string) =>
      nonNegativeNumber(v, fieldName)

    const sharedData = {
      target_harian_kg: targetNumber(target_harian_kg, "Target harian"),
      target_mingguan_kg: targetNumber(target_mingguan_kg, "Target mingguan"),
      target_bulanan_kg: targetNumber(target_bulanan_kg, "Target bulanan"),
      target_harian_pet_final: targetNumber(target_harian_pet_final, "Target harian PET Final"),
      target_mingguan_pet_final: targetNumber(target_mingguan_pet_final, "Target mingguan PET Final"),
      target_bulanan_pet_final: targetNumber(target_bulanan_pet_final, "Target bulanan PET Final"),
      target_harian_bale_press: targetNumber(target_harian_bale_press, "Target harian Bale Press"),
      target_mingguan_bale_press: targetNumber(target_mingguan_bale_press, "Target mingguan Bale Press"),
      target_bulanan_bale_press: targetNumber(target_bulanan_bale_press, "Target bulanan Bale Press"),
      ...(userId ? { updatedByUserId: userId } : {}),
    }

    // Use findUnique with compound index
    const existing = await prisma.warehouseTarget.findUnique({
      where: {
        warehouseId_bulan_tahun: {
          warehouseId,
          bulan: targetBulan,
          tahun: targetTahun,
        }
      }
    })

    let target
    if (existing) {
      target = await prisma.warehouseTarget.update({
        where: {
          warehouseId_bulan_tahun: {
            warehouseId,
            bulan: targetBulan,
            tahun: targetTahun,
          }
        },
        data: sharedData,
        include: { warehouse: true }
      })
    } else {
      target = await prisma.warehouseTarget.create({
        data: {
          warehouseId,
          bulan: targetBulan,
          tahun: targetTahun,
          ...sharedData,
        },
        include: { warehouse: true }
      })
    }

    // Perubahan target gudang sebelumnya tidak tercatat di audit log (D-5) --
    // tidak bisa ditelusuri siapa yang mengubah target dan nilai sebelumnya.
    await createAuditLog({
      userId,
      action: existing ? "UPDATE_WAREHOUSE_TARGET" : "CREATE_WAREHOUSE_TARGET",
      table_name: "WarehouseTarget",
      record_id: target.id,
      old_data: existing,
      new_data: target,
    })

    return NextResponse.json(target)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const stack = error instanceof Error ? error.stack : undefined
    console.error("[TARGETS PUT] error:", message, stack)
    return NextResponse.json({ error: message }, { status: message.includes("harus") ? 400 : 500 })
  }
}
