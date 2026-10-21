import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLogTx } from "@/lib/audit"
import { allocateDp, refundDp, InsufficientDpError } from "@/lib/dpAllocation"
import { bacaRincian, rincianCocok } from "@/lib/rincianTimbangan"
import { MAKS_HARI_MUNDUR_STAFF, periksaTanggalPembelian, tanggalWib } from "@/lib/tanggalPembelian"
import { getErrorMessage } from "@/lib/errors"
import { nonNegativeNumber, positiveNumber, percentageNumber } from "@/lib/numberValidation"
import {
  calculatePurchaseTotals,
  hasPriceAboveStandard,
  resolveWeightForPricing,
  PurchaseCalculationError,
} from "@/lib/purchaseCalculation"

const ALLOWED_ROLES = ["ADMIN", "MANAGER"]

/**
 * Staff boleh membetulkan nota BUATANNYA SENDIRI selama belum ditransfer
 * (draft, menunggu approval harga, atau disetujui) -- arahan Manager
 * 10 Okt 2026, dengan pengawasan lewat audit trail. Batasannya diterapkan di
 * PUT di bawah: lapak, nomor nota, potongan, dan berat timbangan gudang tidak
 * dapat diubah Staff. Kasbon yang sudah terpotong pada nota juga tidak
 * disentuh, jadi saldo lapak tidak perlu disesuaikan.
 */
const STATUS_EDITABLE_STAFF = ["menunggu_verifikasi", "menunggu_approval_harga", "approved"]

