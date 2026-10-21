"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import dynamic from "next/dynamic"
import type { Supplier } from "@prisma/client"
import RingkasanLapak from "@/components/features/RingkasanLapak"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { SKU_OPTIONS } from "@/lib/skuList"
import { fmtDigitInput, fmtRp, fmtSkalaRupiah } from "@/lib/format"
import PotonganFields, { type BarisPotongan } from "@/components/features/PotonganFields"
import NumberInput from "@/components/ui/NumberInput"
import StandarHargaSku, { type StandarHarga } from "@/components/features/StandarHargaSku"
import { pesanError } from "@/lib/pesanError"
import { MAKS_HARI_MUNDUR_STAFF, hariIniWib, hariMundurWib } from "@/lib/tanggalPembelian"
import { useLayarPonsel } from "@/lib/useLayarPonsel"
import StickyActionBar from "@/components/ui/StickyActionBar"
import WizardLangkah from "@/components/ui/WizardLangkah"

// Lazy-load to avoid SSR issues
const NotaDraft = dynamic(() => import("./NotaDraft"), { ssr: false })

const METODE_BAYAR_OPTIONS = [
  { value: "TIMBANGAN_GUDANG", label: "Timbangan Gudang" },
  { value: "TIMBANGAN_LAPAK", label: "Timbangan Lapak" },
]
const JENIS_PENGAMBILAN_OPTIONS = [
  { value: "AMBIL", label: "Diambil (armada PT ke lapak)" },
  { value: "KIRIM", label: "Dikirim (lapak antar ke gudang)" },
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
  dpDigunakan: number
}

