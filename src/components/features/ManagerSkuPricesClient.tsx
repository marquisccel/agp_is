"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface WarehouseData {
  id: string
  nama: string
  skuPrices: { id: string, sku_name: string, max_price_per_kg: number }[]
}

export default function ManagerSkuPricesClient({ warehouses, allSkus }: { warehouses: WarehouseData[], allSkus: string[] }) {
  const router = useRouter()
  
  // Format state: { warehouseId: { skuName: price } }
  const initialState: Record<string, Record<string, number>> = {}
  
  warehouses.forEach(w => {
    initialState[w.id] = {}
    allSkus.forEach(sku => {
      const existing = w.skuPrices.find(sp => sp.sku_name === sku)
      initialState[w.id][sku] = existing ? existing.max_price_per_kg : 0
    })
  })

  const [prices, setPrices] = useState(initialState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState(warehouses[0]?.id || "")

  const handleChange = (warehouseId: string, skuName: string, val: string) => {
    const num = parseFloat(val) || 0
    setPrices(prev => ({
      ...prev,
      [warehouseId]: {
        ...prev[warehouseId],
        [skuName]: num
      }
    }))
  }

  const handleSave = async (warehouseId: string) => {
    setSaving(true)
    setError("")
    setSuccess("")
    
    try {
      const payload = Object.entries(prices[warehouseId]).map(([sku_name, max_price_per_kg]) => ({
        sku_name,
        max_price_per_kg
      }))

      const res = await fetch(`/api/manager/sku-prices`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId, prices: payload })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menyimpan pengaturan")
      }

      setSuccess(`Berhasil menyimpan pengaturan harga untuk gudang terpilih.`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
      setTimeout(() => setSuccess(""), 3000)
    }
  }

  if (!warehouses.length) return <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">Belum ada data gudang.</div>

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
        {warehouses.map(w => (
          <button
            key={w.id}
            onClick={() => setActiveTab(w.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === w.id ? 'bg-white shadow-sm border border-slate-200 text-cyan-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          >
            {w.nama}
          </button>
        ))}
      </div>

      <div className="p-6">
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium text-sm">{error}</div>}
        {success && <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-medium text-sm flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{success}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allSkus.map(sku => (
            <div key={sku} className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-cyan-200 transition-colors">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sku}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm font-bold font-mono text-slate-800 focus:ring-2 focus:ring-[var(--brand)] focus:border-cyan-500 outline-none bg-white transition-all"
                  value={prices[activeTab]?.[sku] || ""}
                  onChange={e => handleChange(activeTab, sku, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
          <button
            onClick={() => handleSave(activeTab)}
            disabled={saving}
            className="premium-button flex items-center gap-2 rounded-xl bg-slate-950 px-8 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {saving ? (
              <><svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menyimpan...</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan Harga {warehouses.find(w => w.id === activeTab)?.nama}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
