"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Supplier, Warehouse } from "@prisma/client"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { isShortGoogleMapsLink, parseCoordinatesFromMapLink } from "@/lib/supplierLocation"
import { isValidBankAccountNumber, isValidIndonesianWaNumber } from "@/lib/supplierValidation"
import { namaGudang } from "@/lib/namaGudang"

const KNOWN_BANKS = ["BCA","BNI","BRI","BSI","BTN","Mandiri","CIMB Niaga","Danamon","Permata","Panin","OCBC NISP","Maybank","Mega","Muamalat","Jago","SeaBank","Jenius","Gopay","OVO","Dana"]
const BANK_OPTIONS = [
  { value: "", label: "Pilih bank" },
  { value: "BCA", label: "BCA" },
  { value: "BNI", label: "BNI" },
  { value: "BRI", label: "BRI" },
  { value: "BSI", label: "BSI (Bank Syariah Indonesia)" },
  { value: "BTN", label: "BTN" },
  { value: "Mandiri", label: "Mandiri" },
  { value: "CIMB Niaga", label: "CIMB Niaga" },
  { value: "Danamon", label: "Danamon" },
  { value: "Permata", label: "Permata" },
  { value: "Panin", label: "Panin" },
  { value: "OCBC NISP", label: "OCBC NISP" },
  { value: "Maybank", label: "Maybank" },
  { value: "Mega", label: "Bank Mega" },
  { value: "Muamalat", label: "Bank Muamalat" },
  { value: "Jago", label: "Bank Jago" },
  { value: "SeaBank", label: "SeaBank" },
  { value: "Jenius", label: "Jenius (BTPN)" },
  { value: "Gopay", label: "GoPay" },
  { value: "OVO", label: "OVO" },
  { value: "Dana", label: "DANA" },
  { value: "Lainnya", label: "Lainnya" },
]
/* Labelnya dulu menaruh nama warna di depan ("Merah - belum aktif").
   Yang perlu dibaca adalah keadaannya; warnanya cuma cara menampilkannya
   di daftar. Urutannya dibalik supaya kata yang berarti datang lebih
   dulu. */
const TRANSACTION_STATUS_OPTIONS = [
  { value: "RED", label: "Belum aktif" },
  { value: "GREEN", label: "Aktif" },
]

function resolveBank(val: string | null | undefined): { bank: string; lainnya: string } {
  if (!val) return { bank: "", lainnya: "" }
  if (KNOWN_BANKS.includes(val)) return { bank: val, lainnya: "" }
  return { bank: "Lainnya", lainnya: val }
}

