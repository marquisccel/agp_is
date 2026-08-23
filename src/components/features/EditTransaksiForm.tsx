"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, PencilLine, Trash2 } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import NumberInput from "@/components/ui/NumberInput"
import StatusPill from "@/components/ui/StatusPill"
import PotonganFields, { type BarisPotongan } from "@/components/features/PotonganFields"
import { getPurchaseStatus } from "@/lib/purchaseStatusLabels"
import { SKU_LIST } from "@/lib/skuList"
import { resolveWeightForPricing } from "@/lib/purchaseCalculation"

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

const SPEC_SELECT_OPTIONS = [
  { value: "", label: "Pilih spec" },
  { value: "Gabyuk", label: "Gabyuk" },
  { value: "Grading", label: "Grading" },
]
const METODE_OPTIONS = [
  { value: "TIMBANGAN_GUDANG", label: "Timbangan Gudang" },
  { value: "TIMBANGAN_LAPAK", label: "Timbangan Lapak" },
]

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
  const status = getPurchaseStatus(initialPurchase.status_approval)

  // Nota yang sudah ditransfer ditolak oleh API. Dulu keadaan itu baru
  // ketahuan setelah seluruh form diisi dan tombol simpan ditekan --
  // formnya tampak normal, tombolnya hidup, lalu gagal di detik terakhir.
  // Sekarang dinyatakan di awal dan seluruh isian dimatikan.
  const terkunci = initialPurchase.status_approval === "sudah_transfer"

  // Basic fields
  const [nomor_nota, setNomorNota] = useState(initialPurchase.nomor_nota || "")
  const [supplierId, setSupplierId] = useState(initialPurchase.supplierId)
  const [metode, setMetode] = useState(initialPurchase.metode_pembayaran_terpilih || "TIMBANGAN_GUDANG")
  const [beratLapak, setBeratLapak] = useState(initialPurchase.berat_timbangan_lapak ?? 0)
  const [beratGudang, setBeratGudang] = useState(initialPurchase.berat_timbangan_gudang ?? 0)

  // Potongan
  const [potSampah, setPotSampah] = useState(initialPurchase.potongan_sampah ?? 0)
  const [potSusut, setPotSusut] = useState(initialPurchase.potongan_susut ?? 0)
  const [potAir, setPotAir] = useState(initialPurchase.potongan_air ?? 0)
  const [potKarung, setPotKarung] = useState(initialPurchase.potongan_karung ?? 0)

  const [beratPotSampah, setBeratPotSampah] = useState(initialPurchase.berat_potongan_sampah ?? 0)
  const [beratPotSusut, setBeratPotSusut] = useState(initialPurchase.berat_potongan_susut ?? 0)
  const [beratPotAir, setBeratPotAir] = useState(initialPurchase.berat_potongan_air ?? 0)
  const [beratPotKarung, setBeratPotKarung] = useState(initialPurchase.berat_potongan_karung ?? 0)

  // Items
  const [items, setItems] = useState<PurchaseItem[]>(
    initialPurchase.items.map(i => ({ ...i }))
  )

  /**
   * Nilai satu item, dihitung persis seperti server menghitungnya.
   *
   * Sebelumnya pratinjau di sini selalu memakai berat gudang, padahal
   * server memilih berat lapak ketika metodenya Timbangan Lapak. Untuk
   * nota lapak, angka besar di bawah layar ini berbeda dari yang akhirnya
   * tersimpan -- tanpa pemberitahuan apa pun.
   */
  const nilaiItem = (item: PurchaseItem) => {
    const gudang = Number(item.berat_final_item) || 0
    const lapak = item.berat_lapak == null ? gudang : Number(item.berat_lapak) || 0
    return resolveWeightForPricing(metode, lapak, gudang) * (Number(item.harga_per_kg) || 0)
  }

  const updateItem = (idx: number, field: keyof PurchaseItem, value: string | number | null) => {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      sku_name: SKU_LIST[0],
      spec: "Gabyuk",
      berat_lapak: null,
      berat_final_item: 0,
      harga_per_kg: 0,
      subtotal: 0,
    }])
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  /**
   * Pilihan SKU diambil dari daftar bersama, bukan ditulis ulang di sini.
   * Daftar lokal yang lama ("PET Clear", "PET Biru", ...) sama sekali tidak
   * ada di sistem: SKU yang sesungguhnya adalah "Bening FM", "BM FM", dan
   * seterusnya. Akibatnya nota yang diedit bisa berpindah ke SKU yang tidak
   * punya standar harga, sehingga kontrol harga Manager tidak pernah aktif
   * untuknya. Nilai lama yang tak dikenal tetap ditambahkan sebagai pilihan
   * supaya menyimpan ulang tidak diam-diam mengosongkan SKU-nya.
   */
  const skuOptions = (nilaiSekarang: string) => {
    const daftar: { value: string; label: string }[] = SKU_LIST.map(sku => ({ value: sku as string, label: sku as string }))
    if (nilaiSekarang && !SKU_LIST.some(sku => sku === nilaiSekarang)) {
      daftar.unshift({ value: nilaiSekarang, label: `${nilaiSekarang} (di luar daftar)` })
    }
    return daftar
  }

  // Computed totals
  const totalBeforeCuts = items.reduce((s, i) => s + nilaiItem(i), 0)
  const hargaPotSampah = beratPotSampah * potSampah
  const hargaPotSusut = beratPotSusut * potSusut
  const hargaPotAir = beratPotAir * potAir
  const hargaPotKarung = beratPotKarung * potKarung
  const totalPotongan = hargaPotSampah + hargaPotSusut + hargaPotAir + hargaPotKarung
  const totalAfterCuts = totalBeforeCuts - totalPotongan

  const barisPotongan: BarisPotongan[] = [
    { kunci: 'sampah', nama: 'Sampah',          berat: beratPotSampah, setBerat: setBeratPotSampah, harga: potSampah,  setHarga: setPotSampah,  nilai: hargaPotSampah },
    { kunci: 'susut',  nama: 'Susut Timbangan', berat: beratPotSusut,  setBerat: setBeratPotSusut,  harga: potSusut,   setHarga: setPotSusut,   nilai: hargaPotSusut  },
    { kunci: 'air',    nama: 'Kadar Air',       berat: beratPotAir,    setBerat: setBeratPotAir,    harga: potAir,     setHarga: setPotAir,     nilai: hargaPotAir    },
    { kunci: 'karung', nama: 'Potongan Karung', berat: beratPotKarung, setBerat: setBeratPotKarung, harga: potKarung,  setHarga: setPotKarung,  nilai: hargaPotKarung },
  ]

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
          items: items.map(i => ({ ...i, subtotal: nilaiItem(i) })),
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="premium-workflow space-y-6">
      {/* Aturan pengeditan dinyatakan sekali di atas, lengkap dengan status
          nota apa adanya -- bukan lencana kuning tetap yang dulu memberi
          kesan semua nota sedang menunggu sesuatu. */}
      <div className={`notice ${terkunci ? "tone-warning" : "tone-info"}`}>
        <div className="notice-icon">
          {terkunci ? <Lock className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="notice-title">{terkunci ? "Nota terkunci" : "Mode koreksi"}</p>
            <StatusPill label={status.label} tone={status.tone} />
          </div>
          <p className="notice-body">
            {terkunci
              ? "Pembayaran sudah ditransfer, jadi angkanya tidak bisa diubah lagi. Koreksi harus lewat jalur audit."
              : "Perubahan disimpan tanpa mengubah status nota."}
          </p>
          <p className="notice-foot">Setiap perubahan tercatat di audit log beserta nama pengubahnya.</p>
        </div>
      </div>

      {/* Informasi Dasar */}
      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Identitas</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Informasi Dasar</h3>
          </div>
        </div>
        <div className="section-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="field-label">No. Nota</label>
              <input
                type="text"
                value={nomor_nota}
                onChange={e => setNomorNota(e.target.value)}
                placeholder="Kosongkan jika tidak ada"
                className="field-input"
                disabled={terkunci}
              />
            </div>

            <div>
              <label className="field-label">Lapak / Supplier</label>
              <ElegantSelect
                value={supplierId}
                options={supplierOptions}
                onChange={setSupplierId}
                ariaLabel="Pilih lapak atau supplier"
                className="w-full"
                disabled={terkunci}
              />
            </div>

            <div>
              <label className="field-label">Metode Pembayaran</label>
              <ElegantSelect
                value={metode}
                options={METODE_OPTIONS}
                onChange={setMetode}
                ariaLabel="Pilih metode pembayaran"
                className="w-full"
                disabled={terkunci}
              />
            </div>

            <div>
              <label className="field-label">Berat Timbangan Lapak (KG)</label>
              <NumberInput
                aria-label="Berat timbangan lapak"
                placeholder="0"
                className="field-input"
                value={beratLapak}
                onValueChange={setBeratLapak}
                disabled={terkunci}
              />
            </div>

            <div>
              <label className="field-label">Berat Timbangan Gudang (KG)</label>
              <NumberInput
                aria-label="Berat timbangan gudang"
                placeholder="0"
                className="field-input"
                value={beratGudang}
                onValueChange={setBeratGudang}
                disabled={terkunci}
              />
            </div>
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--muted-faint)" }}>
            Metode pembayaran menentukan berat mana yang dipakai sebagai dasar harga:{" "}
            <strong style={{ color: "var(--foreground)" }}>
              {metode === "TIMBANGAN_LAPAK" ? "berat lapak" : "berat gudang"}
            </strong>.
          </p>
        </div>
      </div>

      {/* Item Pembelian */}
      <div className="section overflow-hidden">
        <div className="section-shell-head">
          <div>
            <span className="section-eyebrow">Rincian</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Item Pembelian</h3>
          </div>
          <button
            onClick={addItem}
            disabled={terkunci}
            className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            + Tambah Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="tabel-lembut min-w-full text-sm">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Spec</th>
                <th className="!text-right">Berat Final (KG)</th>
                <th className="!text-right">Harga/KG (Rp)</th>
                <th className="!text-right">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id ?? idx}>
                  <td className="min-w-[180px]">
                    <ElegantSelect
                      value={item.sku_name}
                      options={skuOptions(item.sku_name)}
                      onChange={(value) => updateItem(idx, "sku_name", value)}
                      ariaLabel={`Pilih SKU item ${idx + 1}`}
                      className="w-full"
                      disabled={terkunci}
                    />
                  </td>
                  <td className="min-w-[130px]">
                    <ElegantSelect
                      value={item.spec || ""}
                      options={SPEC_SELECT_OPTIONS}
                      onChange={(value) => updateItem(idx, "spec", value || null)}
                      ariaLabel={`Pilih spec item ${idx + 1}`}
                      className="w-full"
                      disabled={terkunci}
                    />
                  </td>
                  <td>
                    <NumberInput
                      aria-label={`Berat final item ${idx + 1}`}
                      value={item.berat_final_item}
                      onValueChange={(n) => updateItem(idx, "berat_final_item", n)}
                      className="field-input text-right"
                      disabled={terkunci}
                    />
                  </td>
                  <td>
                    <NumberInput
                      aria-label={`Harga per KG item ${idx + 1}`}
                      value={item.harga_per_kg}
                      onValueChange={(n) => updateItem(idx, "harga_per_kg", n)}
                      className="field-input text-right"
                      disabled={terkunci}
                    />
                  </td>
                  <td className="whitespace-nowrap text-right font-bold" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
                    {fmtRp(nilaiItem(item))}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1 || terkunci}
                      className="btn-netral tone-danger rounded-[var(--radius-sm)] p-2 disabled:opacity-30"
                      title="Hapus item"
                      aria-label={`Hapus item ${idx + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="flex items-center justify-between gap-4 border-t px-5 py-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
        >
          <span className="field-label" style={{ marginBottom: 0 }}>Total Sebelum Potongan</span>
          <span className="text-base font-extrabold" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
            {fmtRp(totalBeforeCuts)}
          </span>
        </div>
      </div>

      {/* Total transaksi dulu berdiri sebagai kartu tersendiri tepat di
          bawah kartu Potongan. Keduanya bicara hal yang sama -- berapa yang
          dipotong dan berapa sisanya -- jadi memisahkannya cuma menambah
          satu tepi kartu di antara sebab dan akibatnya. */}
      <PotonganFields
        kartu
        readOnly={terkunci}
        baris={barisPotongan}
        total={totalPotongan}
        eyebrow="Koreksi"
        judul="Potongan"
        deskripsi="Berat (KG) dikali harga per KG; nilai potongan dihitung otomatis."
        kaki={
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <span className="section-eyebrow">Nilai transaksi</span>
              <p className="mt-1 text-3xl font-extrabold" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
                {fmtRp(totalAfterCuts)}
              </p>
            </div>
            <div className="space-y-0.5 text-left text-xs font-medium sm:text-right" style={{ color: "var(--muted)" }}>
              <p>Sebelum potongan: {fmtRp(totalBeforeCuts)}</p>
              <p>Total potongan: &minus; {fmtRp(totalPotongan)}</p>
            </div>
          </div>
        }
      />

      {/* Ringkasan */}

      {error && <div className="notice tone-warning text-sm font-medium">{error}</div>}
      {success && (
        <div
          className="rounded-[var(--radius-md)] border p-4 text-sm font-medium"
          style={{ borderColor: "var(--success-soft)", background: "var(--success-soft)", color: "var(--success)" }}
        >
          Transaksi berhasil diperbarui. Mengarahkan kembali...
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.push(backUrl)}
          className="btn-netral premium-button px-6 py-2.5 text-sm"
        >
          Kembali
        </button>
        <button
          onClick={handleSave}
          disabled={saving || success || terkunci}
          className="btn-primer premium-button flex items-center gap-2 rounded-[var(--radius-sm)] px-8 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="pemuat h-4 w-4 animate-spin rounded-full border-2" />
              Menyimpan...
            </>
          ) : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  )
}
