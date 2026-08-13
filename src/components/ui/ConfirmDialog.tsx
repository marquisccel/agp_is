"use client"

import { useCallback, useRef, useState } from "react"
import { createPortal } from "react-dom"

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

  const dialog = options && typeof document !== "undefined" ? createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={() => settle(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-[18px] bg-white p-6 animate-in scale-in duration-200"
        style={{ boxShadow: "var(--shadow-hover)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900">{options.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{options.description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => settle(false)}
            className="rounded-[10px] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {options.cancelLabel || "Batal"}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => settle(true)}
            className={`rounded-[10px] px-4 py-2 text-sm font-bold text-white transition-colors ${
              options.tone === "danger" ? "bg-red-600 hover:bg-red-700" : ""
            }`}
            style={options.tone === "danger" ? undefined : { background: "var(--brand)" }}
            onMouseEnter={(e) => { if (options.tone !== "danger") e.currentTarget.style.background = "var(--brand-strong)" }}
            onMouseLeave={(e) => { if (options.tone !== "danger") e.currentTarget.style.background = "var(--brand)" }}
          >
            {options.confirmLabel || "Ya, lanjutkan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return { confirm, dialog }
}
