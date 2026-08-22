import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { nonNegativeNumber, positiveNumber } from "@/lib/numberValidation"
import { allocateDp, InsufficientDpError } from "@/lib/dpAllocation"

type DraftPurchaseItemInput = {
  sku_name: string
  spec?: string | null
  berat_estimasi: number | string
  harga_per_kg: number | string
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    // Hanya Staff yang membuat nota. Kalau ini dibiarkan menerima semua
    // peran operasional, menghilangkan menunya dari sidebar Admin cuma
    // jadi penyamaran -- notanya tetap bisa dibuat lewat permintaan
    // langsung ke alamat ini.
    if (!session || !session.user || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      supplierId,
      metode_pembayaran_terpilih,
      jenis_pengambilan,
      dp_yang_digunakan,
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

    // Mode logistik wajib untuk transaksi baru supaya rekap efektivitas
    // armada di dashboard Manager tidak lagi berlubang. Transaksi lama tetap
    // null (lihat komentar di schema.prisma) dan tidak di-backfill.
    if (jenis_pengambilan !== "AMBIL" && jenis_pengambilan !== "KIRIM") {
      return NextResponse.json(
        { error: "Jenis pengambilan wajib dipilih (AMBIL atau KIRIM)." },
        { status: 400 }
      )
    }

    // Determine warehouseId from session user
    const warehouseId = session.user.warehouseId
    if (!warehouseId) {
      return NextResponse.json({ error: "User is not assigned to a warehouse" }, { status: 403 })
    }

    // Lapaknya wajib milik gudang si Staff. Tanpa pemeriksaan ini,
    // supplierId dari badan permintaan dipakai apa adanya sementara
    // warehouseId diambil dari sesi, sehingga:
    //   - notanya tercatat di gudang A padahal lapaknya milik gudang B,
    //     membuat rekap per gudang dan per lapak saling bertentangan;
    //   - dan yang lebih berat, saldo kasbon lapak gudang B ikut terpotong
    //     lewat allocateDp di bawah.
    // Pengajuan kasbon (/api/dp) sudah memeriksa hal ini sejak awal; jalur
    // pembuatan nota terlewat.
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

    const draftItems = items as DraftPurchaseItemInput[]
    const validatedItems = draftItems.map((item, index) => {
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
    const totalLapakWeight = validatedItems.reduce((sum, item) => sum + item.beratEstimasi, 0)
    const potonganSampah = nonNegativeNumber(potongan_sampah, "Potongan sampah")
    const beratPotonganSampah = nonNegativeNumber(berat_potongan_sampah, "Berat potongan sampah")
    const hargaPotonganSampah = nonNegativeNumber(harga_potongan_sampah, "Harga potongan sampah")
    const potonganSusut = nonNegativeNumber(potongan_susut, "Potongan susut")
    const beratPotonganSusut = nonNegativeNumber(berat_potongan_susut, "Berat potongan susut")
    const hargaPotonganSusut = nonNegativeNumber(harga_potongan_susut, "Harga potongan susut")
    const potonganAir = nonNegativeNumber(potongan_air, "Potongan air")
    const beratPotonganAir = nonNegativeNumber(berat_potongan_air, "Berat potongan air")
    const hargaPotonganAir = nonNegativeNumber(harga_potongan_air, "Harga potongan air")
    const potonganKarung = nonNegativeNumber(potongan_karung, "Potongan karung")
    const beratPotonganKarung = nonNegativeNumber(berat_potongan_karung, "Berat potongan karung")
    const hargaPotonganKarung = nonNegativeNumber(harga_potongan_karung, "Harga potongan karung")

    // Kasbon dipotong di tahap ini (keputusan meeting Manager): begitu Manager
    // menyetujui kasbon, potongannya sudah langsung tercermin di total nota
    // yang dipegang Staff -- bukan lagi baru dipotong saat verifikasi gudang.
    const dpDigunakan = nonNegativeNumber(dp_yang_digunakan, "DP yang digunakan")

    // Nilai nota estimasi jadi batas atas potongan kasbon; tanpa ini, total
    // bayar ke lapak bisa jadi negatif.
    const totalEstimasiKotor = validatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const totalPotongan = potonganSampah + potonganSusut + potonganAir + potonganKarung
    const totalEstimasiBersih = totalEstimasiKotor - totalPotongan
    if (dpDigunakan > totalEstimasiBersih) {
      return NextResponse.json(
        { error: "DP yang digunakan tidak boleh melebihi nilai nota setelah potongan." },
        { status: 400 }
      )
    }

    // Create Draft Purchase -- dibungkus transaction karena pemotongan saldo
    // kasbon dan penyimpanan nota harus terjadi bersama. Kalau salah satunya
    // gagal, saldo kasbon tidak boleh ikut berkurang.
    const purchase = await prisma.$transaction(async (tx) => {
      if (dpDigunakan > 0) {
        await allocateDp(tx, supplierId, dpDigunakan)
      }

      return tx.purchase.create({
      data: {
        warehouseId,
        supplierId,
        userIdStaff: session.user.id,
        metode_pembayaran_terpilih,
        jenis_pengambilan,
        berat_timbangan_lapak: totalLapakWeight,
        status_approval: "menunggu_verifikasi",
        potongan_sampah: potonganSampah,
        berat_potongan_sampah: beratPotonganSampah,
        harga_potongan_sampah: hargaPotonganSampah,
        potongan_susut: potonganSusut,
        berat_potongan_susut: beratPotonganSusut,
        harga_potongan_susut: hargaPotonganSusut,
        potongan_air: potonganAir,
        berat_potongan_air: beratPotonganAir,
        harga_potongan_air: hargaPotonganAir,
        potongan_karung: potonganKarung,
        berat_potongan_karung: beratPotonganKarung,
        harga_potongan_karung: hargaPotonganKarung,
        dp_yang_digunakan: dpDigunakan,
        items: {
          create: validatedItems.map((item) => ({
            sku_name: item.sku_name,
            spec: item.spec || null,
            berat_lapak: item.beratEstimasi,
            berat_final_item: item.beratEstimasi,
            harga_per_kg: item.hargaPerKg,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: true,
      },
      })
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
    // Saldo kasbon tidak cukup adalah kesalahan input pengguna, bukan
    // kegagalan server -- dibalas 400 dengan pesan yang menyebut sisa saldo.
    if (error instanceof InsufficientDpError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const message = getErrorMessage(error)
    console.error("Error creating draft purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
