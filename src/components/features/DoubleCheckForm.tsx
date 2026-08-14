"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Purchase, PurchaseItem, Supplier, User } from "@prisma/client"
import ElegantSelect from "@/components/ui/ElegantSelect"

type PurchaseForDoubleCheck = Purchase & {
  items: PurchaseItem[]
  supplier: Supplier
  staff: User
}

/** Item kerja lokal: berat_lapak dinormalisasi ke number (fallback ke berat_final_item) saat inisialisasi. */
type WorkingItem = {
  id: string
  sku_name: string
  spec: string | null
  berat_lapak: number
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
}

type ReturInput = { sku_name: string; berat_retur: number; potongan_nilai: number; alasan: string }

const METODE_BAYAR_OPTIONS = [
  { value: "TIMBANGAN_GUDANG", label: "Timbangan Gudang" },
  { value: "TIMBANGAN_LAPAK", label: "Timbangan Lapak" },
]

const PAYMENT_PERCENTAGE_OPTIONS = [
  { value: 100, label: "Full Pembayaran (100% - Lunas)" },
  { value: 90, label: "Termin 90% + 10% Pelunasan" },
  { value: 80, label: "Termin 80% + 20% Pelunasan" },
  { value: 75, label: "Termin 75% + 25% Pelunasan" },
  { value: 50, label: "Termin 50% + 50% Pelunasan" },
]

