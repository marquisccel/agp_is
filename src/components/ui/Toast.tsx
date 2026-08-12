"use client"

import { useCallback, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, Info, XCircle } from "lucide-react"

type ToastType = "success" | "error" | "info"
type ToastState = { message: string; type: ToastType } | null

const TONE: Record<ToastType, { icon: typeof CheckCircle2; cls: string }> = {
  success: { icon: CheckCircle2, cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  error: { icon: XCircle, cls: "bg-red-50 border-red-200 text-red-700" },
  info: { icon: Info, cls: "bg-slate-50 border-slate-200 text-slate-700" },
}

/**
 * Pengganti window.alert() bawaan browser (bagian dari UI/UX Premium Pass,
 * Fase 8) -- notifikasi sementara di pojok layar, tidak memblokir interaksi
 * dan tidak hilang begitu saja saat halaman di-refresh penuh (karena itu
 * juga jangan panggil window.location.reload() setelah toast(); pakai
 * router.refresh() supaya toast sempat terlihat).
 *
 * Dipakai lewat `const { toast, host } = useToast()`, render `{host}` sekali
 * di JSX komponen, lalu `toast("Berhasil dihapus.")` / `toast(msg, "error")`.
 */
export function useToast() {
  const [state, setState] = useState<ToastState>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((message: string, type: ToastType = "success") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setState({ message, type })
    timeoutRef.current = setTimeout(() => setState(null), 4000)
  }, [])

  const dismiss = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setState(null)
  }

  const host = state && typeof document !== "undefined" ? createPortal(
    (() => {
      const { icon: Icon, cls } = TONE[state.type]
      return (
        <div className="fixed bottom-6 right-6 z-[300] w-full max-w-sm px-4 sm:px-0">
          <div
            role="status"
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl animate-in slide-in-from-bottom-2 duration-300 ${cls}`}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm font-semibold leading-snug">{state.message}</p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Tutup notifikasi"
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )
    })(),
    document.body
  ) : null

  return { toast, host }
}
