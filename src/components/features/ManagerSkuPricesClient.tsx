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

  if (!warehouses.length) return <div className="section section-body text-center">Belum ada data gudang.</div>

  return (
    <div className="section overflow-hidden">
      {/* Tabs */}
      {/* Pemilih gudang memakai .segmented, sama dengan tab Master Data
          dan filter Data Lapak -- sebelumnya deretan tombol putih dengan
          teks cyan, satu-satunya pola seperti itu tersisa. */}
      <div className="border-b p-3" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}>
        <div className="segmented flex overflow-x-auto">
          {warehouses.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => setActiveTab(w.id)}
              className={activeTab === w.id ? "active" : undefined}
            >
              {w.nama}
            </button>
          ))}
        </div>
      </div>

      <div className="section-body">
        {error && <div className="notice tone-warning mb-6 text-sm font-medium">{error}</div>}
        {success && <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-md)] border p-4 text-sm font-medium" style={{ borderColor: "var(--success-soft)", background: "var(--success-soft)", color: "var(--success)" }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{success}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allSkus.map(sku => (
            <div key={sku} className="space-y-1 rounded-[var(--radius-md)] border p-4 transition-colors" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sku}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  min="0"
                  className="field-input field-icon font-mono font-bold"
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
            className="premium-button btn-primer flex items-center gap-2 px-8 py-3 font-bold disabled:opacity-70"
          >
            {saving ? (
              <><svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menyimpan...</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Simpan Harga</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
