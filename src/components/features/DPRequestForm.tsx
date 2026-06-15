"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ElegantSelect from "@/components/ui/ElegantSelect"

export default function DPRequestForm({ suppliers, role = "ADMIN" }: { suppliers: any[], role?: string }) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState("")
  const [nominal, setNominal] = useState("")
  const [keterangan, setKeterangan] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supplierOptions = [
    { value: "", label: "Pilih supplier" },
    ...suppliers.map(s => ({ value: s.id as string, label: `${s.nama} - Target ${s.target_bulanan_kg} kg` })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || !nominal) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/dp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          nominal_diajukan: parseFloat(nominal),
          keterangan
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal mengajukan DP")
      }

      router.push(role === "MANAGER" ? "/dashboard/manager/dp" : "/dashboard/staff/dp")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>}

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Supplier</label>
        <ElegantSelect
          value={supplierId}
          options={supplierOptions}
          onChange={setSupplierId}
          ariaLabel="Pilih supplier"
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Nominal Kasbon (Rp)</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 font-semibold">
            Rp
          </div>
          <input
            type="number"
            required
            min="10000"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            className="w-full border-slate-200 rounded-xl pl-12 pr-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
            placeholder="Contoh: 1500000"
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">Catatan: Pengajuan di atas Rp 2.000.000 memerlukan persetujuan Manager.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Keterangan untuk Manager (Opsional)</label>
        <textarea
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          placeholder="Tulis alasan pengajuan kasbon agar memudahkan Manager menyetujui..."
          rows={3}
        />
      </div>

      <div className="pt-4 flex justify-end gap-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="premium-button rounded-xl bg-slate-950 px-8 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Memproses..." : "Ajukan Kasbon"}
        </button>
      </div>
    </form>
  )
}
