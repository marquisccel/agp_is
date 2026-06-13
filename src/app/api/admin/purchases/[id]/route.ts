import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"

const ALLOWED_ROLES = ["ADMIN", "SUPERVISOR", "MANAGER"]

type EditablePurchaseItemInput = {
  sku_name: string
  spec?: string | null
  berat_lapak?: number | string | null
  berat_final_item?: number | string | null
  harga_per_kg?: number | string | null
  subtotal?: number | string | null
}

const toNumber = (value: number | string | null | undefined) => parseFloat(String(value ?? "")) || 0

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    const role = session?.user?.role
    if (!role || !ALLOWED_ROLES.includes(role)) {
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
    if (["ADMIN", "SUPERVISOR"].includes(role) && userWarehouseId && purchase.warehouseId !== userWarehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }

    return NextResponse.json(purchase)
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    const role = session?.user?.role
    if (!role || !ALLOWED_ROLES.includes(role)) {
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
    if (["ADMIN", "SUPERVISOR"].includes(role) && userWarehouseId && existing.warehouseId !== userWarehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }

    // Recompute totals from items
    const purchaseItems = items as EditablePurchaseItemInput[]
    const totalBeforeCuts = purchaseItems.reduce((s, i) => s + toNumber(i.subtotal), 0)
    const totalPotSampah  = toNumber(harga_potongan_sampah)
    const totalPotSusut   = toNumber(harga_potongan_susut)
    const totalPotAir     = toNumber(harga_potongan_air)
    const totalPotKarung  = toNumber(harga_potongan_karung)
    const totalNilaiSetelah = totalBeforeCuts - totalPotSampah - totalPotSusut - totalPotAir - totalPotKarung

    // Delete all existing items then recreate (simplest safe approach)
    await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } })

    const updatedPurchase = await prisma.purchase.update({
      where: { id },
      data: {
        ...(supplierId ? { supplierId } : {}),
        ...(nomor_nota !== undefined ? { nomor_nota } : {}),
        ...(metode_pembayaran_terpilih ? { metode_pembayaran_terpilih } : {}),
        berat_timbangan_lapak: berat_timbangan_lapak != null ? toNumber(berat_timbangan_lapak) : existing.berat_timbangan_lapak,
        berat_timbangan_gudang: berat_timbangan_gudang != null ? toNumber(berat_timbangan_gudang) : existing.berat_timbangan_gudang,
        potongan_sampah:  toNumber(potongan_sampah),
        berat_potongan_sampah: toNumber(berat_potongan_sampah),
        harga_potongan_sampah: totalPotSampah,
        potongan_susut:   toNumber(potongan_susut),
        berat_potongan_susut:  toNumber(berat_potongan_susut),
        harga_potongan_susut:  totalPotSusut,
        potongan_air:     toNumber(potongan_air),
        berat_potongan_air:    toNumber(berat_potongan_air),
        harga_potongan_air:    totalPotAir,
        potongan_karung:  toNumber(potongan_karung),
        berat_potongan_karung: toNumber(berat_potongan_karung),
        harga_potongan_karung: totalPotKarung,
        total_nilai_sebelum_retur: totalBeforeCuts,
        total_nilai_setelah_retur: totalNilaiSetelah,
        items: {
          create: purchaseItems.map((item) => ({
            sku_name: item.sku_name,
            spec: item.spec || null,
            berat_lapak: toNumber(item.berat_lapak) || toNumber(item.berat_final_item),
            berat_final_item: toNumber(item.berat_final_item),
            harga_per_kg: toNumber(item.harga_per_kg),
            subtotal: toNumber(item.subtotal),
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
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Edit Purchase Error:", error)
    return NextResponse.json({ error: "Gagal mengedit transaksi: " + message }, { status: 500 })
  }
}
