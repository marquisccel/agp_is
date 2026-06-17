"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

export default function TransferList({ purchases }: { purchases: any[] }) {
  const router = useRouter()
  const [uploading, setUploading] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleUpload = async (purchaseId: string, file: File) => {
    setUploading(purchaseId)
    try {
      const form = new FormData()
      form.append("bukti", file)
      const res = await fetch(`/api/purchases/${purchaseId}/transfer`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Gagal upload")
      }
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUploading(null)
    }
  }

  return (
    <>
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">Bukti Transfer</span>
              <button onClick={() => setPreview(null)} className="rounded-full px-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                x
              </button>
            </div>
            <img src={preview} alt="Bukti Transfer" className="max-h-[70vh] w-full object-contain" />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {purchases.length === 0 && (
          <div className="workflow-card p-12 text-center text-sm font-medium text-slate-400">
            Belum ada transaksi yang sudah disetujui.
          </div>
        )}

        {purchases.map((p) => {
          const total = p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.items.reduce((s: number, i: any) => s + i.subtotal, 0)
          const isTransferred = p.status_approval === "sudah_transfer"
          const isPendingTermin = p.status_pelunasan === "BELUM_LUNAS" && (p.nominal_belum_lunas || 0) > 0

          return (
            <div
              key={p.id}
              className={`interactive-surface overflow-hidden rounded-2xl border p-5 ${
                isTransferred ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200 bg-white/85"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isTransferred ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {isTransferred ? "Sudah Transfer" : "Menunggu Transfer"}
                  </span>
                  {isPendingTermin && (
                    <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Termin belum lunas {formatRp(p.nominal_belum_lunas || 0)}
                    </span>
                  )}
                  <div className="truncate text-lg font-bold text-slate-900">{p.supplier.nama}</div>
                  <div className="text-xs font-medium text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" })} · {p.items.length} jenis barang
                  </div>
                  <div className="text-lg font-extrabold text-slate-950">{formatRp(total)}</div>
                  {isTransferred && p.tanggal_transfer && (
                    <div className="text-xs font-medium text-emerald-600">
                      Transfer: {new Date(p.tanggal_transfer).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {isTransferred && p.bukti_transfer ? (
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => setPreview(p.bukti_transfer)}
                        className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-emerald-200 shadow-sm"
                      >
                        <img src={p.bukti_transfer} alt="Bukti" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/25 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-xs font-bold text-white">Lihat</span>
                        </div>
                      </button>
                      <button
                        onClick={() => fileRefs.current[p.id]?.click()}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        Ganti Bukti
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRefs.current[p.id]?.click()}
                      disabled={uploading === p.id}
                      className="premium-button flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                      </svg>
                      {uploading === p.id ? "Mengupload..." : "Upload Bukti Transfer"}
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={(el) => {
                      fileRefs.current[p.id] = el
                    }}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(p.id, file)
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
