import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { nonNegativeNumber, positiveNumber, percentageNumber } from "@/lib/numberValidation"
import {
  calculatePurchaseTotals,
  hasPriceAboveStandard,
  resolveWeightForPricing,
  PurchaseCalculationError,
} from "@/lib/purchaseCalculation"

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
    // Admin wajib punya gudang. Pola lama menulis `userWarehouseId &&`,
    // sehingga Admin yang gudangnya kosong justru MELEWATI pemeriksaan ini
    // dan bisa menyentuh nota gudang mana pun -- kebalikan dari yang
    // dimaksud. Pendaftaran akun sekarang mewajibkan gudang untuk
    // Staff/Admin, tapi akun lama atau hasil seed bisa lolos, jadi
    // keadaannya ditolak secara tegas.
    if (role === "ADMIN" && !userWarehouseId) {
      return NextResponse.json({ error: "Akun Admin ini belum ditugaskan ke gudang." }, { status: 403 })
    }
    if (role === "ADMIN" && purchase.warehouseId !== userWarehouseId) {
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

    // Fetch current purchase beserta retur tersimpan dan standar harga gudang.
    // Retur diperlukan agar perhitungan ulang konsisten dengan verifikasi
    // gudang (D-3); standar harga diperlukan untuk pemeriksaan ulang harga (D-4).
    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: {
        returs: true,
        warehouse: { include: { skuPrices: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    // Admin hanya bisa edit warehousenya sendiri; Manager bisa semua
    const userWarehouseId = session.user.warehouseId
    // Admin wajib punya gudang. Pola lama menulis `userWarehouseId &&`,
    // sehingga Admin yang gudangnya kosong justru MELEWATI pemeriksaan ini
    // dan bisa menyentuh nota gudang mana pun -- kebalikan dari yang
    // dimaksud. Pendaftaran akun sekarang mewajibkan gudang untuk
    // Staff/Admin, tapi akun lama atau hasil seed bisa lolos, jadi
    // keadaannya ditolak secara tegas.
    if (role === "ADMIN" && !userWarehouseId) {
      return NextResponse.json({ error: "Akun Admin ini belum ditugaskan ke gudang." }, { status: 403 })
    }
    if (role === "ADMIN" && existing.warehouseId !== userWarehouseId) {
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

    // Metode timbangan menentukan berat mana yang dipakai sebagai dasar harga,
    // sama seperti pada verifikasi gudang.
    const metodeTerpilih = metode_pembayaran_terpilih || existing.metode_pembayaran_terpilih

    const validatedItems = purchaseItems.map((item, index) => {
      if (!item.sku_name || typeof item.sku_name !== "string") {
        throw new Error(`SKU item ${index + 1} wajib diisi.`)
      }

      const beratFinal = positiveNumber(item.berat_final_item, `Berat final item ${index + 1}`)
      const beratLapak = item.berat_lapak === null || item.berat_lapak === undefined || item.berat_lapak === ""
        ? beratFinal
        : positiveNumber(item.berat_lapak, `Berat lapak item ${index + 1}`)
      const hargaPerKg = positiveNumber(item.harga_per_kg, `Harga/kg item ${index + 1}`)
      const weightToUse = resolveWeightForPricing(metodeTerpilih, beratLapak, beratFinal)

      return {
        sku_name: item.sku_name,
        spec: item.spec || null,
        berat_lapak: beratLapak,
        berat_final_item: beratFinal,
        harga_per_kg: hargaPerKg,
        subtotal: weightToUse * hargaPerKg,
      }
    })

    // Potongan retur yang sudah tersimpan ikut diperhitungkan; sebelumnya
    // diabaikan sehingga nilai transaksi bisa berubah hanya karena disimpan ulang.
    const totalBeforeCuts = validatedItems.reduce((s, i) => s + i.subtotal, 0)
    const totalBeratRetur = existing.returs.reduce((s, r) => s + (r.berat_retur ?? 0), 0)
    const totalPotonganRetur = existing.returs.reduce((s, r) => {
      const related = validatedItems.find((i) => i.sku_name === r.sku_name)
      const harga = related ? related.harga_per_kg : 0
      return s + (r.berat_retur ?? 0) * harga + (r.potongan_nilai ?? 0)
    }, 0)

    const totalPotSampah  = toNumber(potongan_sampah, "Potongan sampah")
    const totalPotSusut   = toNumber(potongan_susut, "Potongan susut")
    const totalPotAir     = toNumber(potongan_air, "Potongan air")
    const totalPotKarung  = toNumber(potongan_karung, "Potongan karung")

    const persentase = percentageNumber(
      existing.persentase_pembayaran,
      "Persentase pembayaran",
      100
    )

    const totals = calculatePurchaseTotals({
      totalNilaiSebelumRetur: totalBeforeCuts,
      totalPotonganRetur,
      potonganSampah: totalPotSampah,
      potonganSusut: totalPotSusut,
      potonganAir: totalPotAir,
      potonganKarung: totalPotKarung,
      dpDigunakan: existing.dp_yang_digunakan ?? 0,
      persentasePembayaran: persentase,
    })

    // Transaksi yang terminnya sudah dilunasi tidak boleh dikembalikan menjadi
    // belum lunas hanya karena disimpan ulang. Pelunasan dapat terjadi pada
    // status approved, sehingga transaksi seperti ini masih dapat diedit.
    const sudahLunas = existing.status_pelunasan === "LUNAS" && persentase < 100

    // Pemeriksaan ulang harga terhadap standar SKU (D-4). Tanpa ini, harga di
    // atas standar dapat dimasukkan pasca-approval tanpa kembali ke antrean
    // persetujuan Manager.
    const standards = existing.warehouse?.skuPrices ?? []
    const priceAboveStandard = hasPriceAboveStandard(validatedItems, standards)
    const shouldReturnToApproval =
      priceAboveStandard && existing.status_approval === "approved"

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
          potongan_sampah:  totalPotSampah,
          berat_potongan_sampah: toNumber(berat_potongan_sampah, "Berat potongan sampah"),
          harga_potongan_sampah: toNumber(harga_potongan_sampah, "Harga potongan sampah"),
          potongan_susut:   totalPotSusut,
          berat_potongan_susut:  toNumber(berat_potongan_susut, "Berat potongan susut"),
          harga_potongan_susut:  toNumber(harga_potongan_susut, "Harga potongan susut"),
          potongan_air:     totalPotAir,
          berat_potongan_air:    toNumber(berat_potongan_air, "Berat potongan air"),
          harga_potongan_air:    toNumber(harga_potongan_air, "Harga potongan air"),
          potongan_karung:  totalPotKarung,
          berat_potongan_karung: toNumber(berat_potongan_karung, "Berat potongan karung"),
          harga_potongan_karung: toNumber(harga_potongan_karung, "Harga potongan karung"),
          total_nilai_sebelum_retur: totals.totalNilaiSebelumRetur,
          total_potongan_retur: totals.totalPotonganRetur,
          total_nilai_setelah_retur: totals.totalNilaiSetelahRetur,
          // Berat final dan field termin kini ikut dihitung ulang (D-3).
          berat_final:
            validatedItems.reduce((s, i) => s + i.berat_final_item, 0) - totalBeratRetur,
          total_dibayar: totals.nominalPembayaranAwal,
          nominal_pembayaran_awal: totals.nominalPembayaranAwal,
          nominal_belum_lunas: sudahLunas ? 0 : totals.nominalBelumLunas,
          status_pelunasan: sudahLunas ? "LUNAS" : totals.statusPelunasan,
          // Bila harga hasil edit melampaui standar SKU, transaksi dikembalikan
          // ke antrean persetujuan Manager dan nomor nota ditarik kembali (D-4).
          ...(shouldReturnToApproval
            ? { status_approval: "menunggu_approval_harga", nomor_nota: null }
            : {}),
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
    if (error instanceof PurchaseCalculationError) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error("Edit Purchase Error:", error)
    return NextResponse.json(
      { error: "Gagal mengedit transaksi: " + message },
      { status: message.includes("harus") || message.includes("wajib") || message.includes("tidak boleh") ? 400 : 500 }
    )
  }
}
