import type { StatusTone } from "@/lib/purchaseStatusLabels"

/** Dipakai juga di luar file ini (mis. banner status full-width) supaya
 * satu tone selalu menghasilkan warna yang sama di mana pun dipakai. */
export const TONE_STYLE: Record<StatusTone, { bg: string; color: string; border: string }> = {
  success: { bg: "var(--success-soft)", color: "var(--success)", border: "color-mix(in srgb, var(--success) 30%, transparent)" },
  warning: { bg: "var(--warning-soft)", color: "var(--warning)", border: "color-mix(in srgb, var(--warning) 30%, transparent)" },
  danger: { bg: "var(--danger-soft)", color: "var(--danger)", border: "color-mix(in srgb, var(--danger) 30%, transparent)" },
  info: { bg: "var(--brand-soft)", color: "var(--brand-strong)", border: "var(--brand-soft-strong)" },
  neutral: { bg: "var(--bg-tint)", color: "var(--muted, #5B6560)", border: "var(--border)" },
}

/**
 * Badge status konsisten (Fase 8 redesign) -- menggantikan className
 * bg-*-50/text-*-700/border-*-200 yang ditulis manual & berbeda-beda per
 * file. Tone semantik terpisah dari warna aksen brand (lihat dokumen
 * arah desain), "info" saja yang sengaja pakai brand-soft karena tidak
 * ada padanan semantik netral untuk status "disetujui, tapi belum
 * selesai".
 */
export default function StatusPill({ label, tone, className = "" }: { label: string; tone: StatusTone; className?: string }) {
  const { bg, color } = TONE_STYLE[tone]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${className}`}
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}
