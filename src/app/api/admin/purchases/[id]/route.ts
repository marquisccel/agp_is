import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"

const ALLOWED_ROLES = ["ADMIN", "MANAGER"]

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true, items: true, staff: true }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    // Admin hanya bisa lihat transaksi warehousenya sendiri
    const userWarehouseId = session.user.warehouseId
    if (role === "ADMIN" && userWarehouseId && purchase.warehouseId !== userWarehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }

    return NextResponse.json(purchase)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      supplierId,
      items,          // array of { id?, sku_name, spec, berat_final_item, harga_per_kg, subtotal }
      nomor_nota,
      metode_pembayaran_terpilih,
      berat_timbangan_lapak,
      berat_timbangan_gudang,
      potongan_sampah, berat_potongan_sampah, harga_potongan_sampah,
      potongan_susut,  berat_potongan_susut,  harga_potongan_susut,
      potongan_air,    berat_potongan_air,    harga_potongan_air,
      potongan_karung, berat_potongan_karung, harga_potongan_karung,
    } = body

    // Fetch current purchase
    const existing = await prisma.purchase.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    // Admin hanya bisa edit warehousenya sendiri; Manager bisa semua
    const userWarehouseId = session.user.warehouseId
    if (role === "ADMIN" && userWarehouseId && existing.warehouseId !== userWarehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }

    // Recompute totals from items
    const totalBeforeCuts = items.reduce((s: number, i: any) => s + (parseFloat(i.subtotal) || 0), 0)
    const totalPotSampah  = parseFloat(harga_potongan_sampah) || 0
    const totalPotSusut   = parseFloat(harga_potongan_susut)  || 0
    const totalPotAir     = parseFloat(harga_potongan_air)    || 0
    const totalPotKarung  = parseFloat(harga_potongan_karung) || 0
    const totalNilaiSetelah = totalBeforeCuts - totalPotSampah - totalPotSusut - totalPotAir - totalPotKarung

    // Delete all existing items then recreate (simplest safe approach)
    await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } })

    const updatedPurchase = await prisma.purchase.update({
      where: { id },
      data: {
        ...(supplierId ? { supplierId } : {}),
        ...(nomor_nota !== undefined ? { nomor_nota } : {}),
        ...(metode_pembayaran_terpilih ? { metode_pembayaran_terpilih } : {}),
        berat_timbangan_lapak: berat_timbangan_lapak != null ? parseFloat(berat_timbangan_lapak) : existing.berat_timbangan_lapak,
        berat_timbangan_gudang: berat_timbangan_gudang != null ? parseFloat(berat_timbangan_gudang) : existing.berat_timbangan_gudang,
        potongan_sampah:  parseFloat(potongan_sampah)  || 0,
        berat_potongan_sampah: parseFloat(berat_potongan_sampah) || 0,
        harga_potongan_sampah: totalPotSampah,
        potongan_susut:   parseFloat(potongan_susut)   || 0,
        berat_potongan_susut:  parseFloat(berat_potongan_susut)  || 0,
        harga_potongan_susut:  totalPotSusut,
        potongan_air:     parseFloat(potongan_air)     || 0,
        berat_potongan_air:    parseFloat(berat_potongan_air)    || 0,
        harga_potongan_air:    totalPotAir,
        potongan_karung:  parseFloat(potongan_karung)  || 0,
        berat_potongan_karung: parseFloat(berat_potongan_karung) || 0,
        harga_potongan_karung: totalPotKarung,
        total_nilai_sebelum_retur: totalBeforeCuts,
        total_nilai_setelah_retur: totalNilaiSetelah,
        items: {
          create: items.map((item: any) => ({
            sku_name: item.sku_name,
            spec: item.spec || null,
            berat_lapak: parseFloat(item.berat_lapak) || parseFloat(item.berat_final_item) || 0,
            berat_final_item: parseFloat(item.berat_final_item) || 0,
            harga_per_kg: parseFloat(item.harga_per_kg) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
          }))
        }
      },
      include: { items: true, supplier: true }
    })

    await createAuditLog({
      userId: session.user.id,
      action: "EDIT_PURCHASE",
      table_name: "Purchase",
      record_id: id,
      old_data: JSON.stringify(existing),
      new_data: updatedPurchase,
    })

    return NextResponse.json({ message: "Transaksi berhasil diperbarui", purchase: updatedPurchase })
  } catch (error: any) {
    console.error("Edit Purchase Error:", error)
    return NextResponse.json({ error: "Gagal mengedit transaksi: " + error.message }, { status: 500 })
  }
}
