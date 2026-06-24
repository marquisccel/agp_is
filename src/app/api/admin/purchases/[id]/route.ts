import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { nonNegativeNumber, positiveNumber } from "@/lib/numberValidation"

const ALLOWED_ROLES = ["ADMIN", "MANAGER"]

type EditablePurchaseItemInput = {
  sku_name: string
  spec?: string | null
  berat_lapak?: number | string | null
  berat_final_item?: number | string | null
  harga_per_kg?: number | string | null
  subtotal?: number | string | null
}

const toNumber = (value: number | string | null | undefined, fieldName = "Nilai") => nonNegativeNumber(value, fieldName)

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
    if (["ADMIN"].includes(role) && userWarehouseId && purchase.warehouseId !== userWarehouseId) {
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
    if (["ADMIN"].includes(role) && userWarehouseId && existing.warehouseId !== userWarehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }
    if (existing.status_approval === "sudah_transfer") {
      return NextResponse.json({ error: "Transaksi yang sudah transfer tidak dapat diedit. Buat koreksi manual melalui alur audit." }, { status: 400 })
    }

    // Recompute totals from items
    const purchaseItems = items as EditablePurchaseItemInput[]
    if (!Array.isArray(purchaseItems) || purchaseItems.length === 0) {
      return NextResponse.json({ error: "Minimal harus ada 1 item transaksi." }, { status: 400 })
    }

    const validatedItems = purchaseItems.map((item, index) => {
      if (!item.sku_name || typeof item.sku_name !== "string") {
        throw new Error(`SKU item ${index + 1} wajib diisi.`)
      }

      const beratFinal = positiveNumber(item.berat_final_item, `Berat final item ${index + 1}`)
      const beratLapak = item.berat_lapak === null || item.berat_lapak === undefined || item.berat_lapak === ""
        ? beratFinal
        : positiveNumber(item.berat_lapak, `Berat lapak item ${index + 1}`)
      const hargaPerKg = positiveNumber(item.harga_per_kg, `Harga/kg item ${index + 1}`)
      const subtotal = item.subtotal === null || item.subtotal === undefined || item.subtotal === ""
        ? beratFinal * hargaPerKg
        : nonNegativeNumber(item.subtotal, `Subtotal item ${index + 1}`)

      return {
        sku_name: item.sku_name,
        spec: item.spec || null,
        berat_lapak: beratLapak,
        berat_final_item: beratFinal,
        harga_per_kg: hargaPerKg,
        subtotal,
      }
    })

    const totalBeforeCuts = validatedItems.reduce((s, i) => s + i.subtotal, 0)
    const totalPotSampah  = toNumber(harga_potongan_sampah, "Harga potongan sampah")
    const totalPotSusut   = toNumber(harga_potongan_susut, "Harga potongan susut")
    const totalPotAir     = toNumber(harga_potongan_air, "Harga potongan air")
    const totalPotKarung  = toNumber(harga_potongan_karung, "Harga potongan karung")
    const totalNilaiSetelah = totalBeforeCuts - totalPotSampah - totalPotSusut - totalPotAir - totalPotKarung
    if (totalNilaiSetelah < 0) {
      return NextResponse.json({ error: "Total nilai setelah potongan tidak boleh negatif." }, { status: 400 })
    }

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } })

      return tx.purchase.update({
        where: { id },
        data: {
          ...(supplierId ? { supplierId } : {}),
          ...(nomor_nota !== undefined ? { nomor_nota } : {}),
          ...(metode_pembayaran_terpilih ? { metode_pembayaran_terpilih } : {}),
          berat_timbangan_lapak: berat_timbangan_lapak != null ? toNumber(berat_timbangan_lapak, "Berat timbangan lapak") : existing.berat_timbangan_lapak,
          berat_timbangan_gudang: berat_timbangan_gudang != null ? toNumber(berat_timbangan_gudang, "Berat timbangan gudang") : existing.berat_timbangan_gudang,
          potongan_sampah:  toNumber(potongan_sampah, "Potongan sampah"),
          berat_potongan_sampah: toNumber(berat_potongan_sampah, "Berat potongan sampah"),
          harga_potongan_sampah: totalPotSampah,
          potongan_susut:   toNumber(potongan_susut, "Potongan susut"),
          berat_potongan_susut:  toNumber(berat_potongan_susut, "Berat potongan susut"),
          harga_potongan_susut:  totalPotSusut,
          potongan_air:     toNumber(potongan_air, "Potongan air"),
          berat_potongan_air:    toNumber(berat_potongan_air, "Berat potongan air"),
          harga_potongan_air:    totalPotAir,
          potongan_karung:  toNumber(potongan_karung, "Potongan karung"),
          berat_potongan_karung: toNumber(berat_potongan_karung, "Berat potongan karung"),
          harga_potongan_karung: totalPotKarung,
          total_nilai_sebelum_retur: totalBeforeCuts,
          total_nilai_setelah_retur: totalNilaiSetelah,
          items: {
            create: validatedItems,
          }
        },
        include: { items: true, supplier: true }
      })
    })

    await createAuditLog({
      userId: session.user.id,
      action: "EDIT_PURCHASE",
      table_name: "Purchase",
      record_id: id,
      old_data: existing,
      new_data: updatedPurchase,
    })

    return NextResponse.json({ message: "Transaksi berhasil diperbarui", purchase: updatedPurchase })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Edit Purchase Error:", error)
    return NextResponse.json(
      { error: "Gagal mengedit transaksi: " + message },
      { status: message.includes("harus") || message.includes("wajib") || message.includes("tidak boleh") ? 400 : 500 }
    )
  }
}
