"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Supplier, Warehouse } from "@prisma/client"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { isShortGoogleMapsLink, parseCoordinatesFromMapLink } from "@/lib/supplierLocation"
import { isValidBankAccountNumber, isValidIndonesianWaNumber } from "@/lib/supplierValidation"

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
const TRANSACTION_STATUS_OPTIONS = [
  { value: "RED", label: "Merah - belum aktif" },
  { value: "GREEN", label: "Hijau - aktif" },
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
    ...warehouses.map(w => ({ value: w.id as string, label: `Collection Center ${w.nama.replace(/^Gudang\s+/i, "")}` })),
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="premium-workflow space-y-5">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>}
      {duplicateCandidates && duplicateCandidates.length > 0 && (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm space-y-3">
          <p className="font-semibold">Ditemukan supplier dengan nama/lokasi mirip di gudang ini:</p>
          <ul className="list-disc pl-5 space-y-1">
            {duplicateCandidates.map((d) => (
              <li key={d.id}>
                {d.nama}{" "}
                <span className="text-xs text-amber-600">
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
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-70"
            >
              Ini bukan duplikat, tetap simpan
            </button>
            <button
              type="button"
              onClick={() => setDuplicateCandidates(null)}
              className="px-4 py-2 rounded-lg bg-white border border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-100"
            >
              Batal, saya periksa dulu
            </button>
          </div>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-sm font-medium flex items-center gap-2">
          {success}
          {isEdit && (
            <button type="button" onClick={() => router.back()} className="ml-auto text-xs underline text-emerald-600 hover:text-emerald-800">
              Kembali
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Nama Lapak <span className="text-red-500">*</span></label>
        <input
          type="text"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
          placeholder="Misal: Pengepul A"
        />
      </div>

      {lockedWarehouse && warehouses.length === 1 ? (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Opsi Gudang</label>
          <div className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-100 text-slate-600 font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Collection Center {warehouses[0].nama.replace(/^Gudang\s+/i, '')}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Opsi Gudang <span className="text-red-500">*</span></label>
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
          <label className="text-sm font-semibold text-slate-700">Kontak WA (Opsional)</label>
          <input
            type="text"
            value={kontakWa}
            onChange={(e) => setKontakWa(e.target.value)}
            className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
            placeholder="0812xxxxxx"
          />
          {waWarning && <p className="text-xs font-medium text-amber-600">{waWarning}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Link Google Maps (Opsional)</label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
            placeholder="https://maps.google.com/..."
          />
          {inferredCoordinates && (
            <p className="text-xs font-medium text-sky-700">
              Koordinat terdeteksi otomatis dari link ini: {inferredCoordinates.latitude}, {inferredCoordinates.longitude}
            </p>
          )}
          {needsManualCoordinates && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Link pendek Google Maps tidak menyimpan koordinat di URL. Isi latitude dan longitude agar preview peta aktif.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Latitude (Opsional)</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
            placeholder="Contoh: -7.8165"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Longitude (Opsional)</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
            placeholder="Contoh: 112.0111"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nama Bank (Opsional)</label>
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
                className="w-full border-amber-200 bg-amber-50 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none transition-all text-sm"
                placeholder="Tulis nama bank / e-wallet di sini..."
              />
              <p className="text-xs text-amber-600 mt-1">Isi nama bank atau e-wallet yang tidak ada dalam list.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nomor Rekening (Opsional)</label>
          <input
            type="text"
            value={nomorRekening}
            onChange={(e) => setNomorRekening(e.target.value)}
            className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
            placeholder="Contoh: 1234567890"
          />
          {rekeningWarning && <p className="text-xs font-medium text-amber-600">{rekeningWarning}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Atas Nama (Opsional)</label>
          <input
            type="text"
            value={atasNama}
            onChange={(e) => setAtasNama(e.target.value)}
            className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
            placeholder="Contoh: Budi Santoso"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Status Transaksi Lapak</label>
          <ElegantSelect
            value={transactionStatus}
            options={TRANSACTION_STATUS_OPTIONS}
            onChange={setTransactionStatus}
            ariaLabel="Pilih status transaksi supplier"
            className="w-full"
          />
          <p className="text-xs text-slate-500">
            Default merah. Status akan otomatis menjadi hijau saat transaksi valid pertama berhasil disetujui.
          </p>
        </div>


        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Target Bulanan (kg)</label>
          <input
            type="number"
            min="0"
            value={targetBulanan}
            onChange={(e) => setTargetBulanan(e.target.value)}
            className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Jadwal Ambilan Lapak</h3>
        <p className="text-xs text-slate-500">Sebutkan berapa kali dalam seminggu dan pilih hari-hari rutin ambilan barang dari lapak ini.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Frekuensi Ambilan (Kali / Minggu)</label>
            <input
              type="number"
              min="1"
              max="7"
              value={frekuensiAmbilan}
              onChange={(e) => setFrekuensiAmbilan(e.target.value)}
              className="w-full border-slate-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Hari Ambilan Rutin</label>
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isChecked
                        ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-between items-center gap-4 border-t border-slate-100">
        {isEdit && (
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="premium-button ml-auto rounded-xl bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Menyimpan..." : isEdit ? "Update Lapak" : "Simpan Lapak"}
        </button>
      </div>
    </form>
  )
}
