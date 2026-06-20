import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { positiveNumber } from "@/lib/numberValidation"

type SkuPriceInput = {
  sku_name: string
  max_price_per_kg: number | string | null
}

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
    for (const [index, p] of (prices as SkuPriceInput[]).entries()) {
      if (!p.sku_name || typeof p.sku_name !== "string") {
        return NextResponse.json({ error: `SKU baris ${index + 1} wajib diisi.` }, { status: 400 })
      }
      const maxPrice = positiveNumber(p.max_price_per_kg, `Harga standar ${p.sku_name}`)

      // Find existing
      const existing = await prisma.skuPriceStandard.findFirst({
        where: { warehouseId, sku_name: p.sku_name }
      })

      if (existing) {
        await prisma.skuPriceStandard.update({
          where: { id: existing.id },
          data: { max_price_per_kg: maxPrice }
        })
      } else {
        await prisma.skuPriceStandard.create({
          data: {
            warehouseId,
            sku_name: p.sku_name,
            max_price_per_kg: maxPrice
          }
        })
      }
    }

    return NextResponse.json({ message: "Success" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error"
    console.error("SKU Prices Update Error:", error)
    return NextResponse.json({ error: message }, { status: message.includes("harus") ? 400 : 500 })
  }
}
