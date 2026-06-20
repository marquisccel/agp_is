"use client"

import { useState, type FormEvent } from "react"
import dynamic from "next/dynamic"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { getSupplierMapHref, hasResolvedSupplierCoordinates } from "@/lib/supplierLocation"

// Lazy-load to avoid SSR issues
const NotaDraft = dynamic(() => import("./NotaDraft"), { ssr: false })

const skuList = ["Bening", "BM", "Mix", "Warna", "Tutup HD", "Kotor", "Grade B", "Bocil", "Grade C", "Saos Kecap", "Galon", "PK", "Karung"]
const METODE_BAYAR_OPTIONS = [
  { value: "TIMBANGAN_GUDANG", label: "Timbangan Gudang" },
  { value: "TIMBANGAN_LAPAK", label: "Timbangan Lapak" },
]
const SKU_OPTIONS = [
  { value: "", label: "Pilih SKU" },
  ...skuList.map(sku => ({ value: sku, label: sku })),
]
const SPEC_OPTIONS = [
  { value: "", label: "Pilih spec" },
  { value: "Grading", label: "Grading" },
  { value: "Gabyuk", label: "Gabyuk" },
]

interface Item {
  sku_name: string
  spec: string
  berat_estimasi: number
  harga_per_kg: number
}

interface NotaData {
  supplierNama: string
  supplierKontakWa?: string | null
  gudangNama: string
  items: Item[]
  tanggal: string
  nomorDraft: string
  potonganSampah: number
  beratPotonganSampah: number
  hargaPotonganSampah: number
  potonganSusut: number
  beratPotonganSusut: number
  hargaPotonganSusut: number
  potonganAir: number
  beratPotonganAir: number
  hargaPotonganAir: number
  potonganKarung: number
  beratPotonganKarung: number
  hargaPotonganKarung: number
}

