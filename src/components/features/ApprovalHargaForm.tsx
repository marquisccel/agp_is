"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ApprovalHargaForm({ purchase }: { purchase: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleAction = async (action: "approve" | "reject") => {
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
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const selisihTotal =
    (purchase.berat_timbangan_gudang || 0) - (purchase.berat_timbangan_lapak || 0)

  return (
    <div className="premium-workflow space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
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
            <tbody className="divide-y divide-slate-100">
              {purchase.items.map((item: any) => {
                const standard = purchase.warehouse.skuPrices.find((s: any) => s.sku_name === item.sku_name)
                const maxPrice = standard ? standard.max_price_per_kg : 0
                const isOver = item.harga_per_kg > maxPrice
                const lapakW = item.berat_lapak ?? item.berat_final_item ?? 0
                const gudangW = item.berat_final_item ?? 0
                const diff = gudangW - lapakW

                return (
                  <tr
                    key={item.id}
                    className={isOver ? "bg-orange-50/30 hover:bg-orange-50/50 transition-colors" : "bg-white hover:bg-slate-50/50 transition-colors"}
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800 text-sm">{item.sku_name}</div>
                      {item.spec && (
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${item.spec === "Grading" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {item.spec}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-mono text-sm">{lapakW.toFixed(2)}</td>
                    <td className="px-3 py-3 text-slate-700 font-mono font-bold text-sm">{gudangW.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      {diff === 0 ? (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">Sama</span>
                      ) : (
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${diff < 0 ? "text-rose-600 bg-rose-50" : "text-cyan-600 bg-cyan-50"}`}>
                          {diff < 0 ? diff.toFixed(2) : `+${diff.toFixed(2)}`}
                          {lapakW > 0 ? ` (${((diff / lapakW) * 100).toFixed(1)}%)` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold text-sm ${isOver ? "text-orange-600" : "text-slate-700"}`}>
                        Rp {item.harga_per_kg.toLocaleString("id-ID")}
                      </span>
                      {isOver && (
                        <span className="ml-1 text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">OVER</span>
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
          {purchase.items.map((item: any) => {
            const standard = purchase.warehouse.skuPrices.find((s: any) => s.sku_name === item.sku_name)
            const maxPrice = standard ? standard.max_price_per_kg : 0
            const isOver = item.harga_per_kg > maxPrice
            const lapakW = item.berat_lapak ?? item.berat_final_item ?? 0
            const gudangW = item.berat_final_item ?? 0
            const diff = gudangW - lapakW

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 space-y-3 ${isOver ? "border-orange-200 bg-orange-50/30" : "border-slate-200 bg-white"}`}
              >
                {/* SKU Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{item.sku_name}</div>
                    {item.spec && (
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${item.spec === "Grading" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {item.spec}
                      </span>
                    )}
                  </div>
                  {isOver && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">OVER LIMIT</span>
                  )}
                </div>

                {/* Timbangan comparison */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-medium mb-1">Lapak</div>
                    <div className="text-sm font-bold text-slate-700 font-mono">{lapakW.toFixed(2)}<span className="text-[9px] font-normal ml-0.5">kg</span></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-medium mb-1">Gudang</div>
                    <div className="text-sm font-bold text-slate-800 font-mono">{gudangW.toFixed(2)}<span className="text-[9px] font-normal ml-0.5">kg</span></div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-medium mb-1">Selisih</div>
                    {diff === 0 ? (
                      <div className="text-xs text-emerald-600 font-bold">Sama</div>
                    ) : (
                      <div className={`text-xs font-bold font-mono ${diff < 0 ? "text-rose-600" : "text-cyan-600"}`}>
                        {diff < 0 ? diff.toFixed(2) : `+${diff.toFixed(2)}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Harga info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                    <div className="text-[10px] text-slate-400 font-medium">Harga Beli / kg</div>
                    <div className={`text-sm font-bold mt-0.5 ${isOver ? "text-orange-600" : "text-slate-800"}`}>
                      Rp {item.harga_per_kg.toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                    <div className="text-[10px] text-slate-400 font-medium">Maks Standar / kg</div>
                    <div className="text-sm font-medium mt-0.5 text-slate-600">
                      Rp {maxPrice.toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Subtotal Item</span>
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
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20"/><path d="M5 5h14"/><path d="M3 21h18"/>
          </svg>
          Perbandingan Timbangan Total (Lapak vs Gudang)
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
            <div className="text-[10px] text-slate-400 font-medium leading-tight">Lapak (Staff)</div>
            <div className="text-base font-bold text-slate-800 mt-1 font-mono">
              {(purchase.berat_timbangan_lapak || 0).toFixed(2)}
              <span className="text-[10px] font-normal ml-0.5">KG</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
            <div className="text-[10px] text-slate-400 font-medium leading-tight">Gudang (Admin)</div>
            <div className="text-base font-bold text-slate-800 mt-1 font-mono">
              {(purchase.berat_timbangan_gudang || 0).toFixed(2)}
              <span className="text-[10px] font-normal ml-0.5">KG</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
            <div className="text-[10px] text-slate-400 font-medium leading-tight">Selisih / Susut</div>
            <div className={`text-base font-bold mt-1 font-mono ${selisihTotal === 0 ? "text-emerald-600" : selisihTotal < 0 ? "text-rose-600" : "text-cyan-600"}`}>
              {selisihTotal > 0 ? `+${selisihTotal.toFixed(2)}` : selisihTotal.toFixed(2)}
              <span className="text-[10px] font-normal ml-0.5">KG</span>
            </div>
            {purchase.berat_timbangan_lapak > 0 && (
              <div className={`text-[10px] font-semibold mt-0.5 ${selisihTotal === 0 ? "text-emerald-500" : selisihTotal < 0 ? "text-rose-500" : "text-cyan-500"}`}>
                ({((selisihTotal / purchase.berat_timbangan_lapak) * 100).toFixed(1)}%)
              </div>
            )}
          </div>
        </div>
        <div className={`text-xs py-2.5 px-4 rounded-xl border font-semibold text-center ${selisihTotal === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : selisihTotal < 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-cyan-50 text-cyan-700 border-cyan-100"}`}>
          {selisihTotal === 0
            ? "Hasil timbangan staff (lapak) dan admin (gudang) sesuai sempurna."
            : selisihTotal < 0
              ? `Peringatan: penyusutan timbangan gudang ${Math.abs(selisihTotal).toFixed(2)} KG (${purchase.berat_timbangan_lapak > 0 ? Math.abs((selisihTotal / purchase.berat_timbangan_lapak) * 100).toFixed(1) : "0"}%) vs lapak staff.`
              : `ℹ Timbangan gudang bertambah: +${selisihTotal.toFixed(2)} KG (+${purchase.berat_timbangan_lapak > 0 ? ((selisihTotal / purchase.berat_timbangan_lapak) * 100).toFixed(1) : "0"}%) vs lapak staff.`}
        </div>
      </div>

      {/* Total + Action Buttons */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium">Total Dibayar (Setelah Retur &amp; DP)</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">
            Rp {(purchase.total_dibayar || 0).toLocaleString("id-ID")}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleAction("reject")}
            disabled={loading}
            className="flex-1 px-5 py-3 rounded-xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
          >
            Tolak (Dibatalkan)
          </button>
          <button
            onClick={() => handleAction("approve")}
            disabled={loading}
            className="flex-1 px-5 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-70"
          >
            {loading ? "Memproses..." : "Setujui Harga"}
          </button>
        </div>
      </div>
    </div>
  )
}