export default function SupplierForm({
  warehouses,
  defaultWarehouseId,
  lockedWarehouse = false,
  supplierId,
  initialData,
}: {
  warehouses: Warehouse[]
  defaultWarehouseId?: string
  lockedWarehouse?: boolean
  supplierId?: string
  initialData?: Supplier
}) {
  const isEdit = !!supplierId
  const { bank: initBank, lainnya: initBankLainnya } = resolveBank(initialData?.nama_bank)

  const router = useRouter()
  const [nama, setNama] = useState(initialData?.nama || "")
  const [kontakWa, setKontakWa] = useState(initialData?.kontak_wa || "")
  const [link, setLink] = useState(initialData?.link || "")
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() || "")
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() || "")
  const [transactionStatus, setTransactionStatus] = useState(initialData?.transactionStatus || "RED")
  const [namaBank, setNamaBank] = useState(initBank)
  const [namaBankLainnya, setNamaBankLainnya] = useState(initBankLainnya)
  const [nomorRekening, setNomorRekening] = useState(initialData?.nomor_rekening || "")
  const [atasNama, setAtasNama] = useState(initialData?.atas_nama || "")
  const [targetBulanan, setTargetBulanan] = useState(String(initialData?.target_bulanan_kg ?? "0"))
  const [frekuensiAmbilan, setFrekuensiAmbilan] = useState(String(initialData?.frekuensi_ambilan_mingguan ?? "1"))
  const [hariAmbilanList, setHariAmbilanList] = useState<string[]>(initialData?.hari_ambilan ? initialData.hari_ambilan.split(",") : [])
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [duplicateCandidates, setDuplicateCandidates] = useState<{ id: string; nama: string; reason: string }[] | null>(null)
  const inferredCoordinates =
    latitude === "" && longitude === ""
      ? parseCoordinatesFromMapLink(link)
      : null
  const needsManualCoordinates = isShortGoogleMapsLink(link) && !inferredCoordinates && latitude === "" && longitude === ""
  const waWarning = kontakWa.trim() && !isValidIndonesianWaNumber(kontakWa) ? "Format nomor WA tidak dikenali (contoh: 0812xxxxxxx)." : ""
  const rekeningWarning = nomorRekening.trim() && !isValidBankAccountNumber(nomorRekening) ? "Nomor rekening harus 5-20 digit angka." : ""
  const warehouseOptions = [
    { value: "", label: "Pilih lokasi gudang" },
    ...warehouses.map(w => ({ value: w.id as string, label: namaGudang(w.nama) })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitSupplier(false)
  }

  const submitSupplier = async (confirmDuplicate: boolean) => {
    setLoading(true)
    setError("")
    setSuccess("")
    if (confirmDuplicate) setDuplicateCandidates(null)

    try {
      const url = isEdit ? `/api/suppliers/${supplierId}` : "/api/suppliers"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          kontak_wa: kontakWa,
          link,
          latitude,
          longitude,
          transactionStatus,
          nama_bank: namaBank === "Lainnya" ? namaBankLainnya : namaBank,
          nomor_rekening: nomorRekening,
          atas_nama: atasNama,
          target_bulanan_kg: targetBulanan,
          frekuensi_ambilan_mingguan: parseInt(frekuensiAmbilan) || 1,
          hari_ambilan: hariAmbilanList.join(","),
          warehouseId,
          confirmDuplicate,
        })
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409 && data.requiresConfirmation) {
          setDuplicateCandidates(data.duplicates)
          return
        }
        throw new Error(data.error || (isEdit ? "Gagal mengupdate supplier" : "Gagal menyimpan supplier"))
      }

      setSuccess(isEdit ? "Data supplier berhasil diupdate." : "Data supplier berhasil ditambahkan.")
      if (isEdit) {
        router.refresh()
        return
      }
      setNama("")
      setKontakWa("")
      setLink("")
      setLatitude("")
      setLongitude("")
      setTransactionStatus("RED")
      setNamaBank("")
      setNamaBankLainnya("")
      setNomorRekening("")
      setAtasNama("")
      setTargetBulanan("0")
      setFrekuensiAmbilan("1")
      setHariAmbilanList([])
      // keep warehouseId to default
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan lapak")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="premium-workflow space-y-5">
      {error && <div className="notice tone-warning text-sm font-medium">{error}</div>}
      {duplicateCandidates && duplicateCandidates.length > 0 && (
        <div className="notice tone-warning flex-col items-stretch space-y-3 text-sm">
          <p className="font-semibold">Ditemukan supplier dengan nama/lokasi mirip di gudang ini:</p>
          <ul className="list-disc pl-5 space-y-1">
            {duplicateCandidates.map((d) => (
              <li key={d.id}>
                {d.nama}{" "}
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  ({d.reason === "nama_identik" ? "nama identik" : d.reason === "nama_mirip" ? "nama mirip" : "lokasi berdekatan"})
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => submitSupplier(true)}
              disabled={loading}
              className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 py-2 text-xs font-bold disabled:opacity-70"
            >
              Ini bukan duplikat, tetap simpan
            </button>
            <button
              type="button"
              onClick={() => setDuplicateCandidates(null)}
              className="btn-netral premium-button px-4 py-2 text-xs"
            >
              Batal, saya periksa dulu
            </button>
          </div>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border p-3 text-sm font-medium" style={{ borderColor: "var(--success-soft)", background: "var(--success-soft)", color: "var(--success)" }}>
          {success}
          {isEdit && (
            <button type="button" onClick={() => router.back()} className="ml-auto text-xs underline">
              Kembali
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="field-label">Nama Lapak <span style={{ color: "var(--danger)" }}>*</span></label>
        <input
          type="text"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="field-input"
          placeholder="Misal: Pengepul A"
        />
      </div>

      {lockedWarehouse && warehouses.length === 1 ? (
        <div className="space-y-2">
          <label className="field-label">Opsi Gudang</label>
          <div className="field-input flex items-center gap-2" style={{ cursor: "default" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {namaGudang(warehouses[0].nama)}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="field-label">Opsi Gudang <span style={{ color: "var(--danger)" }}>*</span></label>
          <ElegantSelect
            value={warehouseId}
            options={warehouseOptions}
            onChange={setWarehouseId}
            ariaLabel="Pilih lokasi gudang"
            className="w-full"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="field-label">Kontak WA (Opsional)</label>
          <input
            type="text"
            value={kontakWa}
            onChange={(e) => setKontakWa(e.target.value)}
            className="field-input"
            placeholder="0812xxxxxx"
          />
          {waWarning && <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--warning)" }}>{waWarning}</p>}
        </div>

        <div className="space-y-2">
          <label className="field-label">Link Google Maps (Opsional)</label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="field-input"
            placeholder="https://maps.google.com/..."
          />
          {inferredCoordinates && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--brand-strong)" }}>
              Koordinat terdeteksi otomatis dari link ini: {inferredCoordinates.latitude}, {inferredCoordinates.longitude}
            </p>
          )}
          {needsManualCoordinates && (
            <p className="mt-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
              Link pendek Google Maps tidak menyimpan koordinat di URL. Isi latitude dan longitude agar preview peta aktif.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="field-label">Latitude (Opsional)</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="field-input"
            placeholder="Contoh: -7.8165"
          />
        </div>

        <div className="space-y-2">
          <label className="field-label">Longitude (Opsional)</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="field-input"
            placeholder="Contoh: 112.0111"
          />
        </div>

        <div className="space-y-2">
          <label className="field-label">Nama Bank (Opsional)</label>
          <ElegantSelect
            value={namaBank}
            options={BANK_OPTIONS}
            onChange={setNamaBank}
            ariaLabel="Pilih nama bank"
            className="w-full"
          />
          {namaBank === "Lainnya" && (
            <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                required
                value={namaBankLainnya}
                onChange={(e) => setNamaBankLainnya(e.target.value)}
                className="field-input"
                placeholder="Tulis nama bank / e-wallet di sini..."
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--muted-faint)" }}>Isi nama bank atau e-wallet yang tidak ada dalam daftar.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="field-label">Nomor Rekening (Opsional)</label>
          <input
            type="text"
            value={nomorRekening}
            onChange={(e) => setNomorRekening(e.target.value)}
            className="field-input"
            placeholder="Contoh: 1234567890"
          />
          {rekeningWarning && <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--warning)" }}>{rekeningWarning}</p>}
        </div>

        <div className="space-y-2">
          <label className="field-label">Atas Nama (Opsional)</label>
          <input
            type="text"
            value={atasNama}
            onChange={(e) => setAtasNama(e.target.value)}
            className="field-input"
            placeholder="Contoh: Budi Santoso"
          />
        </div>

        <div className="space-y-2">
          <label className="field-label">Status Transaksi Lapak</label>
          <ElegantSelect
            value={transactionStatus}
            options={TRANSACTION_STATUS_OPTIONS}
            onChange={setTransactionStatus}
            ariaLabel="Pilih status transaksi supplier"
            className="w-full"
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted-faint)" }}>
            Lapak baru dimulai sebagai belum aktif, lalu berpindah sendiri ke aktif begitu transaksi sahnya yang pertama disetujui.
          </p>
        </div>


        <div className="space-y-2">
          <label className="field-label">Target Bulanan (kg)</label>
          <input
            type="number"
            min="0"
            value={targetBulanan}
            onChange={(e) => setTargetBulanan(e.target.value)}
            className="field-input"
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}>
        <div>
          <span className="section-eyebrow">Rutinitas</span>
          <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Jadwal Ambilan Lapak</h3>
        </div>
        <p className="text-xs" style={{ color: "var(--muted-faint)" }}>Sebutkan berapa kali dalam seminggu dan pilih hari-hari rutin ambilan barang dari lapak ini.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="field-label">Frekuensi Ambilan (Kali / Minggu)</label>
            <input
              type="number"
              min="1"
              max="7"
              value={frekuensiAmbilan}
              onChange={(e) => setFrekuensiAmbilan(e.target.value)}
              className="field-input"
            />
          </div>

          <div className="space-y-2">
            <label className="field-label">Hari Ambilan Rutin</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => {
                const isChecked = hariAmbilanList.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        setHariAmbilanList(hariAmbilanList.filter(d => d !== day))
                      } else {
                        setHariAmbilanList([...hariAmbilanList, day])
                      }
                    }}
                    /* Dulu biru sian -- warna yang tidak dipakai di mana
                       pun lagi dalam sistem ini. Hari terpilih kini memakai
                       warna merek, sama seperti pilihan aktif lainnya. */
                    className="premium-button min-h-[38px] rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-bold transition-all"
                    style={isChecked
                      ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }
                      : { background: "var(--surface)", borderColor: "var(--border)", color: "var(--muted)" }}
                    aria-pressed={isChecked}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        {isEdit && (
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-netral premium-button px-5 py-3 text-sm"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primer premium-button ml-auto rounded-[var(--radius-sm)] px-6 py-3 font-bold disabled:opacity-70"
        >
          {loading ? "Menyimpan..." : isEdit ? "Update Lapak" : "Simpan Lapak"}
        </button>
      </div>
    </form>
  )
}
