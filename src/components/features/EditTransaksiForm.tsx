"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, PencilLine, Trash2 } from "lucide-react"
import ElegantSelect from "@/components/ui/ElegantSelect"
import NumberInput from "@/components/ui/NumberInput"
import StatusPill from "@/components/ui/StatusPill"
import PotonganFields, { type BarisPotongan } from "@/components/features/PotonganFields"
import { getPurchaseStatus } from "@/lib/purchaseStatusLabels"
import { SKU_LIST } from "@/lib/skuList"
import { fmtDigitInput, fmtSkalaRupiah } from "@/lib/format"
import { resolveWeightForPricing } from "@/lib/purchaseCalculation"

interface PurchaseItem {
  id?: string
  sku_name: string
  spec: string | null
  berat_lapak: number | null
  berat_final_item: number
  harga_per_kg: number
  subtotal: number
  /** Dibawa terus ke server supaya rincian timbangan gudang tidak hilang saat edit. */
  rincian_timbangan?: unknown
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
  dp_yang_digunakan?: number | null
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
  sebagaiStaff = false,
}: {
  purchase: Purchase
  suppliers: Supplier[]
  backUrl?: string
  /**
   * Staff membetulkan notanya sendiri (arahan Manager 10 Okt 2026): kartu
   * Potongan disembunyikan, lapak dan nomor nota dikunci. Penguncian yang
   * sebenarnya ada di rute API; di sini hanya agar layarnya jujur.
   */
  sebagaiStaff?: boolean
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.nama }))
  const status = getPurchaseStatus(initialPurchase.status_approval)

  // Nota draft belum ditimbang gudang: berat final = berat lapak yang diketik
  // Staff. Kolom Berat Final disembunyikan dan dijaga searah di updateItem;
  // server menegakkan hal yang sama.
  const draftStaff = sebagaiStaff && initialPurchase.status_approval === "menunggu_verifikasi"

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

  // Potongan. Di basis data, potongan_X adalah NILAI potongan (berat x harga),
  // sedangkan berat_potongan_X dan harga_potongan_X adalah masukannya --
  // begitu juga yang ditulis pembuatan nota dan verifikasi gudang. Form ini
  // dulu membaca potongan_X sebagai harga per KG, sehingga nota yang tidak
  // diubah pun menampilkan potongan yang salah (mis. Rp 1.000 padahal tidak
  // ada) dan menyimpannya kembali dengan makna yang tertukar.
  //
  // Data lama yang harga_potongan_X-nya kosong tetapi nilainya ada
  // diturunkan balik supaya nilainya tidak hilang saat disimpan ulang.
  const awalPotongan = (nilai: number | null, berat: number | null, harga: number | null) => {
    const n = nilai ?? 0
    const b = berat ?? 0
    const h = harga ?? 0
    if (h > 0 || n <= 0) return { berat: b, harga: h }
    return b > 0 ? { berat: b, harga: n / b } : { berat: 1, harga: n }
  }
  const awalSampah = awalPotongan(initialPurchase.potongan_sampah, initialPurchase.berat_potongan_sampah, initialPurchase.harga_potongan_sampah)
  const awalSusut = awalPotongan(initialPurchase.potongan_susut, initialPurchase.berat_potongan_susut, initialPurchase.harga_potongan_susut)
  const awalAir = awalPotongan(initialPurchase.potongan_air, initialPurchase.berat_potongan_air, initialPurchase.harga_potongan_air)
  const awalKarung = awalPotongan(initialPurchase.potongan_karung, initialPurchase.berat_potongan_karung, initialPurchase.harga_potongan_karung)

  const [potSampah, setPotSampah] = useState(awalSampah.harga)
  const [potSusut, setPotSusut] = useState(awalSusut.harga)
  const [potAir, setPotAir] = useState(awalAir.harga)
  const [potKarung, setPotKarung] = useState(awalKarung.harga)

  const [beratPotSampah, setBeratPotSampah] = useState(awalSampah.berat)
  const [beratPotSusut, setBeratPotSusut] = useState(awalSusut.berat)
  const [beratPotAir, setBeratPotAir] = useState(awalAir.berat)
  const [beratPotKarung, setBeratPotKarung] = useState(awalKarung.berat)

  // Kasbon (DP) yang dipakai nota ini. Digit mentah; pemisah ribuan hanya
  // tampilan. Saldo lapak diambil sekali untuk membatasi nominalnya.
  const dpAwal = initialPurchase.dp_yang_digunakan ?? 0
  const [dpDigunakan, setDpDigunakan] = useState(dpAwal > 0 ? String(Math.round(dpAwal)) : "")
  const [sisaDpMap, setSisaDpMap] = useState<Record<string, number>>({})
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
      next[idx] = {
        ...next[idx],
        [field]: value,
        ...(draftStaff && field === "berat_lapak" ? { berat_final_item: Number(value) || 0 } : {}),
      }
      return next
    })
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      sku_name: SKU_LIST[0],
      spec: "Gabyuk",
      berat_lapak: sebagaiStaff ? 0 : null,
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
  // Staff tidak mengedit potongan, jadi totalnya memakai nilai yang tersimpan
  // (sama dengan yang dipakai server); Admin/Manager memakai hasil isian.
  const totalPotongan = sebagaiStaff
    ? (initialPurchase.potongan_sampah ?? 0) + (initialPurchase.potongan_susut ?? 0) + (initialPurchase.potongan_air ?? 0) + (initialPurchase.potongan_karung ?? 0)
    : hargaPotSampah + hargaPotSusut + hargaPotAir + hargaPotKarung
  const totalAfterCuts = totalBeforeCuts - totalPotongan

  const dpAngka = dpDigunakan ? Number(dpDigunakan) : 0
  // Saldo yang tersedia = saldo lapak sekarang + DP yang sudah terpotong oleh
  // nota ini (akan dikembalikan sebelum dipotong ulang). Berlaku hanya bila
  // lapaknya tidak diganti.
  const sisaDp = (sisaDpMap[supplierId] ?? 0) + (supplierId === initialPurchase.supplierId ? dpAwal : 0)
  const tampilkanKasbon = sisaDp > 0 || dpAwal > 0
  const dpMelebihiSaldo = dpAngka > sisaDp + 0.01
  const dpMelebihiNota = dpAngka > Math.max(totalAfterCuts, 0) + 0.01
  const barisKasbon = dpAngka > 0 ? (
    <div className="mt-4 flex items-baseline justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        Potongan kasbon (DP) &minus; {fmtRp(dpAngka)}
      </span>
      <span className="text-right text-sm font-extrabold" style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
        Dibayar ke lapak {fmtRp(Math.max(totalAfterCuts - dpAngka, 0))}
      </span>
    </div>
  ) : null
  const rincianPotongan = sebagaiStaff
    ? [
        { nama: "Sampah", nilai: initialPurchase.potongan_sampah ?? 0 },
        { nama: "Susut Timbangan", nilai: initialPurchase.potongan_susut ?? 0 },
        { nama: "Kadar Air", nilai: initialPurchase.potongan_air ?? 0 },
        { nama: "Karung", nilai: initialPurchase.potongan_karung ?? 0 },
      ].filter(r => r.nilai > 0)
    : []

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
    if (tampilkanKasbon && dpMelebihiSaldo) {
      setError(`DP yang digunakan melebihi sisa kasbon lapak (${fmtRp(sisaDp)}).`)
      return
    }
    if (tampilkanKasbon && dpMelebihiNota) {
      setError("DP yang digunakan tidak boleh melebihi nilai nota setelah potongan.")
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
          dp_yang_digunakan: tampilkanKasbon ? dpAngka : undefined,
          potongan_sampah:  hargaPotSampah,  berat_potongan_sampah: beratPotSampah,  harga_potongan_sampah: potSampah,
          potongan_susut:   hargaPotSusut,   berat_potongan_susut:  beratPotSusut,   harga_potongan_susut:  potSusut,
          potongan_air:     hargaPotAir,     berat_potongan_air:    beratPotAir,     harga_potongan_air:    potAir,
          potongan_karung:  hargaPotKarung,  berat_potongan_karung: beratPotKarung,  harga_potongan_karung: potKarung,
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
      {/* Ikon dan status nota, lalu satu baris keterangan jejak audit
          (arahan Manager 11 Okt 2026; judul "Mode koreksi" dan kalimat
          penjelasnya dihapus). Nota yang sudah transfer tetap diberi alasan,
          karena seluruh isiannya mati dan tanpa keterangan itu terlihat
          rusak. */}
      <div className={`notice ${terkunci ? "tone-warning" : "tone-info"}`}>
        <div className="notice-icon">
          {terkunci ? <Lock className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <StatusPill label={status.label} tone={status.tone} />
          {terkunci && (
            <p className="notice-body mt-2">
              Sudah ditransfer, angkanya tidak bisa diubah. Koreksi lewat jalur audit.
            </p>
          )}
          <p className="notice-foot mt-2">
            Setiap perubahan tercatat di audit log Manager beserta nama pengubahnya.
          </p>
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
                disabled={terkunci || sebagaiStaff}
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
                disabled={terkunci || sebagaiStaff}
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
                disabled={terkunci || draftStaff}
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
                disabled={terkunci || sebagaiStaff}
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
          <div className="flex items-center gap-2">
            {/* Ponsel: ikon hapus pindah ke sini, di kiri tombol tambah
                (arahan Manager 11 Okt 2026); baris ikon di tiap kartu item
                hanya memakan satu baris kosong. Ia menghapus item TERAKHIR.
                Layar lebar tetap punya ikon hapus di tiap baris. */}
            <button
              type="button"
              onClick={() => removeItem(items.length - 1)}
              disabled={items.length <= 1 || terkunci}
              className="btn-netral tone-danger inline-flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-sm)] p-2 disabled:opacity-30 md:hidden"
              title="Hapus item terakhir"
              aria-label="Hapus item terakhir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={addItem}
              disabled={terkunci}
              className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 py-2 text-xs font-bold disabled:opacity-40"
            >
              + Tambah Item
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="tabel-lembut min-w-full text-sm">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Spec</th>
                {sebagaiStaff && <th className="!text-right">Berat Lapak (KG)</th>}
                {!draftStaff && <th className="!text-right">Berat Final (KG)</th>}
                <th className="!text-right">Harga/KG (Rp)</th>
                <th className="!text-right">Subtotal</th>
                <th className="max-md:hidden!" />
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
                  {sebagaiStaff && (
                    <td>
                      <NumberInput
                        aria-label={`Berat lapak item ${idx + 1}`}
                        value={item.berat_lapak ?? 0}
                        onValueChange={(n) => updateItem(idx, "berat_lapak", n)}
                        className="field-input text-right"
                        disabled={terkunci}
                      />
                    </td>
                  )}
                  {!draftStaff && (
                    <td>
                      <NumberInput
                        aria-label={`Berat final item ${idx + 1}`}
                        value={item.berat_final_item}
                        onValueChange={(n) => updateItem(idx, "berat_final_item", n)}
                        className="field-input text-right"
                        disabled={terkunci}
                      />
                    </td>
                  )}
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
                  <td className="max-md:hidden! text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1 || terkunci}
                      className="btn-netral tone-danger inline-flex min-w-11 items-center justify-center rounded-[var(--radius-sm)] p-2 disabled:opacity-30 md:min-w-0"
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
      {/* Kasbon (DP) yang dipakai nota ini. Boleh dibetulkan oleh semua peran
          yang bisa membuka layar ini, supaya salah ketik nominal kasbon punya
          jalan keluar; saldo lapak disesuaikan di server. */}
      {tampilkanKasbon && (
        <div className="section overflow-hidden">
          <div className="section-shell-head">
            <div>
              <span className="section-eyebrow">Kasbon</span>
              <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Potongan Kasbon (DP)</h3>
            </div>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Sisa kasbon lapak ini:{" "}
              <span className="font-mono font-bold tabular-nums" style={{ color: sisaDp > 0 ? "var(--brand-strong)" : "var(--muted-faint)" }}>
                {fmtRp(sisaDp)}
              </span>
            </span>
          </div>
          <div className="section-body">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-semibold text-slate-400">Rp</div>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Potongan kasbon (DP)"
                value={fmtDigitInput(dpDigunakan)}
                onChange={(e) => setDpDigunakan(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                disabled={terkunci}
                className="h-11 w-full rounded-[10px] border border-slate-200 bg-white pl-12 pr-4 font-mono text-lg font-bold tabular-nums text-slate-800 outline-none transition-[border-color,box-shadow] focus:border-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand)]/20 disabled:opacity-60"
              />
            </div>
            {dpAngka > 0 && (
              <p className="mt-2 text-xs font-bold" style={{ color: "var(--brand-strong)" }}>
                &asymp; {fmtSkalaRupiah(dpAngka)} rupiah
              </p>
            )}
            {dpMelebihiSaldo && (
              <p className="mt-1 text-xs font-semibold" style={{ color: "var(--danger)" }}>
                Melebihi sisa kasbon lapak ({fmtRp(sisaDp)}).
              </p>
            )}
            {!dpMelebihiSaldo && dpMelebihiNota && (
              <p className="mt-1 text-xs font-semibold" style={{ color: "var(--danger)" }}>
                Melebihi nilai nota setelah potongan ({fmtRp(Math.max(totalAfterCuts, 0))}).
              </p>
            )}
          </div>
        </div>
      )}

      {sebagaiStaff ? (
        <div className="section overflow-hidden">
          <div className="section-body">
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
            {rincianPotongan.length > 0 && (
              <ul className="mt-3 space-y-0.5 text-xs" style={{ color: "var(--muted)" }}>
                {rincianPotongan.map(r => (
                  <li key={r.nama} className="flex justify-between gap-4">
                    <span>Potongan {r.nama}</span>
                    <span className="tabular-nums">&minus; {fmtRp(r.nilai)}</span>
                  </li>
                ))}
              </ul>
            )}
            {barisKasbon}
          </div>
        </div>
      ) : (
      <PotonganFields
        kartu
        readOnly={terkunci}
        baris={barisPotongan}
        total={totalPotongan}
        eyebrow="Koreksi"
        judul="Potongan"
        deskripsi="Berat (KG) dikali harga per KG; nilai potongan dihitung otomatis."
        kaki={
          <>
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
            {barisKasbon}
          </>
        }
      />
      )}

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

      {/* Tombol Kembali pindah ke atas halaman (TombolKembali di tiap
          halaman edit), sama seperti menu lain. */}
      <div className="flex items-center justify-end gap-4">
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
