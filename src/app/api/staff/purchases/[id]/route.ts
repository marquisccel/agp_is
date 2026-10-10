import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLogTx } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { nonNegativeNumber, positiveNumber } from "@/lib/numberValidation"
import { allocateDp, refundDp, InsufficientDpError } from "@/lib/dpAllocation"

type EditItemInput = {
  sku_name: string
  spec?: string | null
  berat_estimasi: number | string
  harga_per_kg: number | string
}

/**
 * Staff membetulkan nota draft buatannya sendiri.
 *
 * ── Kenapa ada rute tersendiri, bukan memakai /api/admin/purchases ──────
 *
 * Rute Admin/Manager menerima berat final dan harga tanpa batasan status
 * selain "sudah transfer", dan bentuk isiannya mengikuti form verifikasi.
 * Staff hanya perlu membetulkan salah ketik pada nota yang MASIH draft, dengan
 * isian yang sama seperti saat membuatnya. Rute ini karena itu:
 *
 *   - hanya untuk nota milik Staff itu sendiri, di gudangnya;
 *   - hanya selama statusnya masih "menunggu_verifikasi". Begitu gudang
 *     memverifikasi, berat final sudah ditimbang ulang dan menimpanya dari
 *     sini berarti menghapus hasil verifikasi;
 *   - mengembalikan lalu memotong ulang saldo kasbon dalam satu transaksi
 *     basis data, supaya mengubah nominal kasbon (atau lapaknya) tidak
 *     meninggalkan saldo yang selisih.
 *
 * Setiap perubahan tercatat di audit trail beserta data sebelum dan
 * sesudahnya, sehingga Manager dapat menelusuri siapa mengubah apa.
 */
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const warehouseId = session.user.warehouseId
    if (!warehouseId) {
      return NextResponse.json({ error: "User is not assigned to a warehouse" }, { status: 403 })
    }

    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }
    if (existing.userIdStaff !== session.user.id || existing.warehouseId !== warehouseId) {
      return NextResponse.json({ error: "Nota ini bukan buatan Anda." }, { status: 403 })
    }
    if (existing.status_approval !== "menunggu_verifikasi") {
      return NextResponse.json(
        { error: "Nota sudah diverifikasi gudang dan tidak dapat diedit lagi. Hubungi Admin atau Manager." },
        { status: 400 }
      )
    }

    const body = await req.json()
    const {
      supplierId,
      metode_pembayaran_terpilih,
      jenis_pengambilan,
      dp_yang_digunakan,
      items,
      potongan_sampah, berat_potongan_sampah, harga_potongan_sampah,
      potongan_susut, berat_potongan_susut, harga_potongan_susut,
      potongan_air, berat_potongan_air, harga_potongan_air,
      potongan_karung, berat_potongan_karung, harga_potongan_karung,
    } = body

    if (!supplierId || !metode_pembayaran_terpilih || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (jenis_pengambilan !== "AMBIL" && jenis_pengambilan !== "KIRIM") {
      return NextResponse.json(
        { error: "Jenis pengambilan wajib dipilih (AMBIL atau KIRIM)." },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, warehouseId: true },
    })
    if (!supplier) {
      return NextResponse.json({ error: "Lapak tidak ditemukan." }, { status: 404 })
    }
    if (supplier.warehouseId !== warehouseId) {
      return NextResponse.json({ error: "Lapak ini bukan milik gudang Anda." }, { status: 403 })
    }

    const validatedItems = (items as EditItemInput[]).map((item, index) => {
      if (!item.sku_name || typeof item.sku_name !== "string") {
        throw new Error(`SKU item ${index + 1} wajib diisi.`)
      }
      const beratEstimasi = positiveNumber(item.berat_estimasi, `Berat estimasi item ${index + 1}`)
      const hargaPerKg = positiveNumber(item.harga_per_kg, `Harga/kg item ${index + 1}`)
      return {
        sku_name: item.sku_name,
        spec: item.spec || null,
        beratEstimasi,
        hargaPerKg,
        subtotal: beratEstimasi * hargaPerKg,
      }
    })

    const potonganSampah = nonNegativeNumber(potongan_sampah, "Potongan sampah")
    const potonganSusut = nonNegativeNumber(potongan_susut, "Potongan susut")
    const potonganAir = nonNegativeNumber(potongan_air, "Potongan air")
    const potonganKarung = nonNegativeNumber(potongan_karung, "Potongan karung")
    const dpBaru = nonNegativeNumber(dp_yang_digunakan, "DP yang digunakan")

    const totalKotor = validatedItems.reduce((s, i) => s + i.subtotal, 0)
    const totalPotongan = potonganSampah + potonganSusut + potonganAir + potonganKarung
    if (dpBaru > totalKotor - totalPotongan) {
      return NextResponse.json(
        { error: "DP yang digunakan tidak boleh melebihi nilai nota setelah potongan." },
        { status: 400 }
      )
    }

    const dpLama = existing.dp_yang_digunakan ?? 0
    const totalBerat = validatedItems.reduce((s, i) => s + i.beratEstimasi, 0)

    const updated = await prisma.$transaction(async (tx) => {
      // Kembalikan dulu seluruh DP lama ke lapak lamanya, baru potong DP
      // baru dari lapak yang sekarang. Dua langkah ini membuat perubahan
      // nominal maupun pergantian lapak selalu berakhir dengan saldo yang
      // benar, tanpa menghitung selisih satu per satu.
      if (dpLama > 0) await refundDp(tx, existing.supplierId, dpLama)
      if (dpBaru > 0) await allocateDp(tx, supplierId, dpBaru)

      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } })

      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          supplierId,
          metode_pembayaran_terpilih,
          jenis_pengambilan,
          berat_timbangan_lapak: totalBerat,
          potongan_sampah: potonganSampah,
          berat_potongan_sampah: nonNegativeNumber(berat_potongan_sampah, "Berat potongan sampah"),
          harga_potongan_sampah: nonNegativeNumber(harga_potongan_sampah, "Harga potongan sampah"),
          potongan_susut: potonganSusut,
          berat_potongan_susut: nonNegativeNumber(berat_potongan_susut, "Berat potongan susut"),
          harga_potongan_susut: nonNegativeNumber(harga_potongan_susut, "Harga potongan susut"),
          potongan_air: potonganAir,
          berat_potongan_air: nonNegativeNumber(berat_potongan_air, "Berat potongan air"),
          harga_potongan_air: nonNegativeNumber(harga_potongan_air, "Harga potongan air"),
          potongan_karung: potonganKarung,
          berat_potongan_karung: nonNegativeNumber(berat_potongan_karung, "Berat potongan karung"),
          harga_potongan_karung: nonNegativeNumber(harga_potongan_karung, "Harga potongan karung"),
          dp_yang_digunakan: dpBaru,
          items: {
            create: validatedItems.map((item) => ({
              sku_name: item.sku_name,
              spec: item.spec,
              berat_lapak: item.beratEstimasi,
              berat_final_item: item.beratEstimasi,
              harga_per_kg: item.hargaPerKg,
              subtotal: item.subtotal,
            })),
          },
        },
        include: { items: true },
      })

      // Di dalam transaksi yang sama: perubahan yang gagal dicatat tidak
      // boleh lolos tanpa jejak.
      await createAuditLogTx(tx, {
        userId: session.user.id,
        action: "EDIT_PURCHASE",
        table_name: "Purchase",
        record_id: id,
        old_data: existing,
        new_data: purchase,
      })

      return purchase
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof InsufficientDpError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const message = getErrorMessage(error)
    console.error("Staff Edit Purchase Error:", error)
    const salahInput = message.includes("harus") || message.includes("wajib") || message.includes("tidak boleh")
    return NextResponse.json({ error: message }, { status: salahInput ? 400 : 500 })
  }
}
