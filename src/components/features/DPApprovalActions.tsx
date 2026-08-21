"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"

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
      <div className="flex items-center gap-2 justify-center">
        {dialog}
        {toastHost}
        <input
          type="number"
          value={nominal}
          onChange={(e) => setNominal(parseFloat(e.target.value) || 0)}
          className="border border-indigo-200 rounded-lg px-2 py-1.5 w-32 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button
          onClick={() => handleAction("approve", nominal)}
          disabled={loading}
          className="bg-emerald-500 text-white p-1.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
          title="Simpan & Setujui"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <button
          onClick={() => setShowEdit(false)}
          disabled={loading}
          className="bg-slate-200 text-slate-600 p-1.5 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
          title="Batal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 justify-center">
      {dialog}
      {toastHost}
      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
      >
        Setujui
      </button>
      <button
        onClick={() => setShowEdit(true)}
        disabled={loading}
        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
      >
        Revisi Nilai
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
        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold text-xs rounded-lg border border-red-200 transition-colors disabled:opacity-50"
      >
        Tolak
      </button>
    </div>
  )
}
