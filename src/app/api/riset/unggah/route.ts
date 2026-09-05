import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { putFile } from "@/lib/objectStorage"
import { risetAktif } from "@/lib/riset"

/**
 * Penerima unggahan untuk pengukuran penelitian kompresi gambar.
 *
 * ── Kenapa endpoint tersendiri, bukan memakai endpoint bukti transfer ──
 *
 * Pengukuran menuntut ratusan kali unggah. Kalau dikirim ke endpoint
 * transaksi yang sebenarnya, setiap kiriman akan mengubah baris nota,
 * menulis jejak audit, dan menaruh berkas di penyimpanan. Sesudah satu
 * sesi pengukuran, basis datanya penuh perubahan palsu yang tidak bisa
 * dibedakan dari kejadian nyata.
 *
 * Endpoint ini sengaja TIDAK menyentuh tabel mana pun. Ia membaca seluruh
 * badan permintaan, mencatat ukurannya, lalu membuangnya. Yang diukur
 * penelitian adalah waktu berkas sampai di peladen, dan untuk itu badan
 * permintaan memang harus dibaca sampai habis, tetapi tidak perlu
 * disimpan.
 *
 * ── Kenapa dijaga dua lapis ───────────────────────────────────────────
 *
 * Endpoint yang menerima berkas tanpa batas jelas adalah sasaran empuk.
 * Karena itu ia hanya hidup kalau RISET_ENABLED bernilai true, dan tetap
 * menuntut pengguna yang sudah masuk. Di produksi, variabel itu tidak
 * diisi sehingga endpoint ini menjawab 404 seperti halaman yang memang
 * tidak ada.
 */

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!risetAktif()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mulai = performance.now()

  let form: FormData
  try {
    // Pembacaan inilah yang menghabiskan badan permintaan. Waktu yang
    // diukur klien berakhir tepat setelah byte terakhir terkirim, jadi
    // langkah ini harus tetap ada walaupun hasilnya dibuang.
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Badan permintaan tidak terbaca" }, { status: 400 })
  }

  const berkas = form.get("berkas")
  if (!(berkas instanceof File)) {
    return NextResponse.json({ error: "Berkas tidak ada" }, { status: 400 })
  }

  const buf = Buffer.from(await berkas.arrayBuffer())
  let kunci: string | null = null

  // Penyimpanan bersifat pilihan dan bawaannya mati. Satu sesi pengukuran
  // penuh bisa menghasilkan ratusan berkas, dan kuota penyimpanan gratis
  // habis jauh sebelum pengukurannya selesai.
  if (form.get("simpan") === "1") {
    const nama = String(form.get("nama") || "tanpa-nama").replace(/[^\w.-]+/g, "_")
    kunci = `riset/${Date.now()}-${nama}`
    await putFile(kunci, buf, berkas.type || "application/octet-stream")
  }

  const msServer = performance.now() - mulai

  return NextResponse.json(
    {
      ukuranByte: buf.byteLength,
      msServer: Number(msServer.toFixed(2)),
      kunci,
    },
    {
      headers: {
        // Dibaca klien untuk mengurangi waktu proses peladen dari waktu
        // pulang pergi, sehingga yang tersisa mendekati waktu jaringan.
        "Server-Timing": `proses;dur=${msServer.toFixed(2)}`,
      },
    },
  )
}
