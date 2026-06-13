import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"

type DraftPurchaseItemInput = {
  sku_name: string
  spec?: string | null
  berat_estimasi: number | string
  harga_per_kg: number | string
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      supplierId,
      metode_pembayaran_terpilih,
      items,
      potongan_sampah,
      berat_potongan_sampah,
      harga_potongan_sampah,
      potongan_susut,
      berat_potongan_susut,
      harga_potongan_susut,
      potongan_air,
      berat_potongan_air,
      harga_potongan_air,
      potongan_karung,
      berat_potongan_karung,
      harga_potongan_karung
    } = await req.json()

    if (!supplierId || !metode_pembayaran_terpilih || !items || !items.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Determine warehouseId from session user
    const warehouseId = session.user.warehouseId
    if (!warehouseId) {
      return NextResponse.json({ error: "User is not assigned to a warehouse" }, { status: 403 })
    }

    const draftItems = items as DraftPurchaseItemInput[]
    const totalLapakWeight = draftItems.reduce((sum, item) => sum + (parseFloat(String(item.berat_estimasi)) || 0), 0)

    // Create Draft Purchase
    const purchase = await prisma.purchase.create({
      data: {
        warehouseId,
        supplierId,
        userIdStaff: session.user.id,
        metode_pembayaran_terpilih,
        berat_timbangan_lapak: totalLapakWeight,
        status_approval: "menunggu_verifikasi_supervisor",
        potongan_sampah: parseFloat(potongan_sampah) || 0,
        berat_potongan_sampah: parseFloat(berat_potongan_sampah) || 0,
        harga_potongan_sampah: parseFloat(harga_potongan_sampah) || 0,
        potongan_susut: parseFloat(potongan_susut) || 0,
        berat_potongan_susut: parseFloat(berat_potongan_susut) || 0,
        harga_potongan_susut: parseFloat(harga_potongan_susut) || 0,
        potongan_air: parseFloat(potongan_air) || 0,
        berat_potongan_air: parseFloat(berat_potongan_air) || 0,
        harga_potongan_air: parseFloat(harga_potongan_air) || 0,
        potongan_karung: parseFloat(potongan_karung) || 0,
        berat_potongan_karung: parseFloat(berat_potongan_karung) || 0,
        harga_potongan_karung: parseFloat(harga_potongan_karung) || 0,
        items: {
          create: draftItems.map((item) => ({
            sku_name: item.sku_name,
            spec: item.spec || null,
            berat_lapak: parseFloat(String(item.berat_estimasi)) || 0,
            berat_final_item: parseFloat(String(item.berat_estimasi)) || 0,
            harga_per_kg: parseFloat(String(item.harga_per_kg)) || 0,
            subtotal: (parseFloat(String(item.berat_estimasi)) || 0) * (parseFloat(String(item.harga_per_kg)) || 0),
          })),
        },
      },
      include: {
        items: true,
      },
    })

    // Audit Log
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_DRAFT",
      table_name: "Purchase",
      record_id: purchase.id,
      new_data: purchase,
    })

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error creating draft purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
