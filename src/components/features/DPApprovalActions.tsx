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
      <div className="flex items-center justify-end gap-2">
        {dialog}
        {toastHost}
        {/* Kolomnya dulu berdiri tanpa keterangan apa pun: sebuah kotak
            berisi "15000000" di sebelah dua ikon. Tidak ada yang memberi
            tahu bahwa itu nominal yang akan DISETUJUI, bukan yang diajukan. */}
        <label className="field-label whitespace-nowrap" style={{ marginBottom: 0 }}>
          Setujui sebesar
        </label>
        <NumberInput
          aria-label="Nominal kasbon yang disetujui"
          value={nominal}
          onValueChange={setNominal}
          pemisahRibuan
          className="field-input w-40 text-right font-mono"
        />
        <button
          onClick={() => handleAction("approve", nominal)}
          disabled={loading || nominal <= 0}
          className="btn-primer premium-button rounded-[var(--radius-sm)] p-2 disabled:opacity-50"
          title="Simpan dan setujui"
          aria-label="Simpan dan setujui"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowEdit(false)}
          disabled={loading}
          className="btn-netral premium-button p-2 disabled:opacity-50"
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
    <div className="flex justify-end gap-2">
      {dialog}
      {toastHost}
      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        className="btn-primer premium-button rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
      >
        Setujui
      </button>
      <button
        onClick={() => setShowEdit(true)}
        disabled={loading}
        className="btn-netral premium-button whitespace-nowrap px-3 py-1.5 text-xs disabled:opacity-50"
      >
        Ubah Nominal
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
        className="btn-netral tone-danger premium-button px-3 py-1.5 text-xs disabled:opacity-50"
      >
        Tolak
      </button>
    </div>
  )
}