export default function DoubleCheckForm({
  purchase,
  availableDp,
  successRedirect = "/dashboard/admin",
}: {
  purchase: PurchaseForDoubleCheck
  availableDp: number
  successRedirect?: string
}) {
  const router = useRouter()

  const staffLapakSum = purchase.berat_timbangan_lapak || purchase.items.reduce((sum, item) => sum + (item.berat_final_item || 0), 0)

  const [timbanganLapak] = useState(staffLapakSum)
  const [timbanganGudang, setTimbanganGudang] = useState(purchase.berat_timbangan_gudang || purchase.items.reduce((sum, item) => sum + (item.berat_final_item || 0), 0))
  const [metodeBayar, setMetodeBayar] = useState(purchase.metode_pembayaran_terpilih || "TIMBANGAN_GUDANG")
  const [persentasePembayaran, setPersentasePembayaran] = useState<number>(purchase.persentase_pembayaran || 100)

  // Initialize items from draft
  const [items, setItems] = useState<WorkingItem[]>(purchase.items.map((i) => ({
    ...i,
    berat_lapak: i.berat_lapak ?? i.berat_final_item, // Timbangan lapak staff
    berat_final_item: i.berat_final_item // Timbangan gudang (admin inputs this)
  })))

  // Returs -- transaksi pada tahap ini selalu menunggu_verifikasi (belum pernah
  // melalui double-check), jadi belum mungkin ada retur tersimpan sebelumnya.
  const [returs, setReturs] = useState<ReturInput[]>([])
  const [dpDigunakan, setDpDigunakan] = useState(purchase.dp_yang_digunakan || 0)

  // Deductions from draft
  const [beratPotonganSampah, setBeratPotonganSampah] = useState<number>(purchase.berat_potongan_sampah || 0)
  const [hargaPotonganSampah, setHargaPotonganSampah] = useState<number>(purchase.harga_potongan_sampah || 0)
  const [beratPotonganSusut, setBeratPotonganSusut] = useState<number>(purchase.berat_potongan_susut || 0)
  const [hargaPotonganSusut, setHargaPotonganSusut] = useState<number>(purchase.harga_potongan_susut || 0)
  const [beratPotonganAir, setBeratPotonganAir] = useState<number>(purchase.berat_potongan_air || 0)
  const [hargaPotonganAir, setHargaPotonganAir] = useState<number>(purchase.harga_potongan_air || 0)
  const [beratPotonganKarung, setBeratPotonganKarung] = useState<number>(purchase.berat_potongan_karung || 0)
  const [hargaPotonganKarung, setHargaPotonganKarung] = useState<number>(purchase.harga_potongan_karung || 0)

  const potonganSampah = beratPotonganSampah * hargaPotonganSampah
  const potonganSusut = beratPotonganSusut * hargaPotonganSusut
  const potonganAir = beratPotonganAir * hargaPotonganAir
  const potonganKarung = beratPotonganKarung * hargaPotonganKarung

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const addRetur = () => setReturs([...returs, { sku_name: "", berat_retur: 0, potongan_nilai: 0, alasan: "" }])
  const updateRetur = <K extends keyof ReturInput>(idx: number, field: K, value: ReturInput[K]) => {
    setReturs(current => current.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }
  const removeRetur = (idx: number) => setReturs(current => current.filter((_, i) => i !== idx))

  const updateItem = (idx: number, value: number) => {
    setItems((current) => {
      const updated = current.map((item, i) => i === idx ? { ...item, berat_final_item: value } : item)
      const totalGudang = updated.reduce((sum, item) => sum + (item.berat_final_item || 0), 0)
      setTimbanganGudang(totalGudang)
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (dpDigunakan > availableDp) {
      setError(`DP yang digunakan tidak boleh melebihi sisa DP (Rp ${availableDp.toLocaleString('id-ID')})`)
      setLoading(false)
      return
    }

    try {
      const payload = {
        berat_timbangan_lapak: timbanganLapak,
        berat_timbangan_gudang: timbanganGudang,
        metode_pembayaran_terpilih: metodeBayar,
        items,
        returs,
        dp_yang_digunakan: dpDigunakan,
        potongan_sampah: potonganSampah,
        berat_potongan_sampah: beratPotonganSampah,
        harga_potongan_sampah: hargaPotonganSampah,
        potongan_susut: potonganSusut,
        berat_potongan_susut: beratPotonganSusut,
        harga_potongan_susut: hargaPotonganSusut,
        potongan_air: potonganAir,
        berat_potongan_air: beratPotonganAir,
        harga_potongan_air: hargaPotonganAir,
        potongan_karung: potonganKarung,
        berat_potongan_karung: beratPotonganKarung,
        harga_potongan_karung: hargaPotonganKarung,
        persentase_pembayaran: persentasePembayaran,
        nominal_pembayaran_awal: nominalPembayaranAwal,
        nominal_belum_lunas: nominalBelumLunas,
        status_pelunasan: persentasePembayaran < 100 ? "BELUM_LUNAS" : "LUNAS",
        total_dibayar: persentasePembayaran < 100 ? nominalPembayaranAwal : totalAkhirDibayar
      }

      const res = await fetch(`/api/purchases/${purchase.id}/double-check`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal melakukan double check")
      }

      router.push(successRedirect)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Dynamic calculations
  const totalKotor = items.reduce((sum, item) => {
    const w = metodeBayar === "TIMBANGAN_LAPAK" ? (item.berat_lapak ?? item.berat_final_item ?? 0) : (item.berat_final_item ?? 0)
    return sum + (w * item.harga_per_kg)
  }, 0)
  
  const totalRetur = returs.reduce((sum, r) => {
    const relatedItem = items.find((i) => i.sku_name === r.sku_name)
    const harga = relatedItem ? relatedItem.harga_per_kg : 0
    return sum + (r.berat_retur * harga) + (r.potongan_nilai || 0)
  }, 0)

  const totalSetelahRetur = Math.max(totalKotor - totalRetur, 0)
  const totalDeductions = potonganSampah + potonganSusut + potonganAir + potonganKarung
  const totalNetPayout = Math.max(totalSetelahRetur - totalDeductions, 0)
  const totalAkhirDibayar = Math.max(totalNetPayout - dpDigunakan, 0)
  const nominalPembayaranAwal = Math.round(totalAkhirDibayar * (persentasePembayaran / 100))
  const nominalBelumLunas = Math.round(totalAkhirDibayar * ((100 - persentasePembayaran) / 100))

  return (
    <form onSubmit={handleSubmit} className="premium-workflow space-y-8">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Data Timbangan</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Metode Pembayaran Final</label>
                <ElegantSelect
                  value={metodeBayar}
                  options={METODE_BAYAR_OPTIONS}
                  onChange={setMetodeBayar}
                  ariaLabel="Pilih metode pembayaran final"
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Persentase Pembayaran (Termin)</label>
                <ElegantSelect
                  value={persentasePembayaran}
                  options={PAYMENT_PERCENTAGE_OPTIONS}
                  onChange={setPersentasePembayaran}
                  ariaLabel="Pilih persentase pembayaran"
                  className="mt-1 w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    Timbangan Lapak (KG)
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">Staff</span>
                  </label>
                  <input
                    type="number" step="0.01" readOnly disabled
                    className="w-full mt-1 border-slate-200 rounded-xl px-4 py-2 bg-slate-100 text-slate-500 cursor-not-allowed outline-none font-semibold"
                    value={timbanganLapak || 0}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    Timbangan Gudang (KG)
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>Gudang</span>
                  </label>
                  <input
                    type="number" step="0.01" required
                    className="w-full mt-1 border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none font-semibold"
                    value={timbanganGudang || ""} onChange={e => setTimbanganGudang(parseFloat(e.target.value)||0)}
                  />
                </div>
              </div>

              {/* Real-time comparison badge/panel */}
              {timbanganLapak > 0 && (
                <div className="mt-4 p-4 rounded-xl border flex flex-col gap-2 transition-all bg-white shadow-sm border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Hasil Perbandingan Timbangan</span>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <div className="text-xs text-slate-400">Selisih Timbangan</div>
                      <div className={`text-lg font-bold font-mono ${(timbanganGudang - timbanganLapak) === 0 ? 'text-emerald-600' : (timbanganGudang - timbanganLapak) < 0 ? 'text-rose-600' : ''}`} style={(timbanganGudang - timbanganLapak) > 0 ? { color: "var(--brand-strong)" } : undefined}>
                        {(timbanganGudang - timbanganLapak) > 0 ? `+${(timbanganGudang - timbanganLapak).toFixed(2)}` : (timbanganGudang - timbanganLapak).toFixed(2)} KG
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Persentase Selisih / Susut</div>
                      <div className={`text-lg font-bold font-mono ${(timbanganGudang - timbanganLapak) === 0 ? 'text-emerald-600' : (timbanganGudang - timbanganLapak) < 0 ? 'text-rose-600' : ''}`} style={(timbanganGudang - timbanganLapak) > 0 ? { color: "var(--brand-strong)" } : undefined}>
                        {timbanganLapak > 0 ? (((timbanganGudang - timbanganLapak) / timbanganLapak) * 100).toFixed(1) : "0"}%
                      </div>
                    </div>
                  </div>
                  <div className={`mt-2 text-xs py-2 px-3 rounded-lg border text-center font-semibold ${(timbanganGudang - timbanganLapak) === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : (timbanganGudang - timbanganLapak) < 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : ''}`} style={(timbanganGudang - timbanganLapak) > 0 ? { background: "var(--brand-soft)", color: "var(--brand-strong)", borderColor: "var(--brand-soft-strong)" } : undefined}>
                    {(timbanganGudang - timbanganLapak) === 0 
                      ? "Timbangan lapak staff dan timbangan gudang sinkron sempurna" 
                      : (timbanganGudang - timbanganLapak) < 0 
                        ? `Peringatan: terdapat penyusutan timbangan gudang sebesar ${Math.abs(timbanganGudang - timbanganLapak).toFixed(2)} KG dibanding timbangan lapak staff`
                        : `Timbangan gudang bertambah sebesar ${(timbanganGudang - timbanganLapak).toFixed(2)} KG dibanding timbangan lapak staff`}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-800">Finalisasi Item per SKU</h3>
              <p className="text-xs text-slate-500 mt-1">Admin menginput kembali hasil timbangan gudang untuk setiap SKU yang masuk dari data staff.</p>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => {
                const lapakWeight = item.berat_lapak ?? item.berat_final_item ?? 0
                const gudangWeight = item.berat_final_item ?? 0
                const diff = gudangWeight - lapakWeight

                return (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-3 transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-bold text-slate-800 text-sm">{item.sku_name}</span>
                        {item.spec && (
                          <span className={`ml-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded ${item.spec === 'Grading' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {item.spec}
                          </span>
                        )}
                      </div>
                      
                      {/* SKU Delta indicator */}
                      {diff !== 0 ? (
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg flex items-center gap-1 ${diff < 0 ? 'bg-rose-50 text-rose-600' : ''}`}
                          style={diff > 0 ? { background: "var(--brand-soft)", color: "var(--brand-strong)" } : undefined}
                        >
                          {diff < 0 ? `Susut ${diff.toFixed(2)} KG (${((diff / lapakWeight) * 100).toFixed(1)}%)` : `Bertambah +${diff.toFixed(2)} KG (+${((diff / lapakWeight) * 100).toFixed(1)}%)`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          Sinkron
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Read-only Lapak Weight */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Timbangan Lapak (Staff)
                        </label>
                        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-sm text-slate-500 font-bold font-mono cursor-not-allowed">
                          {lapakWeight.toFixed(2)} KG
                        </div>
                      </div>

                      {/* Admin input for Warehouse Weight */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
                          Timbangan Gudang (Admin)
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-1.5 text-sm font-bold font-mono bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-slate-800"
                            value={item.berat_final_item || ""}
                            onChange={e => updateItem(idx, parseFloat(e.target.value) || 0)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            KG
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-orange-800">Retur / Potongan</h3>
              <button type="button" onClick={addRetur} className="text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors">
                + Tambah Retur
              </button>
            </div>
            
            {returs.length === 0 ? (
              <p className="text-sm text-orange-600/60 italic">Tidak ada retur.</p>
            ) : (
              <div className="space-y-4">
                {returs.map((retur, idx) => {
                  const relatedItem = items.find((i) => i.sku_name === retur.sku_name);
                  const hargaItem = relatedItem ? relatedItem.harga_per_kg : 0;
                  const autoDeduction = (retur.berat_retur || 0) * hargaItem;
                  const rowTotal = autoDeduction + (retur.potongan_nilai || 0);

                  return (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm relative space-y-3">
                    <button type="button" onClick={() => removeRetur(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500">SKU (Barang Dikembalikan)</label>
                        <ElegantSelect
                          value={retur.sku_name}
                          options={[{ value: "", label: "Pilih SKU" }, ...items.map((i) => ({ value: i.sku_name, label: i.sku_name }))]}
                          onChange={(value) => updateRetur(idx, 'sku_name', value)}
                          ariaLabel="Pilih SKU retur"
                          className="mt-1 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Alasan Retur</label>
                        <input type="text" className="w-full border-slate-200 rounded-lg p-2 text-sm mt-1" placeholder="Basah, kotor..." value={retur.alasan} onChange={e => updateRetur(idx, 'alasan', e.target.value)} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-orange-50">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Potong Berat (KG)</label>
                        <input type="number" step="0.01" className="w-full border-slate-200 rounded-lg p-2 text-sm mt-1" value={retur.berat_retur || ""} onChange={e => updateRetur(idx, 'berat_retur', parseFloat(e.target.value)||0)} />
                        {retur.sku_name && <span className="text-[10px] text-orange-600 block mt-1">x Rp {hargaItem.toLocaleString('id-ID')} / KG = <strong className="font-mono">Rp {autoDeduction.toLocaleString('id-ID')}</strong></span>}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. Penalti Ekstra (Flat Rp)</label>
                        <input type="number" className="w-full border-slate-200 rounded-lg p-2 text-sm mt-1" placeholder="0" value={retur.potongan_nilai || ""} onChange={e => updateRetur(idx, 'potongan_nilai', parseFloat(e.target.value)||0)} />
                        <span className="text-[10px] text-slate-400 block mt-1">Kosongkan jika tidak ada penalti tambahan</span>
                      </div>
                      <div className="flex flex-col justify-center items-end bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subtotal Retur Ini</span>
                        <span className="text-base font-extrabold text-rose-600">-Rp {rowTotal.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Potongan Spesifik</h3>
              <p className="text-xs text-slate-500 mt-1">Tinjau atau sesuaikan potongan sampah, susut timbangan, kadar air, dan karung.</p>
            </div>
            <div className="space-y-4">
              {/* Sampah */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                <div className="md:w-1/4 font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  Sampah
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Berat (KG)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={beratPotonganSampah || ""}
                      onChange={(e) => setBeratPotonganSampah(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Harga / KG (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={hargaPotonganSampah || ""}
                      onChange={(e) => setHargaPotonganSampah(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="md:w-1/4 text-right flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Potongan</span>
                  <span className="text-sm font-extrabold text-red-500">
                    - Rp {potonganSampah.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Susut */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                <div className="md:w-1/4 font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  Susut Timbangan
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Berat (KG)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={beratPotonganSusut || ""}
                      onChange={(e) => setBeratPotonganSusut(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Harga / KG (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={hargaPotonganSusut || ""}
                      onChange={(e) => setHargaPotonganSusut(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="md:w-1/4 text-right flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Potongan</span>
                  <span className="text-sm font-extrabold text-red-500">
                    - Rp {potonganSusut.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Air */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                <div className="md:w-1/4 font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  Kadar Air
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Berat (KG)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={beratPotonganAir || ""}
                      onChange={(e) => setBeratPotonganAir(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Harga / KG (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={hargaPotonganAir || ""}
                      onChange={(e) => setHargaPotonganAir(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="md:w-1/4 text-right flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Potongan</span>
                  <span className="text-sm font-extrabold text-red-500">
                    - Rp {potonganAir.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Karung */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                <div className="md:w-1/4 font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                  Potongan Karung
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Berat (KG)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={beratPotonganKarung || ""}
                      onChange={(e) => setBeratPotonganKarung(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Harga / KG (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                      value={hargaPotonganKarung || ""}
                      onChange={(e) => setHargaPotonganKarung(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="md:w-1/4 text-right flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Potongan</span>
                  <span className="text-sm font-extrabold text-red-500">
                    - Rp {potonganKarung.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-bold text-blue-800 mb-2">Potongan DP</h3>
            <p className="text-sm text-blue-600 mb-4">Sisa DP Lapak: <span className="font-bold font-mono">Rp {availableDp.toLocaleString('id-ID')}</span></p>
            <div>
              <label className="text-sm font-semibold text-slate-700">Gunakan DP (Rp)</label>
              <input
                type="number" max={availableDp} min="0"
                className="w-full mt-1 border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={dpDigunakan || ""} onChange={e => setDpDigunakan(parseFloat(e.target.value)||0)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan Pembayaran Final */}
      <div className="workflow-summary p-5 md:p-6 space-y-5 animate-in fade-in duration-300">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: "var(--brand-strong)" }}>Payment summary</p>
            <h3 className="mt-1 text-base font-bold text-slate-950 md:text-lg">Rincian Perhitungan Pembayaran</h3>
          </div>
          <p className="text-xs font-medium text-slate-500">Nilai bersih setelah retur, potongan, dan DP.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="workflow-stat p-3.5">
            <span className="text-xs font-semibold block text-slate-500">Subtotal Kotor ({metodeBayar === 'TIMBANGAN_LAPAK' ? 'Lapak' : 'Gudang'})</span>
            <span className="text-base font-bold text-slate-800">Rp {totalKotor.toLocaleString('id-ID')}</span>
          </div>
          <div className="workflow-stat p-3.5">
            <span className="text-xs font-semibold block text-slate-500">Total Potongan Retur</span>
            <span className="text-base font-bold text-rose-600">-Rp {totalRetur.toLocaleString('id-ID')}</span>
          </div>
          <div className="workflow-stat p-3.5">
            <span className="text-xs font-semibold block text-slate-500">Potongan Spesifik (Sampah, Susut, Air, Karung)</span>
            <span className="text-base font-bold text-rose-600">-Rp {totalDeductions.toLocaleString('id-ID')}</span>
          </div>
          <div className="workflow-stat p-3.5">
            <span className="text-xs font-semibold block text-slate-500">Potongan DP Terpakai</span>
            <span className="text-base font-bold text-blue-600">-Rp {dpDigunakan.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end pt-4 border-t border-slate-200 gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Net Payout (Sebelum DP)</span>
            <span className="text-base font-bold text-slate-700">Rp {totalNetPayout.toLocaleString('id-ID')}</span>
          </div>
          <div className="md:text-right">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Akhir Dibayar ke Lapak</span>
            <span className="text-2xl font-extrabold" style={{ color: "var(--brand-strong)" }}>Rp {totalAkhirDibayar.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {persentasePembayaran < 100 && (
          <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col gap-2 transition-all">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block font-sans">Kalkulasi Termin {persentasePembayaran}%</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 block font-sans">Pembayaran Awal ({persentasePembayaran}%)</span>
                <span className="text-lg font-bold text-slate-800 font-mono">Rp {nominalPembayaranAwal.toLocaleString('id-ID')}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-sans">Sisa Pelunasan ({100 - persentasePembayaran}%)</span>
                <span className="text-lg font-bold text-amber-700 font-mono">Rp {nominalBelumLunas.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <p className="text-[10px] text-amber-600 font-semibold italic mt-1 font-sans">
              * Transaksi ini akan tercatat sebagai BELUM LUNAS dan memicu notifikasi di dashboard utama.
            </p>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-slate-200 flex justify-end gap-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="premium-button rounded-xl px-8 py-3 font-bold text-white disabled:opacity-70"
          style={{ background: "var(--brand)" }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "var(--brand-strong)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)" }}
        >
          {loading ? "Menyimpan..." : "Simpan Verifikasi"}
        </button>
      </div>
    </form>
  )
}
