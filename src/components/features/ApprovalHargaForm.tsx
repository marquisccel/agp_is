"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Purchase, PurchaseItem, SkuPriceStandard, Warehouse } from "@prisma/client"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { pesanError } from "@/lib/pesanError"

type PurchaseForApproval = Purchase & {
  items: PurchaseItem[]
  warehouse: Warehouse & { skuPrices: SkuPriceStandard[] }
}

export default function ApprovalHargaForm({ purchase }: { purchase: PurchaseForApproval }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { confirm, dialog } = useConfirm()

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject") {
      const ok = await confirm({
        title: "Tolak harga transaksi ini?",
        description: "Transaksi akan dibatalkan secara permanen dan tidak bisa diproses ulang.",
        tone: "danger",
        confirmLabel: "Ya, tolak",
      })
      if (!ok) return
    }
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/purchases/${purchase.id}/approve-harga`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal memproses approval")
      }

      router.push("/dashboard/manager/approval-harga")
      router.refresh()
    } catch (err) {
      setError(pesanError(err))
      setLoading(false)
    }
  }

  const beratTimbanganLapak = purchase.berat_timbangan_lapak || 0
  const selisihTotal =
    (purchase.berat_timbangan_gudang || 0) - beratTimbanganLapak

  return (
    <div className="premium-workflow space-y-6">
      {dialog}
      {error && (
        <div className="notice tone-warning text-sm font-medium">
          {error}
        </div>
      )}

      {/* SKU Items, card layout (mobile-first) */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3">
          Rincian Item &amp; Komparasi Timbangan per SKU
        </h3>

        {/* Desktop table, hidden on small screens */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 font-semibold text-slate-600 text-xs whitespace-nowrap">SKU / Spec</th>
                <th className="px-3 py-3 font-semibold text-slate-600 text-xs whitespace-nowrap">Lapak (kg)</th>
                <th className="px-3 py-3 font-semibold text-slate-600 text-xs whitespace-nowrap">Gudang (kg)</th>
                <th className="px-3 py-3 font-semibold text-slate-600 text-xs whitespace-nowrap">Selisih</th>
                <th className="px-3 py-3 font-semibold text-slate-600 text-xs whitespace-nowrap">Harga/kg</th>
                <th className="px-3 py-3 font-semibold text-slate-500 text-xs whitespace-nowrap">Maks/kg</th>
                <th className="px-3 py-3 font-semibold text-slate-700 text-xs text-right whitespace-nowrap">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => {
                const standard = purchase.warehouse.skuPrices.find((s) => s.sku_name === item.sku_name)
                const maxPrice = standard ? standard.max_price_per_kg : 0
                const isOver = item.harga_per_kg > maxPrice
                const lapakW = item.berat_lapak ?? item.berat_final_item ?? 0
                const gudangW = item.berat_final_item ?? 0
                const diff = gudangW - lapakW

                return (
                  <tr
                    key={item.id}
                    style={isOver ? { background: "var(--warning-soft)" } : undefined}
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800 text-sm">{item.sku_name}</div>
                      {item.spec && (
                        <span className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>
                          {item.spec}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-mono text-sm">{lapakW.toFixed(2)}</td>
                    <td className="px-3 py-3 text-slate-700 font-mono font-bold text-sm">{gudangW.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      {diff === 0 ? (
                        <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>Sama</span>
                      ) : (
                        <span
                          className="rounded px-2 py-0.5 font-mono text-xs font-bold"
                          style={diff < 0 ? { color: "var(--danger)", background: "var(--danger-soft)" } : { color: "var(--warning)", background: "var(--warning-soft)" }}
                        >
                          {diff < 0 ? diff.toFixed(2) : `+${diff.toFixed(2)}`}
                          {lapakW > 0 ? ` (${((diff / lapakW) * 100).toFixed(1)}%)` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm font-semibold" style={{ color: isOver ? "var(--warning)" : "var(--foreground)" }}>
                        Rp {item.harga_per_kg.toLocaleString("id-ID")}
                      </span>
                      {isOver && (
                        <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>Di atas standar</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500 font-mono text-sm">Rp {maxPrice.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-3 text-slate-800 font-bold text-right font-mono text-sm">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout, shown only on small screens */}
        <div className="md:hidden space-y-3">
          {purchase.items.map((item) => {
            const standard = purchase.warehouse.skuPrices.find((s) => s.sku_name === item.sku_name)
            const maxPrice = standard ? standard.max_price_per_kg : 0
            const isOver = item.harga_per_kg > maxPrice
            const lapakW = item.berat_lapak ?? item.berat_final_item ?? 0
            const gudangW = item.berat_final_item ?? 0
            const diff = gudangW - lapakW

            return (
              <div
                key={item.id}
                className="space-y-3 rounded-[var(--radius-lg)] border p-4"
                style={isOver ? { borderColor: "var(--warning-soft)", background: "var(--warning-soft)" } : { borderColor: "var(--border)", background: "var(--surface)" }}
              >
                {/* SKU Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{item.sku_name}</div>
                    {item.spec && (
                      <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>
                        {item.spec}
                      </span>
                    )}
                  </div>
                  {isOver && (
                    <span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>Di atas standar</span>
                  )}
                </div>

                {/* Perbandingan timbangan: tiga lajur sama lebar dalam satu
                    pita, dipisah garis tipis. Selisihnya berupa lencana
                    berwarna (merah untuk susut, kuning untuk lebih) supaya
                    arahnya terbaca sebelum angkanya dibaca. Satuan kg ada
                    di label, bukan diulang di tiap angka. */}
                <div className="grid grid-cols-3 divide-x overflow-hidden rounded-[var(--radius-md)] border bg-slate-50" style={{ borderColor: "var(--border)" }}>
                  <div className="px-2 py-2.5 text-center" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Lapak (kg)</div>
                    <div className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-700">{lapakW.toFixed(2)}</div>
                  </div>
                  <div className="px-2 py-2.5 text-center" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Gudang (kg)</div>
                    <div className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-900">{gudangW.toFixed(2)}</div>
                  </div>
                  <div className="flex flex-col items-center px-2 py-2.5 text-center" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Selisih</div>
                    {diff === 0 ? (
                      <span className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>Sama</span>
                    ) : (
                      <span
                        className="mt-1 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums"
                        style={diff < 0 ? { background: "var(--danger-soft)", color: "var(--danger)" } : { background: "var(--warning-soft)", color: "var(--warning)" }}
                      >
                        {diff < 0 ? diff.toFixed(2) : `+${diff.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Harga: baris label-nilai, bukan dua kotak bertepi di dalam
                    kartu yang sudah bertepi. */}
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Harga beli / kg</dt>
                    <dd className="font-mono font-bold tabular-nums" style={{ color: isOver ? "var(--warning)" : "var(--foreground)" }}>
                      Rp {item.harga_per_kg.toLocaleString("id-ID")}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Maks standar / kg</dt>
                    <dd className="font-mono tabular-nums text-slate-600">Rp {maxPrice.toLocaleString("id-ID")}</dd>
                  </div>
                </dl>

                {/* Subtotal */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-xs font-semibold text-slate-500">Subtotal item</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    Rp {item.subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scale Comparison Summary */}
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-slate-200/60 bg-slate-50 p-4 sm:p-5">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20"/><path d="M5 5h14"/><path d="M3 21h18"/>
          </svg>
          Perbandingan Timbangan Total (Lapak vs Gudang)
        </h4>
        {/* Tiga lajur dalam satu pita bertepi, dipisah garis tipis.
            Tiga kotak berbayang di dalam kartu abu membuat angkanya
            berdesakan di layar 360px: tiap kotak cuma 90px, dan angka
            beserta satuannya patah. Satuan kini di label. */}
        <div className="grid grid-cols-3 divide-x overflow-hidden rounded-[var(--radius-md)] border bg-white" style={{ borderColor: "var(--border)" }}>
          <div className="px-2 py-3 text-center" style={{ borderColor: "var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400">Lapak (kg)</div>
            <div className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-800 sm:text-base">
              {(purchase.berat_timbangan_lapak || 0).toFixed(2)}
            </div>
          </div>
          <div className="px-2 py-3 text-center" style={{ borderColor: "var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400">Gudang (kg)</div>
            <div className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-800 sm:text-base">
              {(purchase.berat_timbangan_gudang || 0).toFixed(2)}
            </div>
          </div>
          <div className="flex flex-col items-center px-2 py-3 text-center" style={{ borderColor: "var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400">Selisih (kg)</div>
            <span
              className="mt-1 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-xs font-bold tabular-nums sm:text-sm"
              style={selisihTotal === 0
                ? { background: "var(--bg-tint)", color: "var(--muted)" }
                : selisihTotal < 0
                  ? { background: "var(--danger-soft)", color: "var(--danger)" }
                  : { background: "var(--warning-soft)", color: "var(--warning)" }}
            >
              {selisihTotal > 0 ? `+${selisihTotal.toFixed(2)}` : selisihTotal.toFixed(2)}
            </span>
            {beratTimbanganLapak > 0 && (
              <div className="mt-1 text-[10px] font-semibold tabular-nums" style={{ color: selisihTotal === 0 ? "var(--muted-faint)" : selisihTotal < 0 ? "var(--danger)" : "var(--warning)" }}>
                {((selisihTotal / beratTimbanganLapak) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
        <div
          className="rounded-[var(--radius-sm)] px-4 py-2.5 text-center text-xs font-semibold"
          style={selisihTotal === 0
            ? { background: "var(--bg-tint)", color: "var(--muted)" }
            : selisihTotal < 0
              ? { background: "var(--danger-soft)", color: "var(--danger)" }
              : { background: "var(--warning-soft)", color: "var(--warning)" }}
        >
          {selisihTotal === 0
            ? "Hasil timbangan staff (lapak) dan admin (gudang) sesuai sempurna."
            : selisihTotal < 0
              ? `Peringatan: penyusutan timbangan gudang ${Math.abs(selisihTotal).toFixed(2)} KG (${beratTimbanganLapak > 0 ? Math.abs((selisihTotal / beratTimbanganLapak) * 100).toFixed(1) : "0"}%) vs lapak staff.`
              : `Timbangan gudang bertambah: +${selisihTotal.toFixed(2)} KG (+${beratTimbanganLapak > 0 ? ((selisihTotal / beratTimbanganLapak) * 100).toFixed(1) : "0"}%) vs lapak staff.`}
        </div>
      </div>

      {/* Total + Action Buttons */}
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <div className="text-xs text-slate-500 font-medium">Total Dibayar (Setelah Retur &amp; DP)</div>
          <div className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-slate-800">
            Rp {(purchase.total_dibayar || 0).toLocaleString("id-ID")}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleAction("reject")}
            disabled={loading}
            className="btn-netral tone-danger premium-button min-h-11 flex-1 px-5 py-3 text-sm disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Tolak (Dibatalkan)"}
          </button>
          <button
            onClick={() => handleAction("approve")}
            disabled={loading}
            className="min-h-11 flex-1 rounded-[var(--radius-md)] px-5 py-3 text-sm font-bold text-white transition-colors disabled:opacity-70"
            style={{ background: "var(--success)" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#128a3e" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--success)" }}
          >
            {loading ? "Memproses..." : "Setujui Harga"}
          </button>
        </div>
      </div>
    </div>
  )
}
