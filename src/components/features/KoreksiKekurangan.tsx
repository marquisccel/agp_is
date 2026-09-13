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
            className="animate-in fade-in flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl duration-200"
            style={{ background: "var(--surface)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Koreksi pembayaran nota"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div className="min-w-0">
                <span className="section-eyebrow">Koreksi pembayaran</span>
                <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                  Buka Kembali Nota{namaLapak ? ` ${namaLapak}` : ""}
                </h3>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                  Nota ini tercatat lunas. Catat berapa yang sebenarnya masih kurang dibayar ke lapak.
                </p>
              </div>
              {/* Tombol tutup bundar kecil tanpa tepi, gaya lembar iOS.
                  Tampilannya 32px; sasaran sentuhnya 44px lewat ::before
                  yang melebar 6px ke segala arah. */}
              <button
                type="button"
                onClick={tutup}
                aria-label="Tutup koreksi pembayaran"
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-slate-200"
              >
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="nominal-kekurangan" className="field-label" style={{ marginBottom: 0 }}>Kekurangan yang belum dibayar</label>
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    maks. {fmtRp(kewajiban)}
                  </span>
                </div>
                {/* Wadah isian yang memegang tepi dan cincin fokus
                    (focus-within), dengan awalan "Rp" tebal di dalamnya.
                    Isiannya sendiri polos tanpa tepi, jadi awalan dan angka
                    terbaca satu kotak, bukan label yang ditumpangkan di atas
                    kolom. */}
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-shadow focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-soft)]">
                  <span className="shrink-0 text-sm font-bold text-slate-700" aria-hidden="true">Rp</span>
                  <NumberInput
                    id="nominal-kekurangan"
                    aria-label="Nominal kekurangan"
                    pemisahRibuan
                    className="isian-polos min-w-0 flex-1 bg-transparent py-3 text-right font-mono text-lg font-bold text-slate-900 placeholder:text-slate-400"
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
                <label htmlFor="alasan-koreksi" className="field-label">Alasan koreksi</label>
                {/* Pegangan ubah-ukuran bawaan textarea muncul sebagai
                    segitiga kecil menonjol di pojok kanan bawah kolom.
                    Tingginya sudah cukup untuk kalimat sepanjang ini, jadi
                    pegangannya cuma menambah benda yang tidak dipakai. */}
                <textarea
                  id="alasan-koreksi"
                  className="isian-polos w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[var(--brand)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-soft)]"
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Contoh: transfer hanya Rp 9.000.000, sisanya belum dikirim."
                />
                <p className="mt-1.5 text-xs" style={{ color: "var(--muted-faint)" }}>
                  Tercatat di audit log bersama nama Anda.
                </p>
              </div>

              {galat && <div className="notice tone-warning text-sm font-medium">{galat}</div>}
            </div>

            {/* Batal sepertiga, Buka Kembali Nota dua pertiga lebar: aksi
                utama yang lebih lebar dan berwarna penuh, sehingga dua tombol
                berdampingan tidak terbaca setara. */}
            <div className="flex gap-3 border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={tutup}
                className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={kirim}
                disabled={belumLayak}
                className="btn-primer h-11 flex-[2] rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98] disabled:opacity-50"
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
