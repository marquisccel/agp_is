import { bacaRincian, totalRincian } from "@/lib/rincianTimbangan"

const fmtKg = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 })

/**
 * Rincian putaran timbang gudang sebuah SKU, untuk Manager menelusuri dari
 * mana berat final berasal. Dilipat secara bawaan supaya tabel item tetap
 * ringkas; tidak menampilkan apa pun bila nota tidak punya rincian (nota
 * lama atau tidak ditimbang per putaran).
 */
export default function RincianTimbanganList({ nilai }: { nilai: unknown }) {
  const rincian = bacaRincian(nilai)
  if (!rincian) return null
  const total = totalRincian(rincian)

  return (
    <details className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
      <summary className="cursor-pointer select-none font-semibold" style={{ color: "var(--brand-strong)" }}>
        Rincian timbangan ({rincian.length} putaran &middot; {total.karung.toLocaleString("id-ID")} karung)
      </summary>
      <ul className="mt-1.5 space-y-0.5 font-mono tabular-nums">
        {rincian.map((b, i) => (
          <li key={i} className="flex justify-between gap-4">
            <span>Timbangan {i + 1}</span>
            <span>
              {fmtKg(b.kg)} KG &middot; {b.karung.toLocaleString("id-ID")} karung
            </span>
          </li>
        ))}
        <li
          className="flex justify-between gap-4 border-t pt-0.5 font-bold"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <span>Total</span>
          <span>
            {fmtKg(total.kg)} KG &middot; {total.karung.toLocaleString("id-ID")} karung
          </span>
        </li>
      </ul>
    </details>
  )
}
