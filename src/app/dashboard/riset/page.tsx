import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { redirect, notFound } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import RisetKompresiClient from "@/components/features/RisetKompresiClient"
import { risetAktif } from "@/lib/riset"

/**
 * Perangkat pengukuran untuk penelitian kompresi gambar sisi klien.
 *
 * Halaman ini bukan bagian dari alur kerja perusahaan. Ia hanya muncul
 * kalau RISET_ENABLED bernilai true, dan selain itu berperilaku seperti
 * alamat yang tidak ada, bukan seperti halaman yang ditolak. Perbedaan itu
 * disengaja: halaman yang menjawab "tidak berwenang" justru memberi tahu
 * bahwa ia ada.
 */
/*
 * Tanpa penanda ini, Next menganggap halaman ini dapat dirender sekali
 * saat build. Saat build, RISET_ENABLED belum tentu terisi, sehingga yang
 * ikut tersimpan adalah hasil notFound() -- dan menyalakan variabelnya
 * belakangan tidak berpengaruh apa pun karena halaman 404 itu sudah jadi
 * berkas statis.
 */
export const dynamic = "force-dynamic"

export default async function RisetPage() {
  if (!risetAktif()) {
    notFound()
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Perangkat penelitian"
        title="Pengukuran Kompresi Gambar"
        description="Menjalankan tiga perlakuan kompresi pada berkas yang sama, mencatat ukuran hasil serta waktu kompresi dan unggah, lalu mengekspornya sebagai CSV."
      />
      <RisetKompresiClient />
    </div>
  )
}
