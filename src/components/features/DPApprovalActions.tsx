"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import NumberInput from "@/components/ui/NumberInput"

type DpRow = {
  id: string
  nominal_diajukan: number
}

/**
 * Aksi persetujuan kasbon.
 *
 * Kebijakan (keputusan meeting Manager): SELURUH pengajuan kasbon diputus
 * Manager, berapa pun nominalnya dan siapa pun pengajunya. Tingkat
 * verifikasi Admin dan opsi eskalasi "forward" dihapus.
 */
export default function DPApprovalActions({ dp }: { dp: DpRow }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [nominal, setNominal] = useState(dp.nominal_diajukan)
  const { confirm, dialog } = useConfirm()
  const { toast, host: toastHost } = useToast()

  const handleAction = async (action: "approve" | "reject", finalNominal?: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dp/${dp.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          nominal_disetujui: action === "approve" ? (finalNominal || dp.nominal_diajukan) : undefined
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Gagal memproses persetujuan")
      }

      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), "error")
      setLoading(false)
    }
  }

  if (showEdit) {
    return (
      /* Di ponsel label turun ke baris sendiri dan kolom nominalnya mengisi
         sisa lebar di samping kedua tombol. Sebaris seperti di tabel, label
         + kolom 160px + dua tombol butuh sekitar 400px, lebih lebar dari
         kartu di layar 360px. */
      <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:flex-nowrap md:justify-center">
        {dialog}
        {toastHost}
        {/* Kolomnya dulu berdiri tanpa keterangan apa pun: sebuah kotak
            berisi "15000000" di sebelah dua ikon. Tidak ada yang memberi
            tahu bahwa itu nominal yang akan DISETUJUI, bukan yang diajukan. */}
        <label className="field-label w-full whitespace-nowrap md:w-auto" style={{ marginBottom: 0 }}>
          Setujui sebesar
        </label>
        <NumberInput
          aria-label="Nominal kasbon yang disetujui"
          value={nominal}
          onValueChange={setNominal}
          pemisahRibuan
          className="field-input min-w-0 flex-1 text-right font-mono md:w-40 md:flex-none"
        />
        <button
          onClick={() => handleAction("approve", nominal)}
          disabled={loading || nominal <= 0}
          className="btn-primer premium-button grid h-11 w-11 shrink-0 place-items-center rounded-xl disabled:opacity-50 md:h-auto md:w-auto md:rounded-[var(--radius-sm)] md:p-2"
          title="Simpan dan setujui"
          aria-label="Simpan dan setujui"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowEdit(false)}
          disabled={loading}
          className="btn-netral premium-button grid h-11 w-11 shrink-0 place-items-center rounded-xl disabled:opacity-50 md:h-auto md:w-auto md:rounded-[var(--radius-sm)] md:p-2"
          title="Batal"
          aria-label="Batal ubah nominal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  /*
   * Tiga tombol, dulu tiga keluarga warna: hijau, indigo, merah -- dan
   * indigo tidak dipakai di mana pun lagi dalam sistem ini. Sekarang
   * bentuknya mengikuti aturan yang sama dengan layar lain: satu aksi
   * utama, sisanya netral, dan yang merusak baru memerah saat disentuh.
   */
  return (
    <div className="flex items-center justify-end gap-2">
      {dialog}
      {toastHost}

      {/* Ubah Nominal berdiri paling kiri dan tetap bertulisan, karena ia
          membuka formulir dan bukan keputusan akhir. Setujui serta Tolak
          jadi ikon: keduanya keputusan yang tidak bisa dibatalkan, dan
          tombol berjejer bertuliskan kata membuat mata harus membaca ulang
          tiap baris untuk menemukan mana yang mana.

          Maksudnya tidak hilang: keduanya membawa title dan aria-label,
          jadi tetap terbaca pembaca layar dan muncul saat disentuh kursor. */}
      <button
        onClick={() => setShowEdit(true)}
        disabled={loading}
        className="btn-netral premium-button inline-flex h-11 items-center whitespace-nowrap rounded-xl px-4 text-xs font-bold disabled:opacity-50 md:h-auto md:rounded-[var(--radius-sm)] md:px-3 md:py-1.5 md:font-semibold"
      >
        Edit Nominal
      </button>

      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        title="Setujui pengajuan kasbon ini"
        aria-label="Setujui pengajuan kasbon ini"
        className="btn-primer premium-button grid h-11 w-11 place-items-center rounded-xl disabled:opacity-50 md:h-8 md:w-8 md:rounded-[var(--radius-sm)]"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        onClick={async () => {
          const ok = await confirm({
            title: "Tolak pengajuan kasbon ini?",
            description: "Pengajuan yang ditolak tidak bisa diproses ulang oleh Staff/Admin.",
            tone: "danger",
            confirmLabel: "Ya, tolak",
          })
          if (ok) handleAction("reject")
        }}
        disabled={loading}
        title="Tolak pengajuan kasbon ini"
        aria-label="Tolak pengajuan kasbon ini"
        className="btn-netral tone-danger premium-button grid h-11 w-11 place-items-center rounded-xl disabled:opacity-50 md:h-8 md:w-8 md:rounded-[var(--radius-sm)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
