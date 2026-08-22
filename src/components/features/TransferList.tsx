"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock3, Eye, FileImage, Loader2, ReceiptText, RefreshCw, UploadCloud, X } from "lucide-react"
import type { Purchase, PurchaseItem, Supplier } from "@prisma/client"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { skemaPembayaran, statusPembayaran } from "@/lib/paymentStatus"

type TransferFilter = "all" | "pending" | "transferred" | "termin"
type PurchaseWithRelations = Purchase & { supplier: Supplier; items: PurchaseItem[] }

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
}

export default function TransferList({ purchases }: { purchases: PurchaseWithRelations[] }) {
  const router = useRouter()
  const [uploading, setUploading] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null)
  const [activeFilter, setActiveFilter] = useState<TransferFilter>("all")
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const { confirm, dialog } = useConfirm()
  const { toast, host: toastHost } = useToast()

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
      toast(e.message, "error")
    } finally {
      setUploading(null)
    }
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const isTransferred = purchase.status_approval === "sudah_transfer"
    const isPendingTermin = purchase.status_pelunasan === "BELUM_LUNAS" && (purchase.nominal_belum_lunas || 0) > 0

    if (activeFilter === "pending") return !isTransferred
    if (activeFilter === "transferred") return isTransferred
    if (activeFilter === "termin") return isPendingTermin
    return true
  })

  const filterOptions: { id: TransferFilter; label: string; count: number }[] = [
    { id: "all", label: "Semua", count: purchases.length },
    { id: "pending", label: "Menunggu", count: purchases.filter((purchase) => purchase.status_approval !== "sudah_transfer").length },
    { id: "transferred", label: "Selesai", count: purchases.filter((purchase) => purchase.status_approval === "sudah_transfer").length },
    {
      id: "termin",
      label: "Termin",
      count: purchases.filter((purchase) => purchase.status_pelunasan === "BELUM_LUNAS" && (purchase.nominal_belum_lunas || 0) > 0).length,
    },
  ]

  return (
    <>
      {dialog}
      {toastHost}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xl" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/60 bg-white/92 shadow-[0_32px_90px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Bukti Transfer</p>
                <p className="mt-0.5 text-sm font-black text-slate-950">{preview.title}</p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="premium-button grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                aria-label="Tutup preview bukti transfer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative h-[72vh] w-full bg-slate-100/70 p-3">
              <Image
                src={preview.src}
                alt="Bukti Transfer"
                fill
                unoptimized
                sizes="(min-width: 768px) 42rem, 100vw"
                className="rounded-3xl bg-white object-contain shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {purchases.length > 0 && (
          <div className="interactive-surface flex flex-col gap-4 border border-slate-200/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Payment queue</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">Prioritaskan bukti transfer dan termin yang belum lunas.</p>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-slate-200 p-1 sm:flex" style={{ background: "var(--bg-tint)" }}>
              {filterOptions.map((option) => {
                const active = activeFilter === option.id
                return (
                  <button
                    key={option.id}
                    onClick={() => setActiveFilter(option.id)}
                    className="premium-button rounded-lg px-3.5 py-2 text-xs font-black transition-all"
                    style={active
                      ? { background: "var(--surface)", color: "var(--text, #14181A)", boxShadow: "0 1px 3px rgba(20,24,26,0.12)" }
                      : { color: "var(--muted, #5B6560)" }}
                  >
                    {option.label} <span style={{ color: active ? "var(--brand)" : "var(--muted-faint, #8A938D)" }}>{option.count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {purchases.length === 0 && (
          <div className="workflow-card p-12 text-center text-sm font-medium text-slate-400">
            Belum ada transaksi yang sudah disetujui.
          </div>
        )}

        {purchases.length > 0 && filteredPurchases.length === 0 && (
          <div className="workflow-card p-12 text-center">
            <ReceiptText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Tidak ada transaksi pada filter ini.</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Pilih filter lain untuk melihat antrean pembayaran.</p>
          </div>
        )}

        {filteredPurchases.map((p) => {
          const total = p.total_dibayar ?? p.total_nilai_setelah_retur ?? p.items.reduce((s, i) => s + i.subtotal, 0)
          const isTransferred = p.status_approval === "sudah_transfer"
          const isPendingTermin = p.status_pelunasan === "BELUM_LUNAS" && (p.nominal_belum_lunas || 0) > 0
          const isUploading = uploading === p.id
          const buktiTransfer = p.bukti_transfer

          return (
            <article
              key={p.id}
              className={`interactive-surface group overflow-hidden border p-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isTransferred ? "border-emerald-200/80 bg-emerald-50/20" : "border-slate-200/80 bg-white/88"
              }`}
            >
              <div className="grid gap-px bg-slate-200/60 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="bg-white/82 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${
                            isTransferred
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isTransferred ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                          {isTransferred ? "Sudah Transfer" : "Menunggu Transfer"}
                        </span>
                        {isPendingTermin && (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                            Termin {formatRp(p.nominal_belum_lunas || 0)}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 truncate text-lg font-black tracking-[-0.02em] text-slate-950">{p.supplier.nama}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {formatDate(p.createdAt)} / {p.items.length} jenis barang
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Total Dibayar</p>
                      <p className="mt-1 whitespace-nowrap text-xl font-black tracking-[-0.03em] text-slate-950">{formatRp(total)}</p>
                    </div>
                  </div>

                  {/* Dua kolom yang dulu ditumpuk jadi satu: "Status
                      Pelunasan" berisi LUNAS/BELUM_LUNAS, yang sebenarnya
                      menerangkan CARA membayarnya (sekaligus atau dicicil),
                      bukan apakah sudah dibayar. Nota yang belum ditransfer
                      pun terbaca LUNAS. Sekarang dipisah: skema di satu
                      kolom, kenyataan pembayarannya di kolom lain. */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <PaymentInfo label="Nota" value={p.nomor_nota || p.id.slice(0, 8).toUpperCase()} />
                    <PaymentInfo label="Skema Bayar" value={skemaPembayaran(p.status_pelunasan).label} />
                    <PaymentInfo
                      label="Status Bayar"
                      value={statusPembayaran(p).label}
                      emphasize={statusPembayaran(p).tone === "warning"}
                    />
                    <PaymentInfo label="Tanggal Transfer" value={p.tanggal_transfer ? formatDateTime(p.tanggal_transfer) : "-"} />
                  </div>
                </div>

                <div className="flex flex-col justify-between bg-white/92 p-5">
                  {isTransferred && buktiTransfer ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => setPreview({ src: buktiTransfer, title: p.supplier.nama })}
                        className="group/preview relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.16)]"
                      >
                        <Image
                          src={buktiTransfer}
                          alt="Bukti"
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 260px, 50vw"
                          className="object-cover transition-transform duration-700 group-hover/preview:scale-[1.04]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors duration-300 group-hover/preview:bg-slate-950/28">
                          <span className="grid h-11 w-11 scale-90 place-items-center rounded-full bg-white/92 text-slate-950 opacity-0 shadow-lg transition-all duration-300 group-hover/preview:scale-100 group-hover/preview:opacity-100">
                            <Eye className="h-4 w-4" />
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Ganti bukti transfer?",
                            description: "Bukti transfer yang sudah ada tidak akan bisa diakses lagi setelah diganti.",
                            confirmLabel: "Ya, ganti",
                          })
                          if (ok) fileRefs.current[p.id]?.click()
                        }}
                        disabled={isUploading}
                        className="premium-button flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {isUploading ? "Mengupload..." : "Ganti Bukti"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-44 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm">
                        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                      </div>
                      <p className="mt-3 text-sm font-black text-slate-950">{isUploading ? "Mengupload bukti..." : "Upload Bukti Transfer"}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-400">Maksimal 2 MB. Format gambar.</p>
                      <button
                        onClick={() => fileRefs.current[p.id]?.click()}
                        disabled={isUploading}
                        className="premium-button mt-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <FileImage className="h-4 w-4" />
                        Pilih File
                      </button>
                    </div>
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
            </article>
          )
        })}
      </div>
    </>
  )
}

function PaymentInfo({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/74 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-sm font-black ${emphasize ? "text-amber-700" : "text-slate-900"}`}>{value}</p>
    </div>
  )
}
