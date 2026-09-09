import { useSyncExternalStore } from "react"

/**
 * True selama lebar layar berada di bawah ambang ponsel.
 *
 * Sebagian besar perbedaan tampilan ponsel bisa diselesaikan CSS saja, dan
 * memang sebaiknya begitu. Hook ini hanya untuk hal yang tidak bisa: bentuk
 * yang STRUKTURNYA berbeda, misalnya form panjang yang di ponsel dipecah
 * jadi beberapa langkah sementara di layar lebar tetap satu halaman. Itu
 * perkara komponen mana yang dipasang, bukan perkara gaya.
 *
 * Nilainya false saat dirender di server dan pada gambar pertama di
 * peramban, lalu menyesuaikan diri sesudah hydration. Artinya bentuk layar
 * lebar yang dikirim lebih dulu, dan itu disengaja: bentuk itu yang utuh,
 * jadi kalaupun JavaScript-nya gagal dimuat, isinya tetap lengkap dan bisa
 * dipakai.
 */
const AMBANG = "(max-width: 767px)"

function berlangganan(padaPerubahan: () => void) {
  const mq = window.matchMedia(AMBANG)
  mq.addEventListener("change", padaPerubahan)
  return () => mq.removeEventListener("change", padaPerubahan)
}

export function useLayarPonsel(): boolean {
  return useSyncExternalStore(
    berlangganan,
    () => window.matchMedia(AMBANG).matches,
    () => false,
  )
}
