import { TrendingDown, TrendingUp } from "lucide-react"

/**
 * Panah arah tren (naik/turun) sebagai SVG.
 *
 * Dulu ditulis sebagai karakter "↗" dan "↘". Kedua karakter itu di luar
 * subset latin font Geist yang dimuat, jadi peramban harus mencari font
 * cadangan; Safari di iPhone tidak menemukannya untuk huruf monospace dan
 * menggambar kotak bertanda tanya di samping angka persentase. SVG tidak
 * bergantung pada font apa pun. Warnanya mengikuti teks induk (.trend.up,
 * .trend.down), jadi arti warnanya tetap ditentukan pemakainya.
 */
export default function PanahTren({ naik }: { naik: boolean }) {
  const Ikon = naik ? TrendingUp : TrendingDown
  return <Ikon className="inline-block h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
}
