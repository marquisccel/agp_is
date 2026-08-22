"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Supplier } from "@prisma/client"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { getSupplierMapHref, hasResolvedSupplierCoordinates } from "@/lib/supplierLocation"
import { fmtDigitInput, fmtSkalaRupiah } from "@/lib/format"

export default function DPRequestForm({ suppliers, role = "ADMIN" }: { suppliers: Supplier[], role?: string }) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState("")
  /** Disimpan sebagai digit mentah ("15000000"); pemisah ribuan cuma untuk
   * tampilan, supaya nilai yang dikirim ke API tetap angka bersih. */
  const [nominal, setNominal] = useState("")
  const nominalAngka = nominal ? Number(nominal) : 0
  const [keterangan, setKeterangan] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId)
  const supplierOptions = [
    { value: "", label: "Pilih supplier" },
    ...suppliers.map(s => ({
      value: s.id as string,
      label: `${s.nama} - ${s.transactionStatus === "GREEN" ? "Hijau" : "Merah"} - Target ${s.target_bulanan_kg} kg`,
    })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || !nominal) return

    // Batas minimal dulu dijaga atribut min="10000" pada input[type=number].
    // Inputnya sekarang bertipe text (supaya bisa diformat pemisah ribuan),
    // jadi validasinya dipindah ke sini.
    if (nominalAngka < 10000) {
      setError("Nominal kasbon minimal Rp 10.000.")
      return
    }

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

      // Admin tidak lagi punya halaman kasbon, jadi cabangnya dihapus.
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
        <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Lapak</label>
        <ElegantSelect
          value={supplierId}
          options={supplierOptions}
          onChange={setSupplierId}
          ariaLabel="Pilih supplier"
          className="w-full"
        />
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
              <span>Target {Number(selectedSupplier.target_bulanan_kg || 0).toLocaleString("id-ID")} kg per bulan</span>
              {(selectedSupplier.link || hasResolvedSupplierCoordinates(selectedSupplier)) && (
                <a
                  href={getSupplierMapHref({ ...selectedSupplier })}
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

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Nominal Kasbon (Rp)</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 font-semibold">
            Rp
          </div>
          <input
            type="text"
            inputMode="numeric"
            required
            value={fmtDigitInput(nominal)}
            onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))}
            className="w-full border-slate-200 rounded-xl pl-12 pr-4 py-3 bg-slate-50 focus:bg-white outline-none transition-all font-mono text-lg font-bold tabular-nums tracking-wide"
            placeholder="Contoh: 1.500.000"
            aria-describedby="nominal-skala"
          />
        </div>
        <p id="nominal-skala" className="mt-2 min-h-[18px] text-xs font-bold" style={{ color: "var(--brand-strong)" }}>
          {nominalAngka > 0 ? `≈ ${fmtSkalaRupiah(nominalAngka)} rupiah` : ""}
        </p>
        {nominalAngka > 0 && nominalAngka < 10000 && (
          <p className="mt-1 text-xs font-semibold" style={{ color: "var(--danger)" }}>
            Nominal minimal Rp 10.000.
          </p>
        )}
        <p className="text-xs text-slate-500 mt-2">Catatan: Semua pengajuan kasbon memerlukan persetujuan, berapa pun nominalnya — pengajuan Staff diputus oleh Admin gudang, pengajuan Admin diputus oleh Manager.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Keterangan untuk Manager (Opsional)</label>
        <textarea
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all text-sm"
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
          className="premium-button btn-primer rounded-xl px-8 py-3 font-bold disabled:opacity-70"
        >
          {loading ? "Memproses..." : "Ajukan Kasbon"}
        </button>
      </div>
    </form>
  )
}
