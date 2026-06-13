import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { warehouseId, prices } = body // prices is array of { sku_name, max_price_per_kg }

    if (!warehouseId || !Array.isArray(prices)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Upsert each price
    for (const p of prices) {
      // Find existing
      const existing = await prisma.skuPriceStandard.findFirst({
        where: { warehouseId, sku_name: p.sku_name }
      })

      if (existing) {
        await prisma.skuPriceStandard.update({
          where: { id: existing.id },
          data: { max_price_per_kg: p.max_price_per_kg }
        })
      } else {
        await prisma.skuPriceStandard.create({
          data: {
            warehouseId,
            sku_name: p.sku_name,
            max_price_per_kg: p.max_price_per_kg
          }
        })
      }
    }

    return NextResponse.json({ message: "Success" })
  } catch (error: any) {
    console.error("SKU Prices Update Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
