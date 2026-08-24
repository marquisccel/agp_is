"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Purchase, PurchaseItem, Supplier, User } from "@prisma/client"
import ElegantSelect from "@/components/ui/ElegantSelect"
import PotonganFields, { type BarisPotongan } from "@/components/features/PotonganFields"
import NumberInput from "@/components/ui/NumberInput"
import { fmtRp } from "@/lib/format"
import BatasHargaSku, { batasHargaSku, type StandarHargaSku } from "@/components/features/BatasHargaSku"

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
  standarHarga = [],
  successRedirect = "/dashboard/admin",
}: {
  purchase: PurchaseForDoubleCheck
  availableDp: number
  standarHarga?: StandarHargaSku[]
  successRedirect?: string
}) {
  const router = useRouter()

  const staffLapakSum = purchase.berat_timbangan_lapak || purchase.items.reduce((sum, item) => sum + (item.berat_final_item || 0), 0)

  const [timbanganLapak] = useState(staffLapakSum)
  /*
   * Timbangan gudang sengaja dimulai KOSONG.
   *
   * Sebelumnya kolom ini -- dan kolom berat per SKU di bawah -- diisi
   * lebih dulu dengan angka dari Staff. Padahal saat draft dibuat, satu
   * angka yang diketik Staff ditulis ke DUA kolom sekaligus (berat_lapak
   * dan berat_final_item). Jadi begitu Admin menyimpan tanpa mengubah
   * apa pun, kedua kolom tetap sama, selisihnya nol, dan nota melaporkan
   * "Sesuai" untuk kecocokan yang tidak pernah benar-benar ditimbang.
   *
   * Verifikasi gudang hanya berarti kalau angkanya datang dari timbangan
   * gudang, bukan dari salinan angka lapak. Karena kolomnya wajib diisi,
   * mengosongkannya memaksa angka itu benar-benar dimasukkan.
   */
  const [timbanganGudang, setTimbanganGudang] = useState(purchase.berat_timbangan_gudang || 0)
  const [metodeBayar, setMetodeBayar] = useState(purchase.metode_pembayaran_terpilih || "TIMBANGAN_GUDANG")
  const [persentasePembayaran, setPersentasePembayaran] = useState<number>(purchase.persentase_pembayaran || 100)

  // Initialize items from draft
  const [items, setItems] = useState<WorkingItem[]>(purchase.items.map((i) => ({
    ...i,
    berat_lapak: i.berat_lapak ?? i.berat_final_item, // Timbangan lapak staff
    berat_final_item: 0, // Timbangan gudang; wajib diisi Admin, lihat catatan di atas
  })))

  // Returs -- transaksi pada tahap ini selalu menunggu_verifikasi (belum pernah
  // melalui double-check), jadi belum mungkin ada retur tersimpan sebelumnya.
  const [returs, setReturs] = useState<ReturInput[]>([])
  const dpDigunakan = purchase.dp_yang_digunakan || 0

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

  // Bentuk baris yang sama dipakai PurchaseForm; markup-nya ada di
  // PotonganFields supaya kedua layar tidak lagi bisa saling melenceng.
  const barisPotongan: BarisPotongan[] = [
    { kunci: 'sampah', nama: 'Sampah',          berat: beratPotonganSampah, setBerat: setBeratPotonganSampah, harga: hargaPotonganSampah, setHarga: setHargaPotonganSampah, nilai: potonganSampah },
    { kunci: 'susut',  nama: 'Susut Timbangan', berat: beratPotonganSusut,  setBerat: setBeratPotonganSusut,  harga: hargaPotonganSusut,  setHarga: setHargaPotonganSusut,  nilai: potonganSusut },
    { kunci: 'air',    nama: 'Kadar Air',       berat: beratPotonganAir,    setBerat: setBeratPotonganAir,    harga: hargaPotonganAir,    setHarga: setHargaPotonganAir,    nilai: potonganAir },
    { kunci: 'karung', nama: 'Potongan Karung', berat: beratPotonganKarung, setBerat: setBeratPotonganKarung, harga: hargaPotonganKarung, setHarga: setHargaPotonganKarung, nilai: potonganKarung },
  ]

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

    try {
      const payload = {
        berat_timbangan_lapak: timbanganLapak,
        berat_timbangan_gudang: timbanganGudang,
        metode_pembayaran_terpilih: metodeBayar,
        items,
        returs,
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

  /* Selisihnya dulu dihitung ulang sepuluh kali di dalam JSX, masing-masing
     dengan rangkaian ternary warnanya sendiri. */
  const adaHargaDiAtasBatas = items.some((i) => {
    const batas = batasHargaSku(i.sku_name, standarHarga)
    return batas !== null && i.harga_per_kg > batas
  })

  const beratGudangBelumLengkap = timbanganGudang <= 0 || items.some((i) => !i.berat_final_item || i.berat_final_item <= 0)

  const selisihTimbangan = timbanganGudang - timbanganLapak
  const warnaSelisih =
    selisihTimbangan === 0 ? "var(--foreground)" : selisihTimbangan < 0 ? "var(--danger)" : "var(--warning)"
  const latarSelisih =
    selisihTimbangan === 0 ? "var(--bg-tint)" : selisihTimbangan < 0 ? "var(--danger-soft)" : "var(--warning-soft)"

  return (
    <form onSubmit={handleSubmit} className="premium-workflow space-y-8">
      {error && <div className="notice tone-warning text-sm font-medium">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border p-6" style={{ background: "var(--surface-sunken)", borderColor: "var(--border)" }}>
            <div className="mb-4">
              <span className="section-eyebrow">Verifikasi</span>
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Data Timbangan</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--muted-faint)" }}>
                Isi hasil timbangan gudang apa adanya. Kolomnya sengaja kosong supaya angkanya benar-benar dari
                timbangan gudang, bukan salinan angka lapak.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="field-label">Metode Pembayaran Final</label>
                <ElegantSelect
                  value={metodeBayar}
                  options={METODE_BAYAR_OPTIONS}
                  onChange={setMetodeBayar}
                  ariaLabel="Pilih metode pembayaran final"
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="field-label">Persentase Pembayaran (Termin)</label>
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
                  <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Timbangan Lapak (KG)
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>Staff</span>
                  </label>
                  <input
                    type="number" step="0.01" readOnly disabled
                    className="field-input mt-1"
                    value={timbanganLapak || 0}
                  />
                </div>
                <div>
                  <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Timbangan Gudang (KG)
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>Gudang</span>
                  </label>
                  {/* Dulu type="number" dengan parseFloat(v)||0 -- pola
                      yang membuat "0,5" tercatat 5. Berat di sini dikali
                      harga per kg, jadi salah ketiknya langsung jadi salah
                      rupiah di nota. */}
                  <NumberInput
                    step="0.01"
                    required
                    aria-label="Timbangan gudang"
                    className="field-input mt-1"
                    value={timbanganGudang}
                    onValueChange={setTimbanganGudang}
                  />
                </div>
              </div>

              {/* Real-time comparison badge/panel */}
              {timbanganLapak > 0 && (
                <div
                  className="mt-4 flex flex-col gap-2 rounded-[var(--radius-md)] border p-4 shadow-sm"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <span className="field-label">Hasil Perbandingan Timbangan</span>
                  {/* Nadanya diluruskan dengan Analisis Susut dan Detail
                      Transaksi: gudang menimbang LEBIH berat dari lapak
                      bukan kabar baik, melainkan selisih yang perlu
                      diperiksa (timbangan belum ditera, atau salah catat).
                      Di sini dulu berwarna hijau merek dan berbunyi
                      "bertambah", seolah gudang mendapat untung. Selisih
                      nol juga tidak lagi dirayakan hijau -- itu keadaan
                      yang memang diharapkan. */}
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <div className="text-xs" style={{ color: "var(--muted-faint)" }}>Selisih Timbangan</div>
                      <div className="font-mono text-lg font-bold" style={{ color: warnaSelisih }}>
                        {selisihTimbangan > 0 ? `+${selisihTimbangan.toFixed(2)}` : selisihTimbangan.toFixed(2)} KG
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "var(--muted-faint)" }}>Persentase Selisih</div>
                      <div className="font-mono text-lg font-bold" style={{ color: warnaSelisih }}>
                        {timbanganLapak > 0 ? ((selisihTimbangan / timbanganLapak) * 100).toFixed(1) : "0"}%
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-2 rounded-[var(--radius-sm)] px-3 py-2 text-center text-xs font-semibold"
                    style={{ background: latarSelisih, color: warnaSelisih }}
                  >
                    {selisihTimbangan === 0
                      ? "Timbangan lapak dan gudang cocok."
                      : selisihTimbangan < 0
                        ? `Susut ${Math.abs(selisihTimbangan).toFixed(2)} KG dibanding timbangan lapak. Periksa sebelum melanjutkan.`
                        : `Lebih ${selisihTimbangan.toFixed(2)} KG dibanding timbangan lapak. Periksa sebelum melanjutkan.`}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border p-6" style={{ background: "var(--surface-sunken)", borderColor: "var(--border)" }}>
            <div className="mb-4">
              <span className="section-eyebrow">Rincian</span>
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Finalisasi Item per SKU</h3>
              <p className="mt-1 text-xs" style={{ color: "var(--muted-faint)" }}>Admin menginput kembali hasil timbangan gudang untuk setiap SKU yang masuk dari data staff.</p>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => {
                const lapakWeight = item.berat_lapak ?? item.berat_final_item ?? 0
                const gudangWeight = item.berat_final_item ?? 0
                const diff = gudangWeight - lapakWeight

                return (
                  <div key={idx} className="space-y-3 rounded-[var(--radius-md)] border p-4 shadow-sm transition-all hover:shadow-md" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex flex-col justify-between gap-2 border-b pb-2 sm:flex-row sm:items-center" style={{ borderColor: "var(--border)" }}>
                      <div>
                        <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{item.sku_name}</span>
                        {/* Spec itu kategori penyortiran, bukan keadaan
                            baik-buruk; sama seperti di Detail Transaksi. */}
                        {item.spec && (
                          <span className="ml-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>
                            {item.spec}
                          </span>
                        )}
                        {/* Harga yang diketik Staff ikut ditampilkan: Admin
                            tidak mengubahnya di sini, tapi harga itulah yang
                            menentukan notanya lolos atau naik ke Manager. */}
                        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                          Harga {fmtRp(item.harga_per_kg)}/kg
                        </p>
                        <BatasHargaSku skuName={item.sku_name} harga={item.harga_per_kg} standar={standarHarga} />
                      </div>

                      {/* SKU Delta indicator */}
                      {/* Selisihnya baru berarti setelah berat gudangnya
                          diisi. Karena kolomnya kini mulai kosong, tanpa
                          penjagaan ini tiap item langsung melaporkan
                          "Susut -100%" -- peringatan atas angka yang belum
                          dimasukkan. */}
                      {gudangWeight <= 0 ? (
                        <span className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted-faint)" }}>
                          Menunggu timbangan gudang
                        </span>
                      ) : diff !== 0 ? (
                        <span
                          className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-xs font-bold"
                          style={diff < 0
                            ? { background: "var(--danger-soft)", color: "var(--danger)" }
                            : { background: "var(--warning-soft)", color: "var(--warning)" }}
                        >
                          {diff < 0
                            ? `Susut ${diff.toFixed(2)} KG (${((diff / lapakWeight) * 100).toFixed(1)}%)`
                            : `Lebih +${diff.toFixed(2)} KG (+${((diff / lapakWeight) * 100).toFixed(1)}%)`}
                        </span>
                      ) : (
                        <span className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--bg-tint)", color: "var(--muted)" }}>
                          Cocok
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Read-only Lapak Weight */}
                      <div className="space-y-1">
                        <label className="field-label">
                          Timbangan Lapak (Staff)
                        </label>
                        <div className="field-input font-mono font-bold" style={{ color: "var(--muted)", cursor: "not-allowed" }}>
                          {lapakWeight.toFixed(2)} KG
                        </div>
                      </div>

                      {/* Admin input for Warehouse Weight */}
                      <div className="space-y-1">
                        <label className="field-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          Timbangan Gudang (Admin)
                          <span className="font-bold" style={{ color: "var(--danger)" }}>*</span>
                        </label>
                        <div className="relative">
                          <NumberInput
                            step="0.01"
                            required
                            placeholder="0.00"
                            className="field-input pr-10 font-mono font-bold"
                            value={item.berat_final_item}
                            onValueChange={(n) => updateItem(idx, n)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--muted-faint)" }}>
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
          {/* Seluruh blok ini dulu berlatar kuning dengan tepi oranye,
              padahal retur adalah pencatatan biasa yang paling sering
              kosong. Yang selalu menyala kuning berhenti berarti
              peringatan. Nada perhatian kini hanya melekat pada angka
              potongannya. */}
          <div className="rounded-[var(--radius-lg)] border p-6" style={{ background: "var(--surface-sunken)", borderColor: "var(--border)" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="section-eyebrow">Koreksi</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Retur / Potongan</h3>
              </div>
              <button type="button" onClick={addRetur} className="btn-netral premium-button px-3 py-1.5 text-xs">
                + Tambah Retur
              </button>
            </div>

            {returs.length === 0 ? (
              <p className="text-sm italic" style={{ color: "var(--muted-faint)" }}>Tidak ada retur.</p>
            ) : (
              <div className="space-y-4">
                {returs.map((retur, idx) => {
                  const relatedItem = items.find((i) => i.sku_name === retur.sku_name);
                  const hargaItem = relatedItem ? relatedItem.harga_per_kg : 0;
                  const autoDeduction = (retur.berat_retur || 0) * hargaItem;
                  const rowTotal = autoDeduction + (retur.potongan_nilai || 0);

                  return (
                  <div key={idx} className="relative space-y-3 rounded-[var(--radius-md)] border p-4 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <button type="button" onClick={() => removeRetur(idx)} className="absolute right-2 top-2" style={{ color: "var(--danger)" }} aria-label={`Hapus retur ${idx + 1}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="field-label">SKU (Barang Dikembalikan)</label>
                        <ElegantSelect
                          value={retur.sku_name}
                          options={[{ value: "", label: "Pilih SKU" }, ...items.map((i) => ({ value: i.sku_name, label: i.sku_name }))]}
                          onChange={(value) => updateRetur(idx, 'sku_name', value)}
                          ariaLabel="Pilih SKU retur"
                          className="mt-1 w-full"
                        />
                      </div>
                      <div>
                        <label className="field-label">Alasan Retur</label>
                        <input type="text" className="field-input mt-1" placeholder="Basah, kotor..." value={retur.alasan} onChange={e => updateRetur(idx, 'alasan', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 border-t pt-2 sm:grid-cols-3" style={{ borderColor: "var(--border)" }}>
                      <div>
                        <label className="field-label">1. Potong Berat (KG)</label>
                        <NumberInput step="0.01" className="field-input mt-1" aria-label={`Berat retur ${idx + 1}`} value={retur.berat_retur || 0} onValueChange={(n) => updateRetur(idx, 'berat_retur', n)} />
                        {retur.sku_name && <span className="mt-1 block text-[10px]" style={{ color: "var(--muted)" }}>x Rp {hargaItem.toLocaleString('id-ID')} / KG = <strong className="font-mono">Rp {autoDeduction.toLocaleString('id-ID')}</strong></span>}
                      </div>
                      <div>
                        <label className="field-label">2. Penalti Ekstra (Flat Rp)</label>
                        <NumberInput className="field-input mt-1" placeholder="0" aria-label={`Penalti ekstra retur ${idx + 1}`} value={retur.potongan_nilai || 0} onValueChange={(n) => updateRetur(idx, 'potongan_nilai', n)} />
                        <span className="mt-1 block text-[10px]" style={{ color: "var(--muted-faint)" }}>Kosongkan jika tidak ada penalti tambahan</span>
                      </div>
                      <div className="flex flex-col items-end justify-center rounded-[var(--radius-sm)] border p-2" style={{ background: "var(--warning-soft)", borderColor: "var(--warning-soft)" }}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subtotal Retur Ini</span>
                        <span className="text-base font-extrabold" style={{ color: "var(--danger)" }}>-Rp {rowTotal.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          <PotonganFields
            baris={barisPotongan}
            total={totalDeductions}
            eyebrow="Verifikasi"
            judul="Potongan Spesifik"
            deskripsi="Tinjau atau sesuaikan potongan sampah, susut timbangan, kadar air, dan karung."
          />

          {/* Potongan kasbon hanya ditampilkan, tidak bisa diubah di sini:
              saldo kasbon sudah terpotong saat Staff membuat nota. Kalau
              Admin bisa mengubahnya, saldo lapak akan terpotong dua kali dan
              angka di nota yang sudah dipegang lapak jadi tidak cocok. */}
          <div className="rounded-[var(--radius-lg)] border p-6" style={{ background: "var(--surface-sunken)", borderColor: "var(--border)" }}>
            <h3 className="text-lg font-bold text-slate-800">Potongan Kasbon (DP)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Sudah dipotong saat Staff membuat nota. Nilainya tidak bisa diubah di tahap ini.
            </p>
            <p className="mt-4 font-mono text-2xl font-extrabold tabular-nums" style={{ color: dpDigunakan > 0 ? "var(--brand-strong)" : "var(--muted-faint)" }}>
              {dpDigunakan > 0 ? `Rp ${dpDigunakan.toLocaleString("id-ID")}` : "Tidak ada potongan kasbon"}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Sisa kasbon lapak saat ini: <span className="font-mono font-semibold">Rp {availableDp.toLocaleString("id-ID")}</span>
            </p>
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
            <span className="text-base font-bold" style={{ color: totalRetur > 0 ? "var(--danger)" : "var(--muted-faint)", fontVariantNumeric: "tabular-nums" }}>-Rp {totalRetur.toLocaleString('id-ID')}</span>
          </div>
          <div className="workflow-stat p-3.5">
            <span className="text-xs font-semibold block text-slate-500">Potongan Spesifik (Sampah, Susut, Air, Karung)</span>
            <span className="text-base font-bold" style={{ color: totalDeductions > 0 ? "var(--danger)" : "var(--muted-faint)", fontVariantNumeric: "tabular-nums" }}>-Rp {totalDeductions.toLocaleString('id-ID')}</span>
          </div>
          <div className="workflow-stat p-3.5">
            <span className="text-xs font-semibold block text-slate-500">Potongan DP Terpakai</span>
            <span className="text-base font-bold" style={{ color: dpDigunakan > 0 ? "var(--danger)" : "var(--muted-faint)", fontVariantNumeric: "tabular-nums" }}>-Rp {dpDigunakan.toLocaleString('id-ID')}</span>
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
          <div
            className="mt-4 flex flex-col gap-2 rounded-[var(--radius-md)] border p-4"
            style={{ background: "var(--warning-soft)", borderColor: "var(--warning-soft)" }}
          >
            <span className="field-label font-sans" style={{ color: "var(--warning)" }}>Kalkulasi Termin {persentasePembayaran}%</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 block font-sans">Pembayaran Awal ({persentasePembayaran}%)</span>
                <span className="text-lg font-bold text-slate-800 font-mono">Rp {nominalPembayaranAwal.toLocaleString('id-ID')}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-sans">Sisa Pelunasan ({100 - persentasePembayaran}%)</span>
                <span className="font-mono text-lg font-bold" style={{ color: "var(--warning)" }}>Rp {nominalBelumLunas.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <p className="mt-1 font-sans text-[10px] font-semibold italic" style={{ color: "var(--warning)" }}>
              * Sisa ini tercatat sebagai utang ke lapak dan muncul sebagai pengingat di dashboard.
            </p>
          </div>
        )}
      </div>

      {/* Kalau ada harga yang melewati batas, notanya TIDAK langsung
          disetujui. Dulu itu baru ketahuan setelah tombol simpan ditekan
          dan statusnya ternyata bukan "approved" -- dari layar ini terbaca
          seperti sistem menolak tanpa sebab. */}
      {adaHargaDiAtasBatas && (
        <div className="notice tone-warning text-sm">
          <div className="notice-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <p className="notice-title">Ada harga di atas batas</p>
            <p className="notice-body">
              Verifikasi tetap bisa disimpan, tapi notanya akan menunggu persetujuan harga dari Manager, bukan langsung
              disetujui.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4 border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <button type="button" onClick={() => router.back()} className="btn-netral premium-button px-6 py-3">
          Batal
        </button>
        {/* Warna dan hover-nya dulu ditulis inline lewat onMouseEnter,
            sehingga tombol ini satu-satunya yang tidak ikut .btn-primer --
            hover-nya menggelap, bukan berbalik jadi putih seperti tombol
            utama di halaman lain. */}
        <button
          type="submit"
          disabled={loading || beratGudangBelumLengkap}
          title={beratGudangBelumLengkap ? "Isi dulu seluruh hasil timbangan gudang" : undefined}
          className="btn-primer premium-button rounded-[var(--radius-sm)] px-8 py-3 font-bold disabled:opacity-70"
        >
          {loading ? "Menyimpan..." : "Simpan Verifikasi"}
        </button>
      </div>
    </form>
  )
}
