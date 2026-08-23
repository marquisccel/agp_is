"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Supplier } from "@prisma/client"
import RingkasanLapak from "@/components/features/RingkasanLapak"
import ElegantSelect from "@/components/ui/ElegantSelect"
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
      // Nama warna, bukan artinya -- keluhan yang sudah dibetulkan di
      // Master Data dan Data Lapak, tapi masih tersisa di daftar pilihan.
      label: `${s.nama} - ${s.transactionStatus === "GREEN" ? "Aktif" : "Belum aktif"} - Target ${s.target_bulanan_kg} kg`,
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengajukan kasbon")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="notice tone-warning text-sm font-medium">{error}</div>}

      <div>
        <label className="field-label">Pilih Lapak</label>
        <ElegantSelect
          value={supplierId}
          options={supplierOptions}
          onChange={setSupplierId}
          ariaLabel="Pilih supplier"
          className="w-full"
        />
        {selectedSupplier && <RingkasanLapak lapak={selectedSupplier} />}
      </div>

      <div>
        <label className="field-label">Nominal Kasbon (Rp)</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-semibold" style={{ color: "var(--muted-faint)" }}>
            Rp
          </div>
          <input
            type="text"
            inputMode="numeric"
            required
            value={fmtDigitInput(nominal)}
            onChange={(e) => setNominal(e.target.value.replace(/\D/g, ""))}
            className="field-input field-icon font-mono text-lg font-bold tabular-nums tracking-wide"
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
        <p className="mt-2 text-xs" style={{ color: "var(--muted-faint)" }}>
          Semua pengajuan kasbon diputus Manager, berapa pun nominalnya. Tingkat verifikasi Admin sudah dihapus.
        </p>
      </div>

      <div>
        <label className="field-label">Keterangan untuk Manager (Opsional)</label>
        <textarea
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          className="field-input text-sm"
          placeholder="Tulis alasan pengajuan kasbon agar memudahkan Manager menyetujui..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-netral premium-button px-6 py-3"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primer premium-button rounded-[var(--radius-sm)] px-8 py-3 font-bold disabled:opacity-70"
        >
          {loading ? "Memproses..." : "Ajukan Kasbon"}
        </button>
      </div>
    </form>
  )
}
