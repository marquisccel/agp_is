"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import NumberInput from "@/components/ui/NumberInput"
import { fmtRp } from "@/lib/format"

/**
 * Membuka kembali nota yang terlanjur ditandai lunas karena pembayarannya
 * ternyata kurang.
 *
 * Dipakai di dua tempat: layar Transfer Pembayaran (tempat Admin bekerja
 * sehari-hari dan paling dulu tahu kalau nominalnya kurang) dan Detail
 * Transaksi milik Manager. Ditulis sekali supaya batas, kata-kata, dan
 * aturan panjang alasannya tidak berangsur berbeda di dua layar -- pola
 * yang sudah berulang kali terjadi di berkas lain.
 */
export default function KoreksiKekurangan({
  purchaseId,
  kewajiban,
  onSelesai,
}: {
  purchaseId: string
  /** Batas atas kekurangan: seluruh kewajiban ke lapak setelah kasbon. */
  kewajiban: number
  onSelesai?: () => void
}) {
  const router = useRouter()
  const [terbuka, setTerbuka] = useState(false)
  const [kurang, setKurang] = useState(0)
  const [alasan, setAlasan] = useState("")
  const [mengirim, setMengirim] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  const kirim = async () => {
    setMengirim(true)
    setGalat(null)
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kurang, alasan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal mencatat kekurangan")
      setTerbuka(false)
      setAlasan("")
      setKurang(0)
      onSelesai?.()
      router.refresh()
    } catch (e: unknown) {
      setGalat(e instanceof Error ? e.message : "Gagal mencatat kekurangan")
    } finally {
      setMengirim(false)
    }
  }

  if (!terbuka) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black" style={{ color: "var(--foreground)" }}>Pembayarannya ternyata kurang?</p>
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
            Buka kembali nota ini dan catat berapa yang masih harus dibayar.
          </p>
        </div>
        <button
          onClick={() => { setTerbuka(true); setKurang(0) }}
          className="btn-netral premium-button shrink-0 px-3 py-2 text-xs"
        >
          Koreksi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Kekurangan yang belum dibayar (Rp)</label>
        <NumberInput
          aria-label="Nominal kekurangan"
          className="field-input text-right font-mono"
          placeholder="0"
          value={kurang}
          onValueChange={setKurang}
        />
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--muted-faint)" }}>
          Maksimal {fmtRp(kewajiban)}, yaitu seluruh kewajiban ke lapak setelah potongan kasbon.
        </p>
      </div>
      <div>
        <label className="field-label">Alasan koreksi</label>
        <textarea
          className="field-input text-sm"
          rows={2}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Contoh: transfer hanya Rp 9.000.000, sisanya belum dikirim."
        />
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--muted-faint)" }}>
          Wajib diisi, minimal 10 karakter. Tercatat di audit log bersama nama Anda.
        </p>
      </div>
      {galat && <div className="notice tone-warning text-xs font-medium">{galat}</div>}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => { setTerbuka(false); setGalat(null) }}
          className="btn-netral premium-button px-3 py-2 text-xs"
        >
          Batal
        </button>
        <button
          onClick={kirim}
          disabled={mengirim || kurang <= 0 || alasan.trim().length < 10}
          className="btn-primer premium-button rounded-[var(--radius-sm)] px-4 py-2 text-xs font-bold disabled:opacity-50"
        >
          {mengirim ? "Menyimpan..." : "Buka Kembali Nota"}
        </button>
      </div>
    </div>
  )
}