export default function PurchaseForm({
  suppliers,
  namaGudang,
  standarHarga = [],
}: {
  suppliers: Supplier[]
  namaGudang: string
  standarHarga?: StandarHarga[]
}) {
  const [supplierId, setSupplierId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [metodeBayar, setMetodeBayar] = useState("TIMBANGAN_GUDANG")
  const [jenisPengambilan, setJenisPengambilan] = useState("AMBIL")
  /** "YYYY-MM-DD" menurut WIB. Bawaannya hari ini; diubah bila barang dibeli di hari sebelumnya. */
  const [tanggalPembelian, setTanggalPembelian] = useState(() => hariIniWib())
  const [items, setItems] = useState<Item[]>([{ sku_name: "", spec: "", berat_estimasi: 0, harga_per_kg: 0 }])
  /** Digit mentah; pemisah ribuan hanya untuk tampilan. */
  const [dpDigunakan, setDpDigunakan] = useState("")
  const [sisaDpMap, setSisaDpMap] = useState<Record<string, number>>({})

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

  // Di ponsel form ini dipecah jadi empat langkah; di layar lebar tetap satu
  // halaman seperti semula. Yang berbeda hanya komponen mana yang dipasang,
  // jadi seluruh state di atas dipakai bersama oleh kedua bentuk.
  const ponsel = useLayarPonsel()
  const [langkah, setLangkah] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  // Sisa kasbon per lapak diambil sekali saat form dibuka; dipakai untuk
  // membatasi berapa yang boleh dipotong di nota ini.
  useEffect(() => {
    let aktif = true
    fetch("/api/dp/summary")
      .then(res => (res.ok ? res.json() : null))
      .then((rows: { supplierId: string; remaining: number }[] | null) => {
        if (!aktif || !rows) return
        setSisaDpMap(Object.fromEntries(rows.map(r => [r.supplierId, r.remaining])))
      })
      .catch(() => {})
    return () => { aktif = false }
  }, [])

  const sisaDp = supplierId ? (sisaDpMap[supplierId] ?? 0) : 0
  const dpAngka = dpDigunakan ? Number(dpDigunakan) : 0

  const potonganSampah = beratPotonganSampah * hargaPotonganSampah
  const potonganSusut = beratPotonganSusut * hargaPotonganSusut
  const potonganAir = beratPotonganAir * hargaPotonganAir
  const potonganKarung = beratPotonganKarung * hargaPotonganKarung

  // Menambah jenis potongan baru = menambah satu baris di sini; markup-nya
  // ditangani PotonganFields.
  const barisPotongan: BarisPotongan[] = [
    { kunci: 'sampah', nama: 'Sampah',          berat: beratPotonganSampah, setBerat: setBeratPotonganSampah, harga: hargaPotonganSampah, setHarga: setHargaPotonganSampah, nilai: potonganSampah },
    { kunci: 'susut',  nama: 'Susut Timbangan', berat: beratPotonganSusut,  setBerat: setBeratPotonganSusut,  harga: hargaPotonganSusut,  setHarga: setHargaPotonganSusut,  nilai: potonganSusut },
    { kunci: 'air',    nama: 'Kadar Air',       berat: beratPotonganAir,    setBerat: setBeratPotonganAir,    harga: hargaPotonganAir,    setHarga: setHargaPotonganAir,    nilai: potonganAir },
    { kunci: 'karung', nama: 'Potongan Karung', berat: beratPotonganKarung, setBerat: setBeratPotonganKarung, harga: hargaPotonganKarung, setHarga: setHargaPotonganKarung, nilai: potonganKarung },
  ]


  const addItem = () => setItems([...items, { sku_name: "", spec: "", berat_estimasi: 0, harga_per_kg: 0 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: keyof Item, value: string | number) => {
    setItems((current) =>
      current.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Dijaga di sini juga, bukan hanya di server: pesan gagal setelah nota
    // terkirim jauh lebih membingungkan buat Staff di lapangan.
    //
    // Dua penjagaan pertama dulu ditanggung atribut required pada isiannya.
    // Pada bentuk bertahap, langkah yang tidak sedang dibuka tidak dipasang
    // di DOM, sehingga peramban tidak lagi bisa memvalidasinya saat tombol
    // Simpan ditekan di langkah terakhir. Pemeriksaannya karena itu pindah
    // ke sini, tempat yang berlaku untuk kedua bentuk.
    if (!supplierId) {
      setError("Pilih lapak terlebih dahulu.")
      setLangkah(0)
      return
    }
    if (!items.some((i) => i.sku_name && i.berat_estimasi > 0 && i.harga_per_kg > 0)) {
      setError("Isi minimal satu item dengan SKU, berat, dan harga.")
      setLangkah(1)
      return
    }
    if (dpMelebihiSaldo) {
      setError(`DP yang digunakan melebihi sisa kasbon lapak (${fmtRp(sisaDp)}).`)
      return
    }
    if (dpMelebihiNota) {
      setError("DP yang digunakan tidak boleh melebihi nilai nota setelah potongan.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const payload = {
        supplierId,
        metode_pembayaran_terpilih: metodeBayar,
        jenis_pengambilan: jenisPengambilan,
        tanggal_pembelian: tanggalPembelian,
        dp_yang_digunakan: dpAngka,
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
        // Tanggal pada nota adalah tanggal PEMBELIAN yang dipilih, bukan hari nota diketik.
        tanggal: new Date(`${tanggalPembelian}T12:00:00+07:00`).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }),
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
        dpDigunakan: dpAngka,
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
      setDpDigunakan("")
      setTanggalPembelian(hariIniWib())
      setLangkah(0)
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setLoading(false)
    }
  }

  const totalNilaiEstimasi = items.reduce((s, i) => s + i.berat_estimasi * i.harga_per_kg, 0)
  const totalDeductions = potonganSampah + potonganSusut + potonganAir + potonganKarung
  const totalEstimasiSetelahPotongan = Math.max(totalNilaiEstimasi - totalDeductions, 0)
  const totalDibayarKeLapak = Math.max(totalEstimasiSetelahPotongan - dpAngka, 0)
  const dpMelebihiSaldo = dpAngka > sisaDp
  const dpMelebihiNota = dpAngka > totalEstimasiSetelahPotongan

  // ── Bagian-bagian form ────────────────────────────────────────────
  //
  // Dipisah jadi empat potongan JSX supaya bentuk bertahap di ponsel dan
  // bentuk satu halaman di layar lebar memakai markup yang SAMA. Menyalin
  // markup-nya jadi dua versi berarti tiap perubahan isian harus dikerjakan
  // dua kali, dan cepat atau lambat salah satunya tertinggal.

  const bagianLapak = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start md:gap-x-6 md:gap-y-5">
      {/* Supplier Search Dropdown */}
      <div className="space-y-2 relative">
        <label className="field-label">Lapak / Supplier</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Ketik nama / inisial supplier..."
            className="field-input field-lg"
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
              
              <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 divide-y divide-[var(--border)] overflow-y-auto rounded-[var(--radius-sm)] border shadow-xl"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                {filteredSuppliers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400 italic">Lapak tidak ditemukan</div>
                ) : (
                  filteredSuppliers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`w-full text-left px-4 py-3 text-sm transition-colors flex justify-between items-center ${s.id === supplierId ? 'font-bold' : 'text-slate-700 hover:bg-[var(--bg-tint)]'}`}
                      style={s.id === supplierId ? { background: "var(--brand-soft)", color: "var(--brand-strong)" } : undefined}
                      onClick={() => {
                        setSupplierId(s.id)
                        setSearchQuery(s.nama)
                        setIsOpen(false)
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{s.nama}</span>
                        {/* Pil berbunyi "Hijau"/"Merah" -- nama warna,
                            bukan artinya. Diganti pola titik + kata,
                            sama seperti daftar Data Lapak. */}
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-normal" style={{ color: "var(--muted)" }}>
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: s.transactionStatus === "GREEN" ? "var(--success)" : "var(--danger)" }}
                            aria-hidden="true"
                          />
                          <span>{s.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>Target {Number(s.target_bulanan_kg || 0).toLocaleString("id-ID")} kg</span>
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
          <RingkasanLapak lapak={selectedSupplier} namaGudang={namaGudang} tampilkanKontak />
        )}
      </div>

      {/* Gudang is read-only from session */}
      <div className="space-y-2">
        <label className="field-label">Gudang</label>
        <div className="field-input field-lg flex cursor-default items-center gap-2 font-medium text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          {namaGudang}
        </div>
      </div>

      {/* Metode Bayar */}
      <div className="space-y-2">
        <label className="field-label">Metode Timbangan</label>
        <ElegantSelect
          value={metodeBayar}
          options={METODE_BAYAR_OPTIONS}
          onChange={setMetodeBayar}
          ariaLabel="Pilih metode timbangan"
          className="w-full"
        />
      </div>

      {/* Jenis Pengambilan (mode logistik) */}
      <div className="space-y-2">
        <label className="field-label">Jenis Pengambilan</label>
        <ElegantSelect
          value={jenisPengambilan}
          options={JENIS_PENGAMBILAN_OPTIONS}
          onChange={setJenisPengambilan}
          ariaLabel="Pilih jenis pengambilan barang"
          className="w-full"
        />
        <p className="text-xs text-slate-400">
          Dipakai untuk rekap efektivitas armada di dashboard Manager.
        </p>
      </div>

      {/* Tanggal pembelian (arahan Manager 21 Okt 2026): barang bisa dibeli
          tanggal 10 tetapi nota baru dibuat tanggal 13. Laporan dan target
          harian mengikuti tanggal ini. */}
      <div className="space-y-2">
        <label className="field-label" htmlFor="tanggal-pembelian">Tanggal Pembelian</label>
        <input
          id="tanggal-pembelian"
          type="date"
          required
          className="field-input field-lg"
          value={tanggalPembelian}
          min={hariMundurWib(MAKS_HARI_MUNDUR_STAFF)}
          max={hariIniWib()}
          onChange={(e) => setTanggalPembelian(e.target.value)}
        />
        <p className="text-xs text-slate-400">
          Isi tanggal barang dibeli bila berbeda dari hari ini. Paling lama {MAKS_HARI_MUNDUR_STAFF} hari ke belakang.
        </p>
      </div>
    </div>
  )

  // Item Barang
  // Di ponsel langkah ini sudah berjudul "Item Barang" di WizardLangkah, jadi
  // garis pemisah dan judul keduanya dilepas supaya tidak terbaca dua kali.
  const bagianItem = (
    <div className={ponsel ? "" : "border-t border-slate-100 pt-4"}>
      {!ponsel && <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800">Item Barang</h3>}

      <div className="space-y-3">
        {items.map((item, idx) => (
          /* Ponsel: kisi dua lajur, SKU dan spec sebaris lalu berat dan
             harga sebaris. Bertumpuk satu per baris, satu item memakan
             hampir satu layar penuh; berpasangan, dua item muat sekaligus
             tanpa menggulir. */
          <div key={idx} className="grid grid-cols-2 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:flex md:flex-nowrap md:p-4">
            <div className="w-full md:flex-1 space-y-1">
              <label className="field-label">Jenis SKU</label>
              <ElegantSelect
                value={item.sku_name}
                options={SKU_OPTIONS}
                onChange={(value) => updateItem(idx, "sku_name", value)}
                ariaLabel="Pilih SKU"
                className="w-full"
              />
            </div>
            <div className="w-full md:w-28 space-y-1">
              <label className="field-label">Spec</label>
              <ElegantSelect
                value={item.spec}
                options={SPEC_OPTIONS}
                onChange={(value) => updateItem(idx, "spec", value)}
                ariaLabel="Pilih spec SKU"
                className="w-full"
              />
            </div>
            <div className="w-full md:w-1/4 space-y-1">
              <label className="field-label">Berat Lapak (KG)</label>
              <NumberInput
                aria-label="Berat Lapak (KG)"
                min="0" step="0.01" required
                className="field-input"
                value={item.berat_estimasi}
                onValueChange={(n) => updateItem(idx, "berat_estimasi", n)}
              />
            </div>
            <div className="w-full md:w-1/4 space-y-1">
              <label className="field-label">Harga/KG (Rp)</label>
              <NumberInput
                aria-label="Harga/KG (Rp)"
                min="0" required
                className="field-input"
                value={item.harga_per_kg}
                onValueChange={(n) => updateItem(idx, "harga_per_kg", n)}
              />
              <StandarHargaSku skuName={item.sku_name} harga={item.harga_per_kg} standar={standarHarga} />
            </div>
            {items.length > 1 && (
              <div className="col-span-2 flex justify-end md:w-auto md:pt-6">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="btn-netral tone-danger rounded-[var(--radius-sm)] p-2"
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
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed rounded-xl text-sm font-semibold transition-all hover:bg-[var(--brand-soft)]"
        style={{ borderColor: "var(--brand-soft-strong)", color: "var(--brand-strong)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Tambah SKU
      </button>
    </div>
  )

  // Potongan Kasbon (DP) -- kasbon yang sudah disetujui Manager langsung
  // dipotong di nota ini, tidak lagi menunggu tahap verifikasi gudang.
  // Dipisah dari PotonganFields karena di ponsel menu Potongan Tambahan
  // dihapus (arahan Manager) sementara kasbon tetap ada.
  const bagianKasbon = (
    <>
      {supplierId && (
        <div className="rounded-[var(--radius-md)] border p-4" style={{ background: "var(--surface-sunken)", borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800">Potongan Kasbon (DP)</h3>
            <span className="text-xs text-slate-500">
              Sisa kasbon lapak ini:{" "}
              <span className="font-mono font-bold tabular-nums" style={{ color: sisaDp > 0 ? "var(--brand-strong)" : "var(--muted-faint)" }}>
                {fmtRp(sisaDp)}
              </span>
            </span>
          </div>

          {sisaDp <= 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Lapak ini belum punya sisa kasbon yang disetujui, jadi tidak ada yang bisa dipotong.
            </p>
          ) : (
            <>
              <div className="relative mt-3">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-semibold text-slate-400">Rp</div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtDigitInput(dpDigunakan)}
                  onChange={(e) => setDpDigunakan(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="h-11 w-full rounded-[10px] border border-slate-200 bg-white pl-12 pr-4 font-mono text-lg font-bold tabular-nums text-slate-800 outline-none transition-[border-color,box-shadow] focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand)]/20"
                />
              </div>
              {dpAngka > 0 && (
                <p className="mt-2 text-xs font-bold" style={{ color: "var(--brand-strong)" }}>
                  ≈ {fmtSkalaRupiah(dpAngka)} rupiah
                </p>
              )}
              {dpMelebihiSaldo && (
                <p className="mt-1 text-xs font-semibold" style={{ color: "var(--danger)" }}>
                  Melebihi sisa kasbon lapak ({fmtRp(sisaDp)}).
                </p>
              )}
              {!dpMelebihiSaldo && dpMelebihiNota && (
                <p className="mt-1 text-xs font-semibold" style={{ color: "var(--danger)" }}>
                  Melebihi nilai nota setelah potongan ({fmtRp(totalEstimasiSetelahPotongan)}).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  )

  const bagianPotongan = (
    <>
      <PotonganFields
        baris={barisPotongan}
        total={totalDeductions}
        eyebrow="Opsional"
        judul="Potongan Tambahan"
        deskripsi="Isi berat (KG) dan harga per KG; nilai potongan dihitung otomatis."
      />
      {bagianKasbon}
    </>
  )

  const bagianTinjau = (
    <>
      {/* Estimasi Total */}
      {items.some(i => i.berat_estimasi > 0 && i.harga_per_kg > 0) && (
        <div className="rounded-xl border px-5 py-4" style={{ background: "var(--brand-soft)", borderColor: "var(--brand-soft-strong)" }}>
          <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
            <span className="text-sm font-medium text-slate-600">Nilai nota setelah potongan</span>
            <span className="font-mono text-base font-bold tabular-nums text-slate-800">
              {fmtRp(totalEstimasiSetelahPotongan)}
            </span>
          </div>
          {totalDeductions > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">
              Nilai kotor {fmtRp(totalNilaiEstimasi)} − potongan {fmtRp(totalDeductions)}
            </p>
          )}
          {dpAngka > 0 && (
            <div className="mt-1 flex flex-col justify-between gap-1 md:flex-row md:items-center">
              <span className="text-sm font-medium text-slate-600">Potongan kasbon</span>
              <span className="font-mono text-base font-bold tabular-nums" style={{ color: "var(--danger)" }}>
                − {fmtRp(dpAngka)}
              </span>
            </div>
          )}
          <div className="mt-3 flex flex-col justify-between gap-1 border-t pt-3 md:flex-row md:items-center" style={{ borderColor: "var(--brand-soft-strong)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--brand-strong)" }}>
              Estimasi harus dibayar ke lapak
            </span>
            <span className="font-mono text-xl font-extrabold tabular-nums" style={{ color: "var(--brand-strong)" }}>
              {fmtRp(totalDibayarKeLapak)}
            </span>
          </div>
        </div>
      )}
    </>
  )

  // Tiga langkah di ponsel (arahan Manager): menu Potongan Tambahan dan
  // langkah Tinjau dihapus. Kasbon dan total akhir yang harus dibayar kini
  // satu layar, supaya Staff melihat hasil potongan kasbonnya saat itu juga
  // dan tidak perlu membuka nota untuk tahu angka akhirnya.
  const langkahForm = [
    { judul: "Lapak & Metode", keterangan: "Pilih lapak, lalu tentukan cara timbang dan pengambilannya." },
    { judul: "Item Barang", keterangan: "Masukkan SKU, berat lapak, dan harga per kilogram." },
    { judul: "Kasbon & Total", keterangan: "Potong kasbon bila ada, lalu cek total yang harus dibayar ke lapak." },
  ]
  const isiLangkah = [
    bagianLapak,
    bagianItem,
    <div key="kasbon-total" className="space-y-4">
      {bagianKasbon}
      {bagianTinjau}
    </div>,
  ]
  const langkahTerakhir = langkahForm.length - 1

  // Validasi peramban hanya melihat isian yang sedang dipasang, yaitu isian
  // langkah yang sedang dibuka. Itu persis yang diinginkan: kesalahan
  // ditunjukkan saat meninggalkan langkahnya, bukan menumpuk di akhir.
  const majuLangkah = () => {
    if (formRef.current && !formRef.current.reportValidity()) return
    setError("")
    setLangkah((n) => Math.min(n + 1, langkahTerakhir))
  }

  return (
    <>
      {/* Nota Modal */}
      {notaData && (
        <NotaDraft data={notaData} onClose={() => setNotaData(null)} />
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="premium-workflow space-y-4 md:space-y-6"
      >
        {error && <div className="notice tone-warning text-sm font-medium">{error}</div>}

        {ponsel ? (
          <>
            <WizardLangkah
              langkah={langkah}
              total={langkahForm.length}
              judul={langkahForm[langkah].judul}
              keterangan={langkahForm[langkah].keterangan}
            />

            {isiLangkah[langkah]}

            {/* Tombol lanjut/simpan di kaki kartu form, dipisah garis tipis
                dari isian langkah (lihat .bilah-aksi di globals.css). */}
            <StickyActionBar>
              {langkah > 0 && (
                <button
                  type="button"
                  onClick={() => setLangkah((n) => Math.max(n - 1, 0))}
                  className="btn-netral rounded-[var(--radius-md)] px-4 text-sm font-bold"
                >
                  Kembali
                </button>
              )}
              {/* key berbeda WAJIB: tanpanya React memakai ulang elemen
                  <button> yang sama saat "Lanjut" berganti jadi tombol
                  submit, dan peramban menjalankan aksi bawaan klik terhadap
                  type yang sudah berubah -- klik "Lanjut" di langkah
                  sebelum terakhir langsung mengirim form dan melompati
                  langkah terakhir. */}
              {langkah < langkahTerakhir ? (
                <button
                  key="lanjut"
                  type="button"
                  onClick={majuLangkah}
                  className="btn-primer flex-1 rounded-[var(--radius-md)] px-4 text-sm font-bold"
                >
                  Lanjut
                </button>
              ) : (
                <button
                  key="simpan"
                  type="submit"
                  disabled={loading}
                  className="btn-primer flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <span className="pemuat h-4 w-4 rounded-full border-2 animate-spin" />}
                  {loading ? "Menyimpan..." : "Cetak Nota"}
                </button>
              )}
            </StickyActionBar>
          </>
        ) : (
          <>
            {bagianLapak}
            {bagianItem}
            {bagianPotongan}
            {bagianTinjau}
            <div className="pt-2">
              {/* Tombol utama memakai bentuk monokrom yang sama dengan tombol
                  Masuk: hitam, berbalik jadi putih saat disentuh. Warna hover
                  ditangani CSS, bukan penangan onMouseEnter -- selain lebih
                  ringkas, gaya inline dari penangan itu tidak ikut hilang saat
                  tombolnya menjadi disabled. */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primer flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-3.5 font-bold tracking-tight disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="pemuat h-4 w-4 rounded-full border-2 animate-spin" />
                )}
                {loading ? "Menyimpan..." : "Simpan & Buat Nota Draft"}
              </button>
            </div>
          </>
        )}
      </form>
    </>
  )
}
