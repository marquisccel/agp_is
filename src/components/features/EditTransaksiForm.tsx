"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ElegantSelect from "@/components/ui/ElegantSelect"

interface PurchaseItem {
  id?: string
  sku_name: string
  spec: string | null
  berat_lapak: number | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

interface Purchase {
  id: string
  nomor_nota: string | null
  supplierId: string
  supplier: { id: string; nama: string }
  metode_pembayaran_terpilih: string | null
  berat_timbangan_lapak: number | null
  berat_timbangan_gudang: number | null
  status_approval: string
  potongan_sampah: number | null
  berat_potongan_sampah: number | null
  harga_potongan_sampah: number | null
  potongan_susut: number | null
  berat_potongan_susut: number | null
  harga_potongan_susut: number | null
  potongan_air: number | null
  berat_potongan_air: number | null
  harga_potongan_air: number | null
  potongan_karung: number | null
  berat_potongan_karung: number | null
  harga_potongan_karung: number | null
  items: PurchaseItem[]
}

interface Supplier {
  id: string
  nama: string
}

const SKU_OPTIONS = ["PET Clear", "PET Biru", "PET Hijau", "PET Kuning", "PET Mix", "HDPE", "PP", "Galon"]
const SPEC_OPTIONS = ["Gabyuk", "Grading"]
const METODE_OPTIONS = [
  { value: "TIMBANGAN_GUDANG", label: "Timbangan Gudang" },
  { value: "TIMBANGAN_LAPAK", label: "Timbangan Lapak" },
]
const SPEC_SELECT_OPTIONS = [
  { value: "", label: "Pilih spec" },
  ...SPEC_OPTIONS.map(spec => ({ value: spec, label: spec })),
]
const STATUS_LABELS: Record<string, string> = {
  menunggu_verifikasi: "Menunggu Verifikasi",
  menunggu_approval_harga: "Menunggu Approval Harga",
  approved: "Disetujui",
  sudah_transfer: "Sudah Transfer",
  rejected: "Ditolak",
  dibatalkan: "Dibatalkan",
}

function fmtRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

export default function EditTransaksiForm({
  purchase: initialPurchase,
  suppliers,
  backUrl = "/dashboard/admin/history",
}: {
  purchase: Purchase
  suppliers: Supplier[]
  backUrl?: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.nama }))

  // Basic fields
  const [nomor_nota, setNomorNota] = useState(initialPurchase.nomor_nota || "")
  const [supplierId, setSupplierId] = useState(initialPurchase.supplierId)
  const [metode, setMetode] = useState(initialPurchase.metode_pembayaran_terpilih || "TIMBANGAN_GUDANG")
  const [beratLapak, setBeratLapak] = useState(initialPurchase.berat_timbangan_lapak?.toString() || "")
  const [beratGudang, setBeratGudang] = useState(initialPurchase.berat_timbangan_gudang?.toString() || "")

  // Potongan
  const [potSampah, setPotSampah]   = useState(initialPurchase.potongan_sampah?.toString() || "0")
  const [potSusut, setPotSusut]     = useState(initialPurchase.potongan_susut?.toString() || "0")
  const [potAir, setPotAir]         = useState(initialPurchase.potongan_air?.toString() || "0")
  const [potKarung, setPotKarung]   = useState(initialPurchase.potongan_karung?.toString() || "0")

  const [beratPotSampah, setBeratPotSampah]   = useState(initialPurchase.berat_potongan_sampah?.toString() || "0")
  const [beratPotSusut, setBeratPotSusut]     = useState(initialPurchase.berat_potongan_susut?.toString() || "0")
  const [beratPotAir, setBeratPotAir]         = useState(initialPurchase.berat_potongan_air?.toString() || "0")
  const [beratPotKarung, setBeratPotKarung]   = useState(initialPurchase.berat_potongan_karung?.toString() || "0")

  // Items
  const [items, setItems] = useState<PurchaseItem[]>(
    initialPurchase.items.map(i => ({ ...i }))
  )

  const updateItem = (idx: number, field: keyof PurchaseItem, value: any) => {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[idx], [field]: value }
      // Auto-compute subtotal
      if (field === "berat_final_item" || field === "harga_per_kg") {
        item.subtotal = (parseFloat(String(item.berat_final_item)) || 0) * (parseFloat(String(item.harga_per_kg)) || 0)
      }
      next[idx] = item
      return next
    })
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      sku_name: "PET Clear",
      spec: "Gabyuk",
      berat_lapak: 0,
      berat_final_item: 0,
      harga_per_kg: 0,
      subtotal: 0,
    }])
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  // Computed totals
  const totalBeforeCuts = items.reduce((s, i) => s + (parseFloat(String(i.subtotal)) || 0), 0)
  const hargaPotSampah  = (parseFloat(beratPotSampah) || 0) * (parseFloat(potSampah) || 0)
  const hargaPotSusut   = (parseFloat(beratPotSusut) || 0) * (parseFloat(potSusut) || 0)
  const hargaPotAir     = (parseFloat(beratPotAir) || 0) * (parseFloat(potAir) || 0)
  const hargaPotKarung  = (parseFloat(beratPotKarung) || 0) * (parseFloat(potKarung) || 0)
  const totalAfterCuts  = totalBeforeCuts - hargaPotSampah - hargaPotSusut - hargaPotAir - hargaPotKarung

  const handleSave = async () => {
    if (items.length === 0) {
      setError("Minimal harus ada 1 item.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/purchases/${initialPurchase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          nomor_nota: nomor_nota || null,
          metode_pembayaran_terpilih: metode,
          berat_timbangan_lapak: beratLapak || null,
          berat_timbangan_gudang: beratGudang || null,
          items,
          potongan_sampah:  potSampah,   berat_potongan_sampah: beratPotSampah,  harga_potongan_sampah: hargaPotSampah,
          potongan_susut:   potSusut,    berat_potongan_susut:  beratPotSusut,   harga_potongan_susut:  hargaPotSusut,
          potongan_air:     potAir,      berat_potongan_air:    beratPotAir,     harga_potongan_air:    hargaPotAir,
          potongan_karung:  potKarung,   berat_potongan_karung: beratPotKarung,  harga_potongan_karung: hargaPotKarung,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")
      setSuccess(true)
      setTimeout(() => router.push(backUrl), 1200)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="premium-workflow space-y-6">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status saat ini:</span>
        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold">
          {STATUS_LABELS[initialPurchase.status_approval] || initialPurchase.status_approval}
        </span>
        <span className="text-xs text-slate-400">Perubahan akan disimpan tanpa mengubah status</span>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Informasi Dasar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Nomor Nota */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">No. Nota</label>
            <input
              type="text"
              value={nomor_nota}
              onChange={e => setNomorNota(e.target.value)}
              placeholder="Kosongkan jika tidak ada"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Lapak / Supplier</label>
            <ElegantSelect
              value={supplierId}
              options={supplierOptions}
              onChange={setSupplierId}
              ariaLabel="Pilih lapak atau supplier"
              className="w-full"
            />
          </div>

          {/* Metode */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Metode Pembayaran</label>
            <ElegantSelect
              value={metode}
              options={METODE_OPTIONS}
              onChange={setMetode}
              ariaLabel="Pilih metode pembayaran"
              className="w-full"
            />
          </div>

          {/* Berat Lapak */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Berat Timbangan Lapak (KG)</label>
            <input
              type="number"
              value={beratLapak}
              onChange={e => setBeratLapak(e.target.value)}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all"
            />
          </div>

          {/* Berat Gudang */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Berat Timbangan Gudang (KG)</label>
            <input
              type="number"
              value={beratGudang}
              onChange={e => setBeratGudang(e.target.value)}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Item Pembelian</h3>
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <span className="text-base leading-none">+</span> Tambah Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Spec</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Berat Final (KG)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Harga/KG (Rp)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Subtotal</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.sku_name}
                      onChange={e => updateItem(idx, "sku_name", e.target.value)}
                      list="sku-options"
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 min-w-[140px]"
                    />
                    <datalist id="sku-options">
                      {SKU_OPTIONS.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </td>
                  <td className="px-4 py-2">
                    <ElegantSelect
                      value={item.spec || ""}
                      options={SPEC_SELECT_OPTIONS}
                      onChange={(value) => updateItem(idx, "spec", value || null)}
                      ariaLabel="Pilih spec item"
                      className="min-w-[120px]"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.berat_final_item}
                      onChange={e => updateItem(idx, "berat_final_item", parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-right text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 min-w-[100px]"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.harga_per_kg}
                      onChange={e => updateItem(idx, "harga_per_kg", parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-right text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 min-w-[120px]"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700 whitespace-nowrap">
                    {fmtRp(parseFloat(String(item.subtotal)) || 0)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="text-rose-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1 rounded-lg hover:bg-rose-50"
                      title="Hapus item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">
                  Total Sebelum Potongan:
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800 font-mono">
                  {fmtRp(totalBeforeCuts)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Potongan */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Potongan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Potongan Sampah", pct: potSampah, setPct: setPotSampah, berat: beratPotSampah, setBerat: setBeratPotSampah, harga: hargaPotSampah },
            { label: "Potongan Susut",  pct: potSusut,  setPct: setPotSusut,  berat: beratPotSusut,  setBerat: setBeratPotSusut,  harga: hargaPotSusut  },
            { label: "Potongan Air",    pct: potAir,    setPct: setPotAir,    berat: beratPotAir,    setBerat: setBeratPotAir,    harga: hargaPotAir    },
            { label: "Potongan Karung", pct: potKarung, setPct: setPotKarung, berat: beratPotKarung, setBerat: setBeratPotKarung, harga: hargaPotKarung },
          ].map(pot => (
            <div key={pot.label} className="border border-slate-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600">{pot.label}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Harga/KG (Rp)</label>
                  <input
                    type="number"
                    value={pot.pct}
                    onChange={e => pot.setPct(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Berat (KG)</label>
                  <input
                    type="number"
                    value={pot.berat}
                    onChange={e => pot.setBerat(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              </div>
              <p className="text-xs text-right text-rose-600 font-semibold">
                − {fmtRp(pot.harga)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grand Total */}
      <div className="workflow-summary p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">Transaction total</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-950">{fmtRp(totalAfterCuts)}</p>
          </div>
          <div className="text-left text-xs font-medium text-slate-500 sm:text-right space-y-0.5">
            <p>Sebelum potongan: {fmtRp(totalBeforeCuts)}</p>
            <p>Total potongan: − {fmtRp(hargaPotSampah + hargaPotSusut + hargaPotAir + hargaPotKarung)}</p>
          </div>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">
          Peringatan: {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
          Transaksi berhasil diperbarui. Mengarahkan kembali...
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.push(backUrl)}
          className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          Kembali
        </button>
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="premium-button flex items-center gap-2 rounded-xl bg-slate-950 px-8 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Menyimpan...
            </>
          ) : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  )
}
