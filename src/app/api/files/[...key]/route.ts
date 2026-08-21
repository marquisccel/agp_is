import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { getFile } from "@/lib/objectStorage"

/**
 * Melayani berkas bukti (bukti transfer, nota pelunasan) HANYA untuk
 * pengguna yang sudah login.
 *
 * Sebelumnya berkas ini diletakkan di public/uploads dan dilayani Next
 * secara statis, sehingga bisa dibuka siapa pun yang memegang URL-nya --
 * tanpa sesi sama sekali. Padahal isinya struk transfer bank berikut nomor
 * rekening dan nominalnya.
 *
 * Semua role operasional boleh membaca (Staff, Admin, Manager): bukti
 * transaksi memang perlu dicek lintas peran, dan pembatasan per gudang di
 * sini akan menyulitkan Manager yang justru bertugas memantau semuanya.
 * Yang dijaga adalah "harus login", bukan "hanya pemilik transaksi".
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { key: bagian } = await params
  // Tolak upaya keluar dari prefix yang diizinkan.
  if (!bagian?.length || bagian.some(b => b === "." || b === ".." || b.includes("\\"))) {
    return NextResponse.json({ error: "Key tidak valid" }, { status: 400 })
  }

  const key = bagian.join("/")

  // Hanya dua prefix ini yang memang berisi berkas bukti. Tanpa penyaringan,
  // route ini bisa dipakai membaca objek lain di bucket yang sama.
  const PREFIX_DIIZINKAN = ["transfer-proofs/", "settlement-notes/"]
  if (!PREFIX_DIIZINKAN.some(p => key.startsWith(p))) {
    return NextResponse.json({ error: "Key tidak valid" }, { status: 400 })
  }

  const berkas = await getFile(key)
  if (!berkas) {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(berkas.body), {
    headers: {
      "Content-Type": berkas.contentType,
      // private: jangan sampai proxy/CDN bersama ikut menyimpan bukti
      // keuangan milik satu perusahaan.
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  })
}
