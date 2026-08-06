import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { positiveNumber } from "@/lib/numberValidation"
import { createAuditLog } from "@/lib/audit"

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
        // Lewati penulisan bila nilainya tidak berubah, agar audit log tidak
        // dipenuhi entri tanpa perubahan nyata.
        if (existing.max_price_per_kg === maxPrice) continue

        const updated = await prisma.skuPriceStandard.update({
          where: { id: existing.id },
          data: { max_price_per_kg: maxPrice }
        })

        // Standar harga adalah dasar kontrol harga; perubahannya wajib
        // tercatat agar dapat diaudit (D-4).
        await createAuditLog({
          userId: session.user.id,
          action: "UPDATE_SKU_PRICE_STANDARD",
          table_name: "SkuPriceStandard",
          record_id: existing.id,
          old_data: existing,
          new_data: updated,
        })
      } else {
        const created = await prisma.skuPriceStandard.create({
          data: {
            warehouseId,
            sku_name: p.sku_name,
            max_price_per_kg: maxPrice
          }
        })

        await createAuditLog({
          userId: session.user.id,
          action: "CREATE_SKU_PRICE_STANDARD",
          table_name: "SkuPriceStandard",
          record_id: created.id,
          old_data: null,
          new_data: created,
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
