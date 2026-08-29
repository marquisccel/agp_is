import { useSyncExternalStore } from "react"

/**
 * Bernilai false saat dirender di server dan pada render pertama di
 * peramban, lalu true setelah hydration selesai.
 *
 * Dipakai untuk bagian yang memang tidak bisa dirender di server -- di
 * sini: pembuat PDF dan penangkap gambar nota, keduanya menyentuh API
 * peramban yang tidak ada di Node.
 *
 * Bentuk yang lazim untuk ini adalah `useState(false)` yang dinyalakan
 * dari dalam `useEffect`. Hasilnya sama, tapi caranya menyalakan state
 * dari effect, dan React 19 menandainya karena memang memicu render
 * berantai. `useSyncExternalStore` menyatakan hal yang sama secara
 * langsung: satu nilai untuk server, satu nilai untuk klien.
 *
 * Langganannya sengaja tidak melakukan apa-apa. Nilainya tidak pernah
 * berubah lagi setelah hydration, jadi tidak ada yang perlu didengarkan.
 */
const tanpaLangganan = () => () => {}

export function useSudahDiKlien(): boolean {
  return useSyncExternalStore(
    tanpaLangganan,
    () => true,
    () => false,
  )
}
