"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import NumberInput from "@/components/ui/NumberInput"
import { fmtRp } from "@/lib/format"

/**
 * Membuka kembali nota yang terlanjur ditandai lunas karena pembayarannya
 * ternyata kurang.
 *
 * Dipakai di dua tempat: layar Transfer Pembayaran (tempat Admin dan
 * Manager bekerja sehari-hari dan paling dulu tahu kalau nominalnya
 * kurang) dan Detail Transaksi milik Manager. Ditulis sekali supaya batas,
 * kata-kata, dan aturan panjang alasannya tidak berangsur berbeda di dua
 * layar -- pola yang sudah berulang kali terjadi di berkas lain.
 *
 * Formulirnya muncul sebagai kotak di tengah layar, bukan mekar di tempat.
 * Sebelumnya ia tumbuh di dalam kolom kanan kartu transfer yang lebarnya
 * cuma 260px: labelnya patah dua baris, kotak alasannya menyusut jadi
 * jendela kecil ber-scrollbar, dan tombolnya ikut patah. Isian yang minta
 * kalimat butuh ruang; kolom sempit itu tidak akan pernah menyediakannya.
 */
export default function KoreksiKekurangan({
  purchaseId,
  kewajiban,
  namaLapak,
  onSelesai,
}: {
  purchaseId: string
  /** Batas atas kekurangan: seluruh kewajiban ke lapak setelah DP. */
  kewajiban: number
  /** Ditampilkan di kepala kotak supaya jelas nota siapa yang dikoreksi. */
  namaLapak?: string
  onSelesai?: () => void
}) {
  const router = useRouter()
  const [terbuka, setTerbuka] = useState(false)
  const [kurang, setKurang] = useState(0)
  const [alasan, setAlasan] = useState("")
  const [mengirim, setMengirim] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  // Escape menutup kotaknya, dan halaman di belakang tidak ikut menggulir.
  useEffect(() => {
    if (!terbuka) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTerbuka(false)
    }
    document.addEventListener("keydown", onKey)
    const sebelumnya = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = sebelumnya
    }
  }, [terbuka])

  const tutup = () => {
    setTerbuka(false)
    setGalat(null)
  }

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

  const belumLayak = mengirim || kurang <= 0 || alasan.trim().length < 10
  /* Pratinjau akibatnya. Yang diketik adalah kekurangannya, tapi yang
     tersimpan juga sisi sebaliknya -- berapa yang berarti sudah dibayar.
     Menampilkannya di sini menghindarkan pengoreksi menghitung sendiri
     lalu keliru arah. */
  const sudahDibayar = Math.max(0, kewajiban - kurang)

  return (
    <>
      {/* Cukup "Koreksi": tombolnya berbagi lebar dengan "Ganti Bukti" di
          kolom sempit, dan label yang lebih panjang membuat keduanya
          patah. Isi kotaknya sudah menerangkan koreksi apa yang dimaksud. */}
      <button
        onClick={() => { setTerbuka(true); setKurang(0) }}
        className="btn-netral premium-button flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm"
      >
        Koreksi
      </button>

      {typeof document !== "undefined" && terbuka && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={tutup}
        >
          <div
            className="animate-in fade-in flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-lg)] shadow-2xl duration-200"
            style={{ background: "var(--surface)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Koreksi pembayaran nota"
          >
            <div
              className="flex items-start justify-between gap-3 border-b p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
            >
              <div className="min-w-0">
                <span className="section-eyebrow">Koreksi pembayaran</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                  Buka Kembali Nota{namaLapak ? ` ${namaLapak}` : ""}
                </h3>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                  Nota ini tercatat lunas. Catat berapa yang sebenarnya masih kurang dibayar ke lapak.
                </p>
              </div>
              <button
                type="button"
                onClick={tutup}
                aria-label="Tutup koreksi pembayaran"
                className="btn-netral premium-button shrink-0 p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label className="field-label" style={{ marginBottom: 0 }}>Kekurangan yang belum dibayar</label>
                  <span className="text-xs" style={{ color: "var(--muted-faint)" }}>
                    maks. {fmtRp(kewajiban)}
                  </span>
                </div>
                <div className="relative mt-1.5">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-bold"
                    style={{ color: "var(--muted-faint)" }}
                  >
                    Rp
                  </span>
                  <NumberInput
                    aria-label="Nominal kekurangan"
                    pemisahRibuan
                    className="field-input field-lg field-icon text-right font-mono text-lg font-bold"
                    placeholder="0"
                    value={kurang}
                    onValueChange={setKurang}
                  />
                </div>
                {/* Akibatnya disebut begitu angkanya masuk, bukan disimpan
                    sampai setelah disimpan. */}
                {kurang > 0 && kurang <= kewajiban && (
                  <div
                    className="mt-2 flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-xs"
                    style={{ background: "var(--surface-sunken)", color: "var(--muted)" }}
                  >
                    <span>Berarti yang sudah dibayar</span>
                    <strong className="font-mono" style={{ color: "var(--foreground)" }}>{fmtRp(sudahDibayar)}</strong>
                  </div>
                )}
              </div>

              <div>
                <label className="field-label">Alasan koreksi</label>
                {/* Pegangan ubah-ukuran bawaan textarea muncul sebagai
                    segitiga kecil menonjol di pojok kanan bawah kolom.
                    Tingginya sudah cukup untuk kalimat sepanjang ini, jadi
                    pegangannya cuma menambah benda yang tidak dipakai. */}
                <textarea
                  className="field-input resize-none text-sm"
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Contoh: transfer hanya Rp 9.000.000, sisanya belum dikirim."
                />
                <div className="mt-1.5 flex items-start justify-between gap-3 text-xs" style={{ color: "var(--muted-faint)" }}>
                  <span>Tercatat di audit log bersama nama Anda.</span>
                  <span
                    className="shrink-0 font-mono"
                    style={alasan.trim().length >= 10 ? undefined : { color: "var(--warning)" }}
                  >
                    {alasan.trim().length}/10
                  </span>
                </div>
              </div>

              {galat && <div className="notice tone-warning text-sm font-medium">{galat}</div>}
            </div>

            <div
              className="flex justify-end gap-2 border-t p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
            >
              <button onClick={tutup} className="btn-netral premium-button px-4 py-2.5 text-sm">
                Batal
              </button>
              <button
                onClick={kirim}
                disabled={belumLayak}
                className="btn-primer premium-button rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {mengirim ? "Menyimpan..." : "Buka Kembali Nota"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
