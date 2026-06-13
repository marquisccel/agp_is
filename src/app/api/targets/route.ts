import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

// GET all warehouse targets with monthly and yearly filter
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const qBulan = searchParams.get("bulan")
    const qTahun = searchParams.get("tahun")

    const where: { bulan?: number; tahun?: number } = {}
    if (qBulan) where.bulan = parseInt(qBulan)
    if (qTahun) where.tahun = parseInt(qTahun)

    const targets = await prisma.warehouseTarget.findMany({
      where,
      include: { warehouse: true }
    })
    return NextResponse.json(targets)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[TARGETS GET]", error)
    return NextResponse.json({ error: message }, { status: 500 })
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
    console.log("[TARGETS PUT] body:", JSON.stringify(body))

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
    const targetBulan = bulan ? parseInt(bulan) : now.getMonth() + 1
    const targetTahun = tahun ? parseInt(tahun) : now.getFullYear()

    const userId = session.user.id

    // Helper: parse float safely
    const pf = (v: unknown) => (v !== undefined && v !== null && v !== "")
      ? (parseFloat(String(v)) || 0) : 0

    const sharedData = {
      target_harian_kg: pf(target_harian_kg),
      target_mingguan_kg: pf(target_mingguan_kg),
      target_bulanan_kg: pf(target_bulanan_kg),
      target_harian_pet_final: pf(target_harian_pet_final),
      target_mingguan_pet_final: pf(target_mingguan_pet_final),
      target_bulanan_pet_final: pf(target_bulanan_pet_final),
      target_harian_bale_press: pf(target_harian_bale_press),
      target_mingguan_bale_press: pf(target_mingguan_bale_press),
      target_bulanan_bale_press: pf(target_bulanan_bale_press),
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

    console.log("[TARGETS PUT] saved:", target.id)
    return NextResponse.json(target)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const stack = error instanceof Error ? error.stack : undefined
    console.error("[TARGETS PUT] error:", message, stack)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
