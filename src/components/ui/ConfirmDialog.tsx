"use client"

import { useCallback, useRef, useState } from "react"
import BottomSheet from "@/components/ui/BottomSheet"

type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  /** "danger" dipakai untuk aksi merusak/tidak bisa dibatalkan (hapus, tolak). */
  tone?: "danger" | "default"
}

/**
 * Pengganti window.confirm() bawaan browser dengan modal konsisten gaya
 * aplikasi (bagian dari UI/UX Premium Pass, Fase 8) -- dipakai lewat
 * `const { confirm, dialog } = useConfirm()`, render `{dialog}` sekali di
 * JSX komponen, lalu `if (!(await confirm({...}))) return` di handler.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = (result: boolean) => {
    setOptions(null)
    resolverRef.current?.(result)
    resolverRef.current = null
  }

  /*
   * Bentuknya BottomSheet, bukan kotak mengambang di tengah layar.
   *
   * Konfirmasi hampir selalu muncul sebagai akibat ketukan pada tombol di
   * dalam daftar, yaitu di paruh bawah layar. Kotak di tengah memaksa jempol
   * berpindah jauh ke atas hanya untuk menjawab "ya" atau "batal", padahal
   * pertanyaannya muncul karena tangan sudah berada di bawah. BottomSheet
   * memunculkan jawabannya di tempat jempol berada, dan di layar lebar
   * komponen yang sama kembali memusat seperti dialog biasa.
   *
   * Tombolnya ditumpuk penuh selebar panel di ponsel: dua tombol kecil
   * berdampingan di ujung kanan adalah kebiasaan desktop, dan pada layar
   * sentuh keduanya jadi sasaran sempit yang berdempetan.
   */
  const dialog = (
    <BottomSheet
      terbuka={options !== null}
      onTutup={() => settle(false)}
      peran="alertdialog"
      judul={options?.title}
      deskripsi={options?.description}
    >
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={() => settle(false)}
          className="min-h-11 rounded-[10px] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          {options?.cancelLabel || "Batal"}
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => settle(true)}
          className={`min-h-11 rounded-[10px] px-4 py-2 text-sm font-bold text-white transition-colors ${
            options?.tone === "danger" ? "bg-red-600 hover:bg-red-700" : ""
          }`}
          style={options?.tone === "danger" ? undefined : { background: "var(--brand)" }}
          onMouseEnter={(e) => { if (options?.tone !== "danger") e.currentTarget.style.background = "var(--brand-strong)" }}
          onMouseLeave={(e) => { if (options?.tone !== "danger") e.currentTarget.style.background = "var(--brand)" }}
        >
          {options?.confirmLabel || "Ya, lanjutkan"}
        </button>
      </div>
    </BottomSheet>
  )

  return { confirm, dialog }
}