export default function PurchaseForm({ suppliers, namaGudang }: { suppliers: any[], namaGudang: string }) {
  const [supplierId, setSupplierId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [metodeBayar, setMetodeBayar] = useState("TIMBANGAN_GUDANG")
  const [items, setItems] = useState<Item[]>([{ sku_name: "", spec: "", berat_estimasi: 0, harga_per_kg: 0 }])

  const filteredSuppliers = suppliers.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId)
  const [beratPotonganSampah, setBeratPotonganSampah] = useState<number>(0)
  const [hargaPotonganSampah, setHargaPotonganSampah] = useState<number>(0)
  const [beratPotonganSusut, setBeratPotonganSusut] = useState<number>(0)
  const [hargaPotonganSusut, setHargaPotonganSusut] = useState<number>(0)
  const [beratPotonganAir, setBeratPotonganAir] = useState<number>(0)
  const [hargaPotonganAir, setHargaPotonganAir] = useState<number>(0)
  const [beratPotonganKarung, setBeratPotonganKarung] = useState<number>(0)
  const [hargaPotonganKarung, setHargaPotonganKarung] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notaData, setNotaData] = useState<NotaData | null>(null)

  const potonganSampah = beratPotonganSampah * hargaPotonganSampah
  const potonganSusut = beratPotonganSusut * hargaPotonganSusut
  const potonganAir = beratPotonganAir * hargaPotonganAir
  const potonganKarung = beratPotonganKarung * hargaPotonganKarung

  const addItem = () => setItems([...items, { sku_name: "", spec: "", berat_estimasi: 0, harga_per_kg: 0 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: keyof Item, value: string | number) => {
    setItems((current) =>
      current.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const payload = {
        supplierId,
        metode_pembayaran_terpilih: metodeBayar,
        items,
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
      }

      const res = await fetch("/api/purchases/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal menyimpan transaksi")
      }

      const saved = await res.json()
      // Show nota popup
      setNotaData({
        supplierNama: selectedSupplier?.nama || "-",
        supplierKontakWa: selectedSupplier?.kontak_wa || null,
        gudangNama: namaGudang,
        items,
        tanggal: new Date().toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }),
        nomorDraft: saved.id?.slice(0, 8).toUpperCase() || "DRAFT",
        potonganSampah,
        beratPotonganSampah,
        hargaPotonganSampah,
        potonganSusut,
        beratPotonganSusut,
        hargaPotonganSusut,
        potonganAir,
        beratPotonganAir,
        hargaPotonganAir,
        potonganKarung,
        beratPotonganKarung,
        hargaPotonganKarung,
      })

      // Reset form
      setSupplierId("")
      setSearchQuery("")
      setItems([{ sku_name: "", spec: "", berat_estimasi: 0, harga_per_kg: 0 }])
      setBeratPotonganSampah(0)
      setHargaPotonganSampah(0)
      setBeratPotonganSusut(0)
      setHargaPotonganSusut(0)
      setBeratPotonganAir(0)
      setHargaPotonganAir(0)
      setBeratPotonganKarung(0)
      setHargaPotonganKarung(0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalNilaiEstimasi = items.reduce((s, i) => s + i.berat_estimasi * i.harga_per_kg, 0)
  const totalDeductions = potonganSampah + potonganSusut + potonganAir + potonganKarung
  const totalEstimasiSetelahPotongan = Math.max(totalNilaiEstimasi - totalDeductions, 0)

  return (
    <>
      {/* Nota Modal */}
      {notaData && (
        <NotaDraft data={notaData} onClose={() => setNotaData(null)} />
      )}

      <form onSubmit={handleSubmit} className="premium-workflow space-y-6">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supplier Search Dropdown */}
          <div className="space-y-2 relative">
            <label className="text-sm font-semibold text-slate-700">Supplier / Lapak</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ketik nama / inisial supplier..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 transition-all outline-none font-medium text-slate-800"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsOpen(true)
                  if (!e.target.value) {
                    setSupplierId("")
                  }
                }}
                onFocus={() => setIsOpen(true)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>

              {isOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => {
                    setIsOpen(false)
                    const currentSupplier = suppliers.find(s => s.id === supplierId)
                    setSearchQuery(currentSupplier ? currentSupplier.nama : "")
                  }} />
                  
                  <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 divide-y divide-slate-50">
                    {filteredSuppliers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400 italic">Supplier tidak ditemukan</div>
                    ) : (
                      filteredSuppliers.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-cyan-50 flex justify-between items-center ${s.id === supplierId ? 'bg-cyan-50/50 text-cyan-700 font-bold' : 'text-slate-700'}`}
                          onClick={() => {
                            setSupplierId(s.id)
                            setSearchQuery(s.nama)
                            setIsOpen(false)
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{s.nama}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-normal">
                              <span className={`rounded-full border px-2 py-0.5 ${
                                s.transactionStatus === "GREEN"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                              }`}>
                                {s.transactionStatus === "GREEN" ? "Hijau" : "Merah"}
                              </span>
                              <span className="text-slate-400">
                                Target {Number(s.target_bulanan_kg || 0).toLocaleString("id-ID")} kg
                              </span>
                            </span>
                          </span>
                          {s.kontak_wa && <span className="ml-3 text-[10px] text-slate-400 font-normal">{s.kontak_wa}</span>}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <input type="hidden" name="supplierId" value={supplierId} required />
            {selectedSupplier && (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{selectedSupplier.nama}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    selectedSupplier.transactionStatus === "GREEN"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}>
                    {selectedSupplier.transactionStatus === "GREEN" ? "Status hijau" : "Status merah"}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    hasResolvedSupplierCoordinates(selectedSupplier)
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}>
                    {hasResolvedSupplierCoordinates(selectedSupplier) ? "Map ready" : "Lokasi belum lengkap"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {selectedSupplier.kontak_wa ? <span>WA {selectedSupplier.kontak_wa}</span> : <span>Kontak belum diisi</span>}
                  <span>Target {Number(selectedSupplier.target_bulanan_kg || 0).toLocaleString("id-ID")} kg/bulan</span>
                  {(selectedSupplier.link || hasResolvedSupplierCoordinates(selectedSupplier)) && (
                    <a
                      href={getSupplierMapHref({ ...selectedSupplier, warehouseName: namaGudang })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-sky-700 hover:text-sky-800"
                    >
                      Buka Maps
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Gudang is read-only from session */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Gudang</label>
            <div className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-100 text-slate-600 font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              {namaGudang}
            </div>
          </div>

          {/* Metode Bayar */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Metode Timbangan</label>
            <ElegantSelect
              value={metodeBayar}
              options={METODE_BAYAR_OPTIONS}
              onChange={setMetodeBayar}
              ariaLabel="Pilih metode timbangan"
              className="w-full"
            />
          </div>
        </div>

        {/* Item Barang */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Item Barang</h3>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-full md:flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-500">Jenis SKU</label>
                  <ElegantSelect
                    value={item.sku_name}
                    options={SKU_OPTIONS}
                    onChange={(value) => updateItem(idx, "sku_name", value)}
                    ariaLabel="Pilih SKU"
                    className="w-full"
                  />
                </div>
                <div className="w-full md:w-28 space-y-1">
                  <label className="text-xs font-medium text-slate-500">Spec</label>
                  <ElegantSelect
                    value={item.spec}
                    options={SPEC_OPTIONS}
                    onChange={(value) => updateItem(idx, "spec", value)}
                    ariaLabel="Pilih spec SKU"
                    className="w-full"
                  />
                </div>
                <div className="w-full md:w-1/4 space-y-1">
                  <label className="text-xs font-medium text-slate-500">Berat Lapak (KG)</label>
                  <input
                    type="number" min="0" step="0.01" required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    value={item.berat_estimasi || ""}
                    onChange={(e) => updateItem(idx, "berat_estimasi", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="w-full md:w-1/4 space-y-1">
                  <label className="text-xs font-medium text-slate-500">Harga/KG (Rp)</label>
                  <input
                    type="number" min="0" required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    value={item.harga_per_kg || ""}
                    onChange={(e) => updateItem(idx, "harga_per_kg", parseFloat(e.target.value) || 0)}
                  />
                </div>
                {items.length > 1 && (
                  <div className="w-full md:w-auto pt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tombol Tambah SKU di bawah list agar tidak perlu scroll ke atas */}
          <button
            type="button"
            onClick={addItem}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-cyan-200 rounded-xl text-sm text-cyan-600 font-semibold hover:bg-cyan-50 hover:border-cyan-400 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah SKU
          </button>
        </div>

        {/* Potongan Tambahan */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6 pt-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Potongan Tambahan (Opsional)</h3>
            <p className="text-xs text-slate-500 mt-1">Masukkan berat (KG) dan harga per KG untuk menghitung total potongan secara dinamis.</p>
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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

            {/* Susut Timbangan */}
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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

        {/* Estimasi Total */}
        {items.some(i => i.berat_estimasi > 0 && i.harga_per_kg > 0) && (
          <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-5 py-3 flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="text-left">
              <span className="text-sm text-cyan-700 font-medium block">Estimasi Total Nilai Setelah Potongan</span>
              {totalDeductions > 0 && (
                <span className="text-xs text-slate-500">
                  (Nilai Kotor: Rp {totalNilaiEstimasi.toLocaleString("id-ID")} - Potongan: Rp {totalDeductions.toLocaleString("id-ID")})
                </span>
              )}
            </div>
            <span className="text-lg font-extrabold text-cyan-700">
              Rp {totalEstimasiSetelahPotongan.toLocaleString("id-ID")}
            </span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="premium-button flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Menyimpan...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                Simpan & Buat Nota Draft
              </>
            )}
          </button>
        </div>
      </form>
    </>
  )
}
