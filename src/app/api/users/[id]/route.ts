import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"

/**
 * Penghapusan dan penonaktifan akun. Keduanya hanya untuk Manager.
 *
 * Kenapa ada DUA cara, bukan satu tombol hapus:
 *
 * Akun di sistem ini bukan sekadar baris login. Ia tertaut ke pembelian
 * yang diinput Staff, verifikasi yang dikerjakan Admin, approval yang
 * ditandatangani Manager, dan seluruh jejak audit. Menghapus akun yang
 * sudah punya jejak berarti menghapus rekaman siapa menyetujui apa --
 * persis hal yang paling dibutuhkan saat ada selisih uang yang harus
 * ditelusuri.
 *
 * Maka:
 *
 *   DELETE  hanya untuk akun yang BELUM PERNAH dipakai sama sekali.
 *           Contohnya akun yang emailnya salah ketik, atau akun contoh
 *           bawaan yang tidak jadi terpakai. Server memeriksa sendiri,
 *           tidak mengandalkan tampilan.
 *
 *   PATCH   untuk akun yang sudah punya jejak. Orangnya berhenti bekerja,
 *           aksesnya dicabut, tapi riwayatnya tetap utuh. Bisa diaktifkan
 *           lagi kalau yang bersangkutan kembali.
 *
 * Pemeriksaan relasi mengikuti pola yang sudah dipakai DELETE lapak di
 * src/app/api/manager/suppliers/[id]/route.ts.
 */

/** Semua relasi User di schema. Kalau salah satunya terisi, akun berjejak. */
async function hitungJejak(userId: string) {
  const [pembelianStaff, pembelianAdmin, approvalManager, approvalDp, target, audit] =
    await Promise.all([
      prisma.purchase.count({ where: { userIdStaff: userId } }),
      prisma.purchase.count({ where: { userIdAdmin: userId } }),
      prisma.purchase.count({ where: { approvedByUserId: userId } }),
      prisma.downPayment.count({ where: { approvedByUserId: userId } }),
      prisma.warehouseTarget.count({ where: { updatedByUserId: userId } }),
      prisma.auditLog.count({ where: { userId } }),
    ])

  const rincian: string[] = []
  const transaksi = pembelianStaff + pembelianAdmin + approvalManager
  if (transaksi > 0) rincian.push(`${transaksi} transaksi`)
  if (approvalDp > 0) rincian.push(`${approvalDp} approval kasbon`)
  if (target > 0) rincian.push(`${target} penetapan target`)
  if (audit > 0) rincian.push(`${audit} catatan audit`)

  return { total: transaksi + approvalDp + target + audit, rincian }
}

/** Cegah sistem kehilangan seluruh Manager yang masih bisa masuk. */
async function akanMenghabiskanManager(user: { id: string; role: string }) {
  if (user.role !== "MANAGER") return false
  const sisa = await prisma.user.count({
    where: { role: "MANAGER", aktif: true, id: { not: user.id } },
  })
  return sisa === 0
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus akun yang sedang dipakai untuk masuk." },
        { status: 400 },
      )
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 })
    }

    const jejak = await hitungJejak(id)
    if (jejak.total > 0) {
      return NextResponse.json(
        {
          error:
            `Akun ini sudah punya ${jejak.rincian.join(", ")} dan tidak bisa dihapus. ` +
            "Menghapusnya akan memutus rekaman siapa yang mengerjakan apa. " +
            "Nonaktifkan saja: aksesnya dicabut, riwayatnya tetap utuh.",
          sarankanNonaktif: true,
        },
        { status: 400 },
      )
    }

    if (await akanMenghabiskanManager(target)) {
      return NextResponse.json(
        { error: "Ini satu-satunya Manager aktif. Buat Manager lain dulu sebelum menghapusnya." },
        { status: 400 },
      )
    }

    // Cuplikan sebelum dihapus, supaya akun yang hilang masih bisa
    // direkonstruksi dari audit log. Field dipilih satu per satu dan
    // `password` sengaja ditinggalkan: hash-nya tidak berguna untuk
    // rekonstruksi, tapi akan ikut terbawa ke mana pun audit log diekspor.
    const cuplikan = {
      id: target.id,
      nama: target.nama,
      email: target.email,
      role: target.role,
      aktif: target.aktif,
      warehouseId: target.warehouseId,
      createdAt: target.createdAt,
    }

    await prisma.user.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE_USER",
      table_name: "User",
      record_id: id,
      old_data: cuplikan,
      new_data: null,
    })

    return NextResponse.json({ message: `Akun ${target.nama} berhasil dihapus.` })
  } catch (error) {
    console.error("Delete User Error:", error)
    return NextResponse.json({ error: "Gagal menghapus akun. Terjadi kesalahan pada server." }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { aktif } = await req.json()
    if (typeof aktif !== "boolean") {
      return NextResponse.json({ error: "Nilai aktif harus true atau false." }, { status: 400 })
    }

    if (id === session.user.id && !aktif) {
      return NextResponse.json(
        { error: "Tidak bisa menonaktifkan akun yang sedang dipakai untuk masuk." },
        { status: 400 },
      )
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 })
    }
    if (target.aktif === aktif) {
      return NextResponse.json({ error: "Status akun sudah seperti itu." }, { status: 400 })
    }

    if (!aktif && (await akanMenghabiskanManager(target))) {
      return NextResponse.json(
        { error: "Ini satu-satunya Manager aktif. Buat Manager lain dulu sebelum menonaktifkannya." },
        { status: 400 },
      )
    }

    const sesudah = await prisma.user.update({
      where: { id },
      data: { aktif },
      select: { id: true, nama: true, email: true, role: true, aktif: true },
    })

    await createAuditLog({
      userId: session.user.id,
      action: aktif ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      table_name: "User",
      record_id: id,
      old_data: { aktif: target.aktif },
      new_data: { aktif },
    })

    return NextResponse.json({
      message: aktif
        ? `Akun ${sesudah.nama} diaktifkan kembali.`
        : `Akun ${sesudah.nama} dinonaktifkan. Riwayatnya tetap tersimpan.`,
      user: sesudah,
    })
  } catch (error) {
    console.error("Patch User Error:", error)
    return NextResponse.json({ error: "Gagal mengubah status akun. Terjadi kesalahan pada server." }, { status: 500 })
  }
}
