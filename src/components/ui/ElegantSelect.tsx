"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"

type SelectOption<T extends string | number> = {
  label: string
  value: T
}

type ElegantSelectProps<T extends string | number> = {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  menuClassName?: string
}

export default function ElegantSelect<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  menuClassName = "",
}: ElegantSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value) || options[0]

  const updateMenuRect = () => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuRect({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    })
  }

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

  useEffect(() => {
    if (!open) return

    updateMenuRect()
    window.addEventListener("resize", updateMenuRect)
    window.addEventListener("scroll", updateMenuRect, true)
    return () => {
      window.removeEventListener("resize", updateMenuRect)
      window.removeEventListener("scroll", updateMenuRect, true)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={`flex w-full items-center justify-between gap-2 rounded-[10px] border bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 outline-none hover:border-slate-300 ${
          open ? "border-slate-300" : "border-slate-200"
        }`}
        style={open ? { boxShadow: "0 0 0 3px var(--brand-soft)" } : undefined}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {typeof document !== "undefined" && open && menuRect && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: "fixed",
            top: menuRect.top,
            left: menuRect.left,
            minWidth: menuRect.width,
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
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
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
