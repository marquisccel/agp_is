import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"
import { hitungKoreksiKekurangan, SettlementError } from "@/lib/settlement"

/**
 * Membuka kembali nota yang terlanjur ditandai lunas.
 *
 * Kenapa ini ada: sekali sebuah nota berstatus LUNAS, tidak ada lagi
 * tempat mencatat bahwa pembayarannya ternyata kurang. Admin yang memilih
 * skema bayar penuh lalu mentransfer kurang dari semestinya tidak punya
 * jalan memperbaikinya -- selisihnya hilang dari sistem, dan lapak
 * menagih sesuatu yang menurut sistem sudah beres.
 *
 * Kenapa hanya Manager: ini membalik catatan keuangan yang sudah ditutup,
 * bukan langkah alur normal. Jalur pembayaran hariannya tetap di tangan
 * Admin lewat /settle; yang membuka kembali catatan tertutup adalah
 * pemegang keputusan keuangan. Alasannya wajib dan tercatat di audit log.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Hanya Manager yang dapat membuka kembali nota yang sudah lunas." }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } })
    if (!purchase) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    if (purchase.status_approval !== "sudah_transfer") {
      return NextResponse.json(
        { error: "Nota ini belum ditransfer, jadi kekurangannya sudah terlihat tanpa koreksi." },
        { status: 400 },
      )
    }

    if (purchase.status_pelunasan !== "LUNAS") {
      return NextResponse.json(
        { error: "Nota ini masih punya sisa yang tercatat. Gunakan pencatatan pembayaran biasa." },
        { status: 400 },
      )
    }

    const body = await req.json()
    const alasan = typeof body?.alasan === "string" ? body.alasan.trim() : ""
    if (alasan.length < 10) {
      return NextResponse.json(
        { error: "Alasan koreksi wajib diisi, minimal 10 karakter." },
        { status: 400 },
      )
    }

    /*
     * Kewajiban ke lapak dihitung dengan rumus yang sama persis dengan
     * pemeriksa keutuhan data (scripts/audit-data.mjs). Kalau di sini
     * dipakai rumus lain, koreksinya bisa menghasilkan baris yang langsung
     * dilaporkan melanggar oleh auditnya sendiri.
     */
    const nilaiNota =
      (purchase.total_nilai_setelah_retur ?? 0) -
      ((purchase.potongan_sampah ?? 0) +
        (purchase.potongan_susut ?? 0) +
        (purchase.potongan_air ?? 0) +
        (purchase.potongan_karung ?? 0))
    const kewajiban = nilaiNota - (purchase.dp_yang_digunakan ?? 0)

    let hasil
    try {
      hasil = hitungKoreksiKekurangan({ kewajiban, kurang: Number(body?.kurang) })
    } catch (e) {
      if (e instanceof SettlementError) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
      throw e
    }

    const updated = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status_pelunasan: "BELUM_LUNAS",
        nominal_belum_lunas: hasil.kurang,
        nominal_pembayaran_awal: hasil.sudahDibayar,
        total_dibayar: hasil.sudahDibayar,
        persentase_pembayaran: hasil.persentasePembayaran,
        // Bukti pelunasan lama tidak lagi berlaku: notanya belum lunas.
        // Buktinya sendiri tetap tersimpan di audit log lewat old_data.
        bukti_pelunasan: null,
        tanggal_pelunasan: null,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: "REOPEN_PELUNASAN",
      table_name: "Purchase",
      record_id: purchaseId,
      old_data: { ...purchase, alasan_koreksi: alasan },
      new_data: updated,
    })

    return NextResponse.json({
      success: true,
      kurang: hasil.kurang,
      sudahDibayar: hasil.sudahDibayar,
      purchase: updated,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error reopening purchase:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