type EditablePurchaseItemInput = {
  sku_name: string
  spec?: string | null
  berat_lapak?: number | string | null
  berat_final_item?: number | string | null
  harga_per_kg?: number | string | null
  subtotal?: number | string | null
  rincian_timbangan?: unknown
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

    // Admin memeriksa-silang SEMUA gudang sejak arahan Manager 30 Sep 2026
    // (lihat lib/roles.ts), jadi tidak ada lagi pengecekan warehouseId di
    // sini -- sama seperti Manager.

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
    const sebagaiStaff = role === "STAFF"
    if (!role || !(ALLOWED_ROLES.includes(role) || sebagaiStaff)) {
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
      tanggal_pembelian,
      dp_yang_digunakan,
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
        items: true,
        returs: true,
        warehouse: { include: { skuPrices: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    // Admin memeriksa-silang SEMUA gudang sejak arahan Manager 30 Sep 2026
    // (lihat lib/roles.ts), sama seperti Manager -- tidak ada lagi
    // pengecekan warehouseId di sini. Staff sebaliknya dikurung ke notanya
    // sendiri di gudangnya.
    if (sebagaiStaff) {
      if (
        existing.userIdStaff !== session!.user.id ||
        existing.warehouseId !== session!.user.warehouseId
      ) {
        return NextResponse.json({ error: "Nota ini bukan buatan Anda." }, { status: 403 })
      }
      if (!STATUS_EDITABLE_STAFF.includes(existing.status_approval)) {
        return NextResponse.json(
          { error: "Nota ini tidak dapat diedit Staff pada statusnya sekarang." },
          { status: 400 }
        )
      }
    }
    // Nota yang sudah ditransfer hanya dapat direvisi Manager (arahan Manager
    // 21 Okt 2026): salah input pada nota yang diinput Admin ditemukan setelah
    // transfer, dan koreksinya tidak boleh menunggu. Admin dan Staff tetap
    // ditolak. Revisi itu dicatat dengan nama aksi sendiri di audit trail,
    // supaya mudah ditelusuri dan dibedakan dari edit biasa.
    const revisiSetelahTransfer = existing.status_approval === "sudah_transfer"
    if (revisiSetelahTransfer && role !== "MANAGER") {
      return NextResponse.json(
        { error: "Nota yang sudah ditransfer hanya dapat direvisi oleh Manager." },
        { status: 400 }
      )
    }

    // Tanggal pembelian: hanya diubah bila memang berbeda dari yang tersimpan,
    // supaya menyimpan ulang tidak menggeser jam nota yang sudah ada.
    let tanggalBaru: Date | undefined
    if (tanggal_pembelian !== undefined && tanggal_pembelian !== null && tanggal_pembelian !== tanggalWib(existing.tanggal)) {
      const hasil = periksaTanggalPembelian(tanggal_pembelian, {
        maksHariMundur: sebagaiStaff ? MAKS_HARI_MUNDUR_STAFF : null,
      })
      if (!hasil.ok) {
        return NextResponse.json({ error: hasil.error }, { status: 400 })
      }
      tanggalBaru = hasil.tanggal
    }

    // Bagi Staff, lapak, nomor nota, dan semua potongan dikunci ke nilai
    // tersimpan -- bukan sekadar disembunyikan di layar, karena isian badan
    // permintaan bisa dikirim langsung ke alamat ini.
    const p = sebagaiStaff
      ? {
          supplierId: undefined as string | undefined,
          nomor_nota: undefined as string | null | undefined,
          potongan_sampah: existing.potongan_sampah, berat_potongan_sampah: existing.berat_potongan_sampah, harga_potongan_sampah: existing.harga_potongan_sampah,
          potongan_susut: existing.potongan_susut, berat_potongan_susut: existing.berat_potongan_susut, harga_potongan_susut: existing.harga_potongan_susut,
          potongan_air: existing.potongan_air, berat_potongan_air: existing.berat_potongan_air, harga_potongan_air: existing.harga_potongan_air,
          potongan_karung: existing.potongan_karung, berat_potongan_karung: existing.berat_potongan_karung, harga_potongan_karung: existing.harga_potongan_karung,
        }
      : {
          supplierId, nomor_nota,
          potongan_sampah, berat_potongan_sampah, harga_potongan_sampah,
          potongan_susut, berat_potongan_susut, harga_potongan_susut,
          potongan_air, berat_potongan_air, harga_potongan_air,
          potongan_karung, berat_potongan_karung, harga_potongan_karung,
        }

    // Recompute totals from items
    const purchaseItems = items as EditablePurchaseItemInput[]
    if (!Array.isArray(purchaseItems) || purchaseItems.length === 0) {
      return NextResponse.json({ error: "Minimal harus ada 1 item transaksi." }, { status: 400 })
    }

    // Metode timbangan menentukan berat mana yang dipakai sebagai dasar harga,
    // sama seperti pada verifikasi gudang.
    const metodeTerpilih = metode_pembayaran_terpilih || existing.metode_pembayaran_terpilih

    // Pada nota yang masih draft, gudang belum menimbang: berat final sama
    // dengan berat lapak yang diketik Staff, jadi keduanya dijaga searah di
    // sini dan bukan diserahkan ke layar.
    const draftStaff = sebagaiStaff && existing.status_approval === "menunggu_verifikasi"

    const validatedItems = purchaseItems.map((item, index) => {
      if (!item.sku_name || typeof item.sku_name !== "string") {
        throw new Error(`SKU item ${index + 1} wajib diisi.`)
      }

      const beratLapakInput = item.berat_lapak === null || item.berat_lapak === undefined || item.berat_lapak === ""
        ? null
        : positiveNumber(item.berat_lapak, `Berat lapak item ${index + 1}`)
      const beratFinal = draftStaff && beratLapakInput !== null
        ? beratLapakInput
        : positiveNumber(item.berat_final_item, `Berat final item ${index + 1}`)
      const beratLapak = beratLapakInput ?? beratFinal
      const hargaPerKg = positiveNumber(item.harga_per_kg, `Harga/kg item ${index + 1}`)
      const weightToUse = resolveWeightForPricing(metodeTerpilih, beratLapak, beratFinal)

      // Rincian timbangan gudang dibawa terus selama masih cocok dengan berat
      // final. Item dibuat ulang tiap kali nota disimpan, jadi tanpa ini
      // rincian hilang pada edit pertama. Bila beratnya diubah sehingga tidak
      // lagi cocok, rincian dibuang: angka yang tidak berjumlah ke berat
      // final lebih menyesatkan daripada tidak ada rincian.
      const rincian = bacaRincian(item.rincian_timbangan)
      const rincianTersimpan = rincian && rincianCocok(rincian, beratFinal) ? rincian : undefined

      return {
        sku_name: item.sku_name,
        spec: item.spec || null,
        berat_lapak: beratLapak,
        berat_final_item: beratFinal,
        harga_per_kg: hargaPerKg,
        subtotal: weightToUse * hargaPerKg,
        rincian_timbangan: rincianTersimpan,
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

    const totalPotSampah  = toNumber(p.potongan_sampah, "Potongan sampah")
    const totalPotSusut   = toNumber(p.potongan_susut, "Potongan susut")
    const totalPotAir     = toNumber(p.potongan_air, "Potongan air")
    const totalPotKarung  = toNumber(p.potongan_karung, "Potongan karung")

    // Kasbon yang dipakai boleh dibetulkan (salah ketik). Bila tidak dikirim,
    // nilai tersimpan dipertahankan. Perubahannya menyesuaikan saldo kasbon
    // lapak di dalam transaksi basis data yang sama dengan penyimpanan nota.
    const dpLama = existing.dp_yang_digunakan ?? 0
    const dpBaru = dp_yang_digunakan === undefined || dp_yang_digunakan === null
      ? dpLama
      : toNumber(dp_yang_digunakan, "DP yang digunakan")

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
      dpDigunakan: dpBaru,
      persentasePembayaran: persentase,
    })

    // Kasbon yang BERUBAH tidak boleh melebihi nilai nota setelah potongan.
    // Nilai lama yang sudah tersimpan dibiarkan agar menyimpan ulang nota
    // lama tidak mendadak ditolak.
    if (dpBaru !== dpLama && totals.dpDikembalikan > 0) {
      throw new PurchaseCalculationError("DP yang digunakan tidak boleh melebihi nilai nota setelah potongan.")
    }

    // Transaksi yang terminnya sudah dilunasi tidak boleh dikembalikan menjadi
    // belum lunas hanya karena disimpan ulang. Pelunasan dapat terjadi pada
    // status approved, sehingga transaksi seperti ini masih dapat diedit.
    const sudahLunas = existing.status_pelunasan === "LUNAS" && persentase < 100

    // Pemeriksaan ulang harga terhadap standar SKU (D-4). Tanpa ini, harga di
    // atas standar dapat dimasukkan pasca-approval tanpa kembali ke antrean
    // persetujuan Manager.
    const standards = existing.warehouse?.skuPrices ?? []
    // Yang diperiksa hanya baris yang harganya BARU (SKU atau harga berbeda
    // dari yang tersimpan). Memeriksa semua baris membuat nota yang harganya
    // sudah disetujui Manager ikut ditarik kembali ke antrean dan kehilangan
    // nomor notanya hanya karena Staff membetulkan salah ketik di kolom lain.
    const itemBerubahHarga = validatedItems.filter(
      (baru) => !existing.items.some((lama) => lama.sku_name === baru.sku_name && lama.harga_per_kg === baru.harga_per_kg)
    )
    const priceAboveStandard = hasPriceAboveStandard(itemBerubahHarga, standards)
    const shouldReturnToApproval =
      priceAboveStandard && existing.status_approval === "approved"

    const supplierTujuan = p.supplierId ?? existing.supplierId

    const updatedPurchase = await prisma.$transaction(async (tx) => {
      // Kembalikan DP lama ke lapak lamanya lalu potong DP baru dari lapak
      // yang berlaku sekarang. Dua langkah ini membuat perubahan nominal
      // maupun pergantian lapak selalu berakhir dengan saldo yang benar,
      // tanpa menghitung selisih satu per satu.
      if (dpBaru !== dpLama || supplierTujuan !== existing.supplierId) {
        if (dpLama > 0) await refundDp(tx, existing.supplierId, dpLama)
        if (dpBaru > 0) await allocateDp(tx, supplierTujuan, dpBaru)
      }

      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } })

      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          ...(p.supplierId ? { supplierId: p.supplierId } : {}),
          ...(p.nomor_nota !== undefined ? { nomor_nota: p.nomor_nota } : {}),
          ...(metode_pembayaran_terpilih ? { metode_pembayaran_terpilih } : {}),
          dp_yang_digunakan: dpBaru,
          ...(tanggalBaru ? { tanggal: tanggalBaru } : {}),
          berat_timbangan_lapak: draftStaff
            ? validatedItems.reduce((sum, i) => sum + i.berat_lapak, 0)
            : berat_timbangan_lapak != null ? toNumber(berat_timbangan_lapak, "Berat timbangan lapak") : existing.berat_timbangan_lapak,
          berat_timbangan_gudang: !sebagaiStaff && berat_timbangan_gudang != null
            ? toNumber(berat_timbangan_gudang, "Berat timbangan gudang")
            : existing.berat_timbangan_gudang,
          potongan_sampah:  totalPotSampah,
          berat_potongan_sampah: toNumber(p.berat_potongan_sampah, "Berat potongan sampah"),
          harga_potongan_sampah: toNumber(p.harga_potongan_sampah, "Harga potongan sampah"),
          potongan_susut:   totalPotSusut,
          berat_potongan_susut:  toNumber(p.berat_potongan_susut, "Berat potongan susut"),
          harga_potongan_susut:  toNumber(p.harga_potongan_susut, "Harga potongan susut"),
          potongan_air:     totalPotAir,
          berat_potongan_air:    toNumber(p.berat_potongan_air, "Berat potongan air"),
          harga_potongan_air:    toNumber(p.harga_potongan_air, "Harga potongan air"),
          potongan_karung:  totalPotKarung,
          berat_potongan_karung: toNumber(p.berat_potongan_karung, "Berat potongan karung"),
          harga_potongan_karung: toNumber(p.harga_potongan_karung, "Harga potongan karung"),
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

      // Di dalam transaksi yang sama: perubahan yang gagal dicatat tidak
      // boleh lolos tanpa jejak.
      await createAuditLogTx(tx, {
        userId: session.user.id,
        action: revisiSetelahTransfer ? "EDIT_PURCHASE_SETELAH_TRANSFER" : "EDIT_PURCHASE",
        table_name: "Purchase",
        record_id: id,
        old_data: existing,
        new_data: purchase,
      })

      return purchase
    })

    return NextResponse.json({ message: "Transaksi berhasil diperbarui", purchase: updatedPurchase })
  } catch (error) {
    const message = getErrorMessage(error)
    if (error instanceof PurchaseCalculationError || error instanceof InsufficientDpError) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error("Edit Purchase Error:", error)
    return NextResponse.json(
      { error: "Gagal mengedit transaksi: " + message },
      { status: message.includes("harus") || message.includes("wajib") || message.includes("tidak boleh") ? 400 : 500 }
    )
  }
}
