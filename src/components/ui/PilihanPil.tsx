"use client"

type Opsi<T extends string | number> = {
  value: T
  label: string
  /** Angka kecil di sebelah label, mis. jumlah lapak aktif. */
  jumlah?: number
}

/**
 * Deret pilihan berbentuk pil yang bisa digeser mendatar.
 *
 * Dipakai untuk penyaring yang pilihannya sedikit dan sering diganti --
 * status, gudang, mode urutan. Deret .segmented yang sebelumnya dipakai
 * berupa satu wadah abu dengan lebar tetap: begitu pilihannya lebih dari
 * dua, pilihan terakhir terpotong di tepi kanan layar ponsel tanpa tanda
 * bahwa masih ada lanjutannya. Pil yang bisa digeser menampakkan separuh
 * pil berikutnya, dan tiap pil punya batasnya sendiri.
 *
 * Sasaran sentuhnya 44px walaupun pilnya tampak 36px: selisihnya diisi
 * ::before tak terlihat di globals.css, supaya deretnya tetap ramping.
 */
export default function PilihanPil<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: T
  options: Opsi<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`pil-gulir ${className}`}>
      {options.map((o) => {
        const aktif = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={aktif}
            onClick={() => onChange(o.value)}
            className="pil"
          >
            {o.label}
            {o.jumlah !== undefined && <span className="pil-jumlah">{o.jumlah}</span>}
          </button>
        )
      })}
    </div>
  )
}
