import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { PENDING_SUPERVISOR_STATUSES } from "@/lib/purchaseStatus"
import { markSupplierGreen } from "@/lib/supplierStatus"

type DoubleCheckItemInput = {
  sku_name: string
  spec?: string | null
  berat_lapak?: number | string | null
  berat_final_item?: number | string | null
  harga_per_kg?: number | string | null
  subtotal?: number | string | null
}

type ReturItemInput = {
  sku_name: string
  berat_retur?: number | string | null
  potongan_nilai?: number | string | null
  alasan?: string | null
}

const toNumber = (value: number | string | null | undefined) => parseFloat(String(value ?? "")) || 0

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !["ADMIN", "SUPERVISOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const {
      berat_timbangan_lapak,
      berat_timbangan_gudang,
      metode_pembayaran_terpilih,
      items, // Updated items with final weights
      returs, // Array of retur items
      dp_yang_digunakan,
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
      harga_potongan_karung,
      persentase_pembayaran,
      nominal_pembayaran_awal,
      nominal_belum_lunas,
      status_pelunasan
    } = await req.json()

    // 1. Fetch current purchase
    const currentPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true, warehouse: { include: { skuPrices: true } } },
    })

    if (!currentPurchase) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (session.user.role === "SUPERVISOR" && currentPurchase.warehouseId !== session.user.warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }
    if (!PENDING_SUPERVISOR_STATUSES.includes(currentPurchase.status_approval)) {
      return NextResponse.json({ error: "Purchase is not waiting for warehouse verification" }, { status: 400 })
    }

    const berat_final = metode_pembayaran_terpilih === "TIMBANGAN_GUDANG" ? berat_timbangan_gudang : berat_timbangan_lapak
    
    let total_nilai_sebelum_retur = 0
    let isPriceAboveStandard = false

    // Update items subtotal & check price standards
    const purchaseItems = items as DoubleCheckItemInput[]
    const updatedItems = purchaseItems.map((item) => {
      const lapakW = toNumber(item.berat_lapak) || toNumber(item.berat_final_item);
      const gudangW = toNumber(item.berat_final_item);
      const weightToUse = metode_pembayaran_terpilih === "TIMBANGAN_LAPAK" ? lapakW : gudangW;
      
      const hargaPerKg = toNumber(item.harga_per_kg)
      const subtotal = weightToUse * hargaPerKg
      total_nilai_sebelum_retur += subtotal
      
      const standard = currentPurchase.warehouse?.skuPrices.find(s => s.sku_name === item.sku_name)
      if (standard && hargaPerKg > standard.max_price_per_kg) {
        isPriceAboveStandard = true
      }
      return { ...item, harga_per_kg: hargaPerKg, subtotal }
    })

    // Calculate Returns
    let total_potongan_retur = 0
    let total_berat_retur = 0
    const returItems = (returs as ReturItemInput[] | undefined) ?? []
    const returItemsData = returItems.map((r) => {
      // Calculate return value = (berat_retur * harga_per_kg of that SKU) + potongan_nilai
      const relatedItem = updatedItems.find((i) => i.sku_name === r.sku_name)
      const harga = relatedItem ? relatedItem.harga_per_kg : 0
      const beratRetur = toNumber(r.berat_retur)
      const potonganNilai = toNumber(r.potongan_nilai)
      
      const potongan = (beratRetur * harga) + potonganNilai
      total_potongan_retur += potongan
      total_berat_retur += beratRetur
      return {
        sku_name: r.sku_name,
        berat_retur: beratRetur,
        potongan_nilai: potonganNilai,
        alasan: r.alasan || "",
      }
    })

    const total_nilai_setelah_retur = total_nilai_sebelum_retur - total_potongan_retur
    const final_dp_used = dp_yang_digunakan || 0
    const final_potongan_sampah = potongan_sampah || 0
    const final_potongan_susut = potongan_susut || 0
    const final_potongan_air = potongan_air || 0
    const final_potongan_karung = potongan_karung || 0
    const total_net_payout = total_nilai_setelah_retur - (final_potongan_sampah + final_potongan_susut + final_potongan_air + final_potongan_karung)
    const total_dibayar = total_net_payout - final_dp_used

    const newStatus = isPriceAboveStandard ? "menunggu_approval_harga" : "approved"
    
    let nomor_nota = null
    if (newStatus === "approved") {
      nomor_nota = `INV-${Date.now()}` // Generate Nota
    }

    // 2. Perform Transaction update
    const updatedPurchase = await prisma.$transaction(async (tx) => {
      // Clear old items
      await tx.purchaseItem.deleteMany({ where: { purchaseId } })
      
      // Update Purchase
      const purchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          nomor_nota,
          userIdAdmin: session.user.id,
          metode_pembayaran_terpilih,
          berat_timbangan_lapak,
          berat_timbangan_gudang,
          berat_final: berat_final - total_berat_retur,
          total_nilai_sebelum_retur,
          total_potongan_retur,
          total_nilai_setelah_retur,
          potongan_sampah: final_potongan_sampah,
          berat_potongan_sampah: parseFloat(berat_potongan_sampah) || 0,
          harga_potongan_sampah: parseFloat(harga_potongan_sampah) || 0,
          potongan_susut: final_potongan_susut,
          berat_potongan_susut: parseFloat(berat_potongan_susut) || 0,
          harga_potongan_susut: parseFloat(harga_potongan_susut) || 0,
          potongan_air: final_potongan_air,
          berat_potongan_air: parseFloat(berat_potongan_air) || 0,
          harga_potongan_air: parseFloat(harga_potongan_air) || 0,
          potongan_karung: final_potongan_karung,
          berat_potongan_karung: parseFloat(berat_potongan_karung) || 0,
          harga_potongan_karung: parseFloat(harga_potongan_karung) || 0,
          dp_yang_digunakan: final_dp_used,
          total_dibayar: persentase_pembayaran < 100 ? nominal_pembayaran_awal : total_dibayar,
          persentase_pembayaran,
          nominal_pembayaran_awal,
          nominal_belum_lunas,
          status_pelunasan,
          status_approval: newStatus,
          items: {
            create: updatedItems.map((i) => ({
              sku_name: i.sku_name,
              spec: i.spec || null,
              berat_lapak: toNumber(i.berat_lapak) || toNumber(i.berat_final_item),
              berat_final_item: toNumber(i.berat_final_item),
              harga_per_kg: toNumber(i.harga_per_kg),
              subtotal: toNumber(i.subtotal),
            }))
          },
          returs: {
            create: returItemsData
          }
        },
      })

      // If DP used, update Supplier's DP
      if (final_dp_used > 0) {
        // Need to find an approved DP that has sisa_dp >= final_dp_used
        // For simplicity, let's just assume we update the most recent one or aggregate it later.
        // The PRD mentions DP is per supplier.
        const dp = await tx.downPayment.findFirst({
          where: { supplierId: currentPurchase.supplierId, status_approval: 'approved', sisa_dp: { gte: final_dp_used } }
        })
        if (dp) {
          await tx.downPayment.update({
            where: { id: dp.id },
            data: {
              dp_used_amount: { increment: final_dp_used },
              sisa_dp: { decrement: final_dp_used }
            }
          })
        }
      }

      if (newStatus === "approved") {
        await markSupplierGreen(tx, {
          supplierId: currentPurchase.supplierId,
          userId: session.user.id,
          trigger: session.user.role === "SUPERVISOR" ? "supervisor_verify_purchase" : "admin_double_check_purchase",
          purchaseId,
        })
      }

      return purchase
    })

    // 3. Audit Log
    await createAuditLog({
      userId: session.user.id,
      action: session.user.role === "SUPERVISOR" ? "SUPERVISOR_VERIFY_PURCHASE" : "DOUBLE_CHECK",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: currentPurchase,
      new_data: updatedPurchase,
    })

    return NextResponse.json(updatedPurchase)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error double checking purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
