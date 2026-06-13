import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
// Note: You need to import the next-auth handler or configure it. 
// Assuming it's configured to return session properly based on Phase 1 setup.

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

    const totalLapakWeight = items.reduce((sum: number, item: any) => sum + (parseFloat(item.berat_estimasi) || 0), 0)

    // Create Draft Purchase
    const purchase = await prisma.purchase.create({
      data: {
        warehouseId,
        supplierId,
        userIdStaff: session.user.id,
        metode_pembayaran_terpilih,
        berat_timbangan_lapak: totalLapakWeight,
        status_approval: "menunggu_double_cek",
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
          create: items.map((item: any) => ({
            sku_name: item.sku_name,
            spec: item.spec || null,
            berat_lapak: parseFloat(item.berat_estimasi) || 0,
            berat_final_item: parseFloat(item.berat_estimasi) || 0, // Default to estimate
            harga_per_kg: parseFloat(item.harga_per_kg) || 0,
            subtotal: (parseFloat(item.berat_estimasi) || 0) * (parseFloat(item.harga_per_kg) || 0),
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
  } catch (error: any) {
    console.error("Error creating draft purchase:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
