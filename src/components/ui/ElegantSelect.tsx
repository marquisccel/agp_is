"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

type SelectOption<T extends string | number> = {
  label: string
  value: T
  /** Label lebih pendek untuk tombol pemicu saat pilihan ini terpilih,
   *  mis. tanpa hitungan. Menu tetap memakai label lengkap. */
  labelPemicu?: string
}

type ElegantSelectProps<T extends string | number> = {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  menuClassName?: string
  /** Kelas tambahan untuk tombol pemicunya, mis. "field-icon" saat ada
   *  ikon di sebelah kiri kolom. */
  triggerClassName?: string
  /** Kolom dimatikan (mis. nota terkunci); menu tidak bisa dibuka. */
  disabled?: boolean
}

export default function ElegantSelect<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  menuClassName = "",
  triggerClassName = "",
  disabled = false,
}: ElegantSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value) || options[0]

  /*
   * Posisi menu mengikuti pemicunya tiap bingkai selama menu terbuka.
   *
   * Menunya dirender lewat portal ke body, bukan diposisikan absolute di
   * dalam pemicu: sebagian besar pemilih duduk di dalam .section yang
   * ber-overflow hidden, dan menu absolute akan terpotong tepi kartu.
   * Akibatnya posisinya harus dihitung sendiri.
   *
   * Dulu dihitung ulang dari event scroll dan resize. Di Safari iPhone
   * keduanya tidak cukup: selama gulir momentum event scroll datang
   * jarang-jarang, dan menutupnya papan ketik (mis. setelah mengetik di
   * kolom cari lalu mengetuk pemilih ini) menggeser tata letak tanpa event
   * resize di window. Menunya tertinggal di posisi lama dan tampak melayang
   * lepas dari pemicunya. Membaca posisi pemicu tiap requestAnimationFrame
   * menangkap semua penyebab itu sekaligus; loopnya hanya hidup selama
   * menu terbuka, dan gayanya ditulis langsung ke elemen tanpa render
   * ulang React.
   *
   * Aturan penempatannya:
   * - di bawah pemicu, berjarak 6px; kalau ruang di bawah tidak cukup dan
   *   ruang di atas lebih lega, menu dibuka ke atas;
   * - menu boleh lebih lebar dari pemicunya; kalau menembus tepi kanan
   *   layar, ia disejajarkan ke tepi kanan pemicu.
   */
  useLayoutEffect(() => {
    if (!open) return
    let bingkai = 0
    const ikuti = () => {
      const root = rootRef.current
      const menu = menuRef.current
      if (root && menu) {
        const r = root.getBoundingClientRect()
        const tinggiLayar = window.innerHeight
        const lebarLayar = window.innerWidth
        const lebarMenu = menu.offsetWidth
        const tinggiMenu = menu.offsetHeight
        const ruangBawah = tinggiLayar - r.bottom - 8
        const keAtas = ruangBawah < tinggiMenu + 6 && r.top > ruangBawah
        const top = keAtas ? Math.max(8, r.top - 6 - tinggiMenu) : r.bottom + 6
        const left =
          r.left + lebarMenu > lebarLayar - 8
            ? Math.max(8, Math.min(r.right, lebarLayar - 8) - lebarMenu)
            : r.left
        menu.style.top = `${Math.round(top)}px`
        menu.style.left = `${Math.round(left)}px`
        menu.style.minWidth = `${Math.round(r.width)}px`
        menu.style.transformOrigin = keAtas ? "bottom" : "top"
      }
      bingkai = requestAnimationFrame(ikuti)
    }
    ikuti()
    return () => cancelAnimationFrame(bingkai)
  }, [open])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])


  return (
    // min-w-0 dipasang di akar, bukan di tiap pemakaian. Label terpilih
    // dibungkus .truncate, dan white-space: nowrap di dalamnya membuat lebar
    // min-content kolom ini sama dengan panjang teks penuhnya -- "Semua Bulan"
    // saja sudah 149px. Sebagai anak flex atau grid, kolom yang tidak boleh
    // menyusut di bawah min-content itu memaksa induknya melebar: dua pemilih
    // berdampingan menuntut 358px di layar yang cuma 375px, dan barisnya
    // menembus tepi kartu. min-w-0 mengizinkan penyusutan, dan .truncate yang
    // menangani sisanya dengan elipsis.
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        /* Bentuknya sengaja mengikuti .field-input persis: dulu pemicu ini
           menulis warnanya sendiri (bg-white + border-slate-200), sehingga
           di satu baris form kolom teks tampak abu bertepi lembut sementara
           kolom pilihan tampak putih -- dua kolom bersebelahan terbaca
           seperti berasal dari dua komponen berbeda. */
        className={`field-input pemicu-pilih flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${triggerClassName}`}
        // Keadaan terbuka ditandai atribut, bukan gaya sebaris. Dengan gaya
        // sebaris, tampilannya terkunci satu bentuk untuk semua lebar layar
        // dan tidak bisa mengikuti cincin fokus ponsel di globals.css --
        // pemilih yang sedang terbuka tampak lain sendiri dibanding kolom teks
        // yang sedang disentuh tepat di sebelahnya. Safari juga tidak memberi
        // fokus pada tombol yang diketuk, jadi :focus saja tidak cukup.
        data-terbuka={open ? "" : undefined}
      >
        <span className="truncate">{selected?.labelPemicu ?? selected?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--muted-faint)" }}
        />
      </button>

      {typeof document !== "undefined" && open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          // top/left/minWidth tidak ditulis di sini: ditulis tiap bingkai oleh
          // useLayoutEffect di atas, sebelum bingkai pertama tergambar.
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            maxWidth: "calc(100vw - 16px)",
            boxShadow: "var(--shadow-hover)",
          }}
          className={`elegant-select-menu z-[120] max-h-72 overflow-y-auto rounded-[10px] border border-slate-200 bg-white p-1 ${menuClassName}`}
        >
          {options.map(option => {
            const active = option.value === value

            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 sm:min-h-0"
                style={active ? { background: "var(--brand-soft)", color: "var(--brand-strong)", fontWeight: 700 } : undefined}
              >
                <span className="truncate">{option.label}</span>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
