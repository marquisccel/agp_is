import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { nonNegativeNumber, percentageNumber, positiveNumber } from "@/lib/numberValidation"
import { PENDING_VERIFICATION_STATUSES } from "@/lib/purchaseStatus"
import { markSupplierGreen } from "@/lib/supplierStatus"
import { allocateDp, InsufficientDpError } from "@/lib/dpAllocation"

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

const toNumber = (value: number | string | null | undefined, fieldName = "Nilai") => nonNegativeNumber(value, fieldName)

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || session.user.role !== "ADMIN") {
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
    if (currentPurchase.warehouseId !== session.user.warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }
    if (!PENDING_VERIFICATION_STATUSES.includes(currentPurchase.status_approval)) {
      return NextResponse.json({ error: "Purchase is not waiting for warehouse verification" }, { status: 400 })
    }

    if (!["TIMBANGAN_GUDANG", "TIMBANGAN_LAPAK"].includes(metode_pembayaran_terpilih)) {
      return NextResponse.json({ error: "Metode pembayaran/timbangan tidak valid." }, { status: 400 })
    }

    const timbangLapak = positiveNumber(berat_timbangan_lapak, "Berat timbangan lapak")
    const timbangGudang = positiveNumber(berat_timbangan_gudang, "Berat timbangan gudang")
    const paymentPercent = percentageNumber(persentase_pembayaran, "Persentase pembayaran", 100)
    const initialPayment = nonNegativeNumber(nominal_pembayaran_awal, "Nominal pembayaran awal")
    const remainingPayment = nonNegativeNumber(nominal_belum_lunas, "Nominal belum lunas")
    const finalStatusPelunasan = paymentPercent < 100 ? "BELUM_LUNAS" : "LUNAS"
    if (status_pelunasan && status_pelunasan !== finalStatusPelunasan) {
      return NextResponse.json({ error: "Status pelunasan tidak sesuai dengan persentase pembayaran." }, { status: 400 })
    }

    const berat_final = metode_pembayaran_terpilih === "TIMBANGAN_GUDANG" ? timbangGudang : timbangLapak
    
    let total_nilai_sebelum_retur = 0
    let isPriceAboveStandard = false

    // Update items subtotal & check price standards
    const purchaseItems = items as DoubleCheckItemInput[]
    const updatedItems = purchaseItems.map((item) => {
      if (!item.sku_name || typeof item.sku_name !== "string") {
        throw new Error("SKU item wajib diisi.")
      }

      const gudangW = positiveNumber(item.berat_final_item, `Berat final ${item.sku_name}`);
      const lapakW = item.berat_lapak === null || item.berat_lapak === undefined || item.berat_lapak === ""
        ? gudangW
        : positiveNumber(item.berat_lapak, `Berat lapak ${item.sku_name}`);
      const weightToUse = metode_pembayaran_terpilih === "TIMBANGAN_LAPAK" ? lapakW : gudangW;
      
      const hargaPerKg = positiveNumber(item.harga_per_kg, `Harga/kg ${item.sku_name}`)
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
      if (!r.sku_name || typeof r.sku_name !== "string") {
        throw new Error("SKU retur wajib diisi.")
      }

      const beratRetur = toNumber(r.berat_retur, `Berat retur ${r.sku_name}`)
      const potonganNilai = toNumber(r.potongan_nilai, `Potongan retur ${r.sku_name}`)
      
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
    const final_dp_used = toNumber(dp_yang_digunakan, "DP yang digunakan")
    const final_potongan_sampah = toNumber(potongan_sampah, "Potongan sampah")
    const final_potongan_susut = toNumber(potongan_susut, "Potongan susut")
    const final_potongan_air = toNumber(potongan_air, "Potongan air")
    const final_potongan_karung = toNumber(potongan_karung, "Potongan karung")
    const total_net_payout = total_nilai_setelah_retur - (final_potongan_sampah + final_potongan_susut + final_potongan_air + final_potongan_karung)
    const total_dibayar = total_net_payout - final_dp_used
    if (total_net_payout < 0 || total_dibayar < 0) {
      return NextResponse.json({ error: "Total pembayaran tidak boleh negatif. Periksa potongan dan DP yang digunakan." }, { status: 400 })
    }
    if (paymentPercent < 100 && (initialPayment <= 0 || initialPayment > total_dibayar || remainingPayment < 0)) {
      return NextResponse.json({ error: "Skema pembayaran termin tidak valid." }, { status: 400 })
    }

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
          berat_timbangan_lapak: timbangLapak,
          berat_timbangan_gudang: timbangGudang,
          berat_final: berat_final - total_berat_retur,
          total_nilai_sebelum_retur,
          total_potongan_retur,
          total_nilai_setelah_retur,
          potongan_sampah: final_potongan_sampah,
          berat_potongan_sampah: toNumber(berat_potongan_sampah, "Berat potongan sampah"),
          harga_potongan_sampah: toNumber(harga_potongan_sampah, "Harga potongan sampah"),
          potongan_susut: final_potongan_susut,
          berat_potongan_susut: toNumber(berat_potongan_susut, "Berat potongan susut"),
          harga_potongan_susut: toNumber(harga_potongan_susut, "Harga potongan susut"),
          potongan_air: final_potongan_air,
          berat_potongan_air: toNumber(berat_potongan_air, "Berat potongan air"),
          harga_potongan_air: toNumber(harga_potongan_air, "Harga potongan air"),
          potongan_karung: final_potongan_karung,
          berat_potongan_karung: toNumber(berat_potongan_karung, "Berat potongan karung"),
          harga_potongan_karung: toNumber(harga_potongan_karung, "Harga potongan karung"),
          dp_yang_digunakan: final_dp_used,
          total_dibayar: paymentPercent < 100 ? initialPayment : total_dibayar,
          persentase_pembayaran: paymentPercent,
          nominal_pembayaran_awal: paymentPercent < 100 ? initialPayment : total_dibayar,
          nominal_belum_lunas: paymentPercent < 100 ? remainingPayment : 0,
          status_pelunasan: finalStatusPelunasan,
          status_approval: newStatus,
          items: {
            create: updatedItems.map((i) => ({
              sku_name: i.sku_name,
              spec: i.spec || null,
              berat_lapak: toNumber(i.berat_lapak, `Berat lapak ${i.sku_name}`) || toNumber(i.berat_final_item, `Berat final ${i.sku_name}`),
              berat_final_item: toNumber(i.berat_final_item, `Berat final ${i.sku_name}`),
              harga_per_kg: toNumber(i.harga_per_kg, `Harga/kg ${i.sku_name}`),
              subtotal: toNumber(i.subtotal, `Subtotal ${i.sku_name}`),
            }))
          },
          returs: {
            create: returItemsData
          }
        },
      })

      // Potong saldo DP supplier bila DP digunakan.
      // Alokasi dapat menjangkau beberapa record DP sekaligus, dan akan
      // melempar InsufficientDpError bila total sisa saldo tidak mencukupi --
      // sehingga seluruh transaction ini dibatalkan dan tidak ada transaksi
      // yang tersimpan dengan DP yang tidak pernah terpotong.
      if (final_dp_used > 0) {
        await allocateDp(tx, currentPurchase.supplierId, final_dp_used)
      }

      if (newStatus === "approved") {
        await markSupplierGreen(tx, {
          supplierId: currentPurchase.supplierId,
          userId: session.user.id,
          trigger: "admin_double_check_purchase",
          purchaseId,
        })
      }

      return purchase
    })

    // 3. Audit Log
    await createAuditLog({
      userId: session.user.id,
      action: "ADMIN_DOUBLE_CHECK",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: currentPurchase,
      new_data: updatedPurchase,
    })

    return NextResponse.json(updatedPurchase)
  } catch (error) {
    const message = getErrorMessage(error)
    if (error instanceof InsufficientDpError) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error("Error double checking purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
