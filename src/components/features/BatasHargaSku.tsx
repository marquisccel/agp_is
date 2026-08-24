import { fmtRp } from "@/lib/format"

export type StandarHargaSku = { sku_name: string; max_price_per_kg: number }

/**
 * Keterangan batas harga SKU di bawah kolom harga.
 *
 * Kenapa ada: batas harga per SKU ditetapkan Manager per gudang, dan
 * dipakai server untuk memutuskan apakah sebuah nota lolos langsung atau
 * dilempar ke antrean persetujuan harga. Tapi angkanya tidak pernah
 * sampai ke layar orang yang MENGETIK harganya. Staff mengisi tanpa tahu
 * batasnya, lalu notanya tertahan; Admin menyimpan verifikasi dan baru
 * tahu setelah statusnya tidak jadi "approved". Dari layar keduanya, itu
 * terbaca seperti sistem menolak tanpa sebab.
 *
 * Ini hanya menampilkan angka yang sudah ada -- tidak menghalangi
 * penyimpanan. Harga di atas batas tetap boleh dicatat, karena memang ada
 * jalurnya: nota itu naik ke Manager untuk disetujui. Yang berubah cuma
 * satu: pengisinya tahu konsekuensinya sebelum menekan simpan, bukan
 * sesudahnya.
 *
 * Dipakai di dua form (Input Pembelian dan Double Check) supaya batas dan
 * kata-katanya tidak berangsur berbeda di dua layar.
 */
export function batasHargaSku(skuName: string, standar: StandarHargaSku[]): number | null {
  if (!skuName) return null
  const cocok = standar.find((s) => s.sku_name === skuName)
  return cocok ? cocok.max_price_per_kg : null
}

export default function BatasHargaSku({
  skuName,
  harga,
  standar,
}: {
  skuName: string
  harga: number
  standar: StandarHargaSku[]
}) {
  const batas = batasHargaSku(skuName, standar)

  // SKU yang belum punya standar tidak diberi keterangan apa pun: kontrol
  // harga memang tidak aktif untuknya, dan menulis "belum ada batas" hanya
  // menambah baris yang tidak menuntun ke mana-mana.
  if (batas === null) return null

  const melebihi = harga > batas

  return (
    <p className="mt-1.5 text-[11px] font-semibold" style={{ color: melebihi ? "var(--warning)" : "var(--muted-faint)" }}>
      {melebihi
        ? `Di atas batas ${fmtRp(batas)}/kg — nota akan menunggu persetujuan Manager.`
        : `Batas harga ${fmtRp(batas)}/kg`}
    </p>
  )
}
