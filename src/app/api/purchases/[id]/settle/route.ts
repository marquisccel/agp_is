import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { isOperationalRole } from "@/lib/roles"
import { periksaUkuranUnggahan } from "@/lib/batasUnggah"
import { fileUrl, putFile } from "@/lib/objectStorage"
import { hitungPelunasan, SettlementError } from "@/lib/settlement"

const ALLOWED_PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (!isOperationalRole(session.user.role) && session.user.role !== "MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    })

    if (!purchase) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    if (isOperationalRole(session.user.role) && purchase.warehouseId !== session.user.warehouseId) {
      return NextResponse.json({ error: "Tidak memiliki akses ke transaksi ini" }, { status: 403 })
    }

    if (purchase.status_pelunasan === "LUNAS") {
      return NextResponse.json({ error: "Transaksi ini sudah lunas." }, { status: 400 })
    }

    const sisaSekarang = purchase.nominal_belum_lunas ?? 0
    if (sisaSekarang <= 0) {
      return NextResponse.json({ error: "Transaksi ini tidak memiliki sisa yang perlu dibayar." }, { status: 400 })
    }

    // Nota pelunasan wajib (hasil meeting Manager): pelunasan tanpa bukti
    // membuat sisa termin bisa ditutup tanpa jejak apa pun.
    const formData = await req.formData()
    const file = formData.get("nota") as File | null

    /*
     * Pembayaran boleh dicicil.
     *
     * Sebelumnya endpoint ini selalu menutup SELURUH sisa sekali jalan:
     * berapa pun yang benar-benar ditransfer, notanya langsung jadi LUNAS.
     * Padahal sisa setelah potongan kasbon sering dibayar bertahap, dan
     * begitu ditandai lunas tidak ada lagi tempat mencatat kekurangannya --
     * selisihnya hilang dari sistem.
     *
     * Tanpa `nominal`, perilakunya tetap seperti dulu (melunasi semuanya),
     * supaya pemanggil lama tidak berubah artinya. Aritmetikanya ada di
     * src/lib/settlement.ts supaya bisa diuji tanpa basis data.
     */
    const nominalMentah = formData.get("nominal")
    const nominalDiminta =
      typeof nominalMentah === "string" && nominalMentah.trim() !== ""
        ? Number(nominalMentah.replace(",", "."))
        : null

    let hasil
    try {
      hasil = hitungPelunasan({
        sisaSekarang,
        sudahDibayarSebelumnya: purchase.nominal_pembayaran_awal ?? 0,
        nominal: nominalDiminta,
      })
    } catch (e) {
      if (e instanceof SettlementError) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
      throw e
    }

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Nota pelunasan wajib diunggah." }, { status: 400 })
    }

    const galatUkuran = periksaUkuranUnggahan(file.size, "nota pelunasan")
    if (galatUkuran) {
      return NextResponse.json({ error: galatUkuran }, { status: 400 })
    }

    const extension = ALLOWED_PROOF_TYPES[file.type]
    if (!extension) {
      return NextResponse.json({ error: "Format nota pelunasan harus JPG, PNG, WEBP, atau PDF." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `settlement-notes/${purchaseId}-${Date.now()}.${extension}`
    await putFile(key, buffer, file.type)
    const notaUrl = fileUrl(key)

    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status_pelunasan: hasil.statusPelunasan,
        nominal_belum_lunas: hasil.sisa,
        nominal_pembayaran_awal: hasil.sudahDibayar,
        // Ikut diperbarui: layar lain membaca kolom ini sebagai "yang sudah
        // dibayar ke lapak". Tanpa ini, nota yang sudah dilunasi bertahap
        // tetap menampilkan angka cicilan pertama saja, sehingga pengeluaran
        // yang tercatat lebih kecil dari yang benar-benar keluar.
        total_dibayar: hasil.sudahDibayar,
        persentase_pembayaran: hasil.persentasePembayaran,
        bukti_pelunasan: notaUrl,
        tanggal_pelunasan: new Date(),
      }
    })

    // Log the audit event
    await createAuditLog({
      userId: session.user.id,
      action: hasil.lunas ? "SETTLE_TERMIN" : "SETTLE_TERMIN_PARTIAL",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: purchase,
      new_data: updatedPurchase,
    })

    return NextResponse.json({
      success: true,
      lunas: hasil.lunas,
      dibayar: hasil.dibayar,
      sisa: hasil.sisa,
      purchase: updatedPurchase,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error settling purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
