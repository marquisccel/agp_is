"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock3, Eye, FileImage, Loader2, ReceiptText, RefreshCw, UploadCloud, X } from "lucide-react"
import type { Purchase, PurchaseItem, Supplier } from "@prisma/client"
import ElegantSelect from "@/components/ui/ElegantSelect"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"
import { skemaPembayaran, statusPembayaran } from "@/lib/paymentStatus"
import { kewajibanKeLapak } from "@/lib/settlement"
import KoreksiKekurangan from "@/components/features/KoreksiKekurangan"

type TransferFilter = "all" | "pending" | "transferred" | "termin"
type PurchaseWithRelations = Purchase & {
  supplier: Supplier
  items: PurchaseItem[]
  /** Hanya diisi pada tampilan Manager, yang melihat seluruh gudang. */
  warehouse?: { id: string; nama: string }
}

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
}

export default function TransferList({
  purchases,
  warehouses,
  bolehKoreksi = false,
}: {
  purchases: PurchaseWithRelations[]
  /**
   * Diisi hanya untuk Manager, yang melihat seluruh gudang sekaligus.
   * Kalau kosong, penyaring gudangnya tidak ditampilkan -- Admin memang
   * cuma punya satu gudang, jadi penyaringnya tidak berarti apa-apa.
   */
  warehouses?: { id: string; nama: string }[]
  /**
   * Layar ini juga dibuka Staff, tapi jalur koreksinya hanya untuk Admin
   * gudang dan Manager. Tanpa penanda ini tombolnya tetap tampil untuk
   * Staff dan berakhir 401 -- perjalanan yang tidak pernah bisa selesai,
   * pola yang sama dengan tombol Edit pada nota yang sudah ditransfer.
   */
  bolehKoreksi?: boolean
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null)
  const [activeFilter, setActiveFilter] = useState<TransferFilter>("all")
  const [gudangTerpilih, setGudangTerpilih] = useState("all")
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
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Gagal upload bukti transfer", "error")
    } finally {
      setUploading(null)
    }
  }

  const seGudang = (purchase: PurchaseWithRelations) =>
    gudangTerpilih === "all" || purchase.warehouseId === gudangTerpilih

  const filteredPurchases = purchases.filter((purchase) => {
    if (!seGudang(purchase)) return false

    const isTransferred = purchase.status_approval === "sudah_transfer"
    const isPendingTermin = purchase.status_pelunasan === "BELUM_LUNAS" && (purchase.nominal_belum_lunas || 0) > 0

    if (activeFilter === "pending") return !isTransferred
    if (activeFilter === "transferred") return isTransferred
    if (activeFilter === "termin") return isPendingTermin
    return true
  })

  const dalamGudang = purchases.filter(seGudang)
  const filterOptions: { id: TransferFilter; label: string; count: number }[] = [
    { id: "all", label: "Semua", count: dalamGudang.length },
    { id: "pending", label: "Menunggu", count: dalamGudang.filter((purchase) => purchase.status_approval !== "sudah_transfer").length },
    { id: "transferred", label: "Selesai", count: dalamGudang.filter((purchase) => purchase.status_approval === "sudah_transfer").length },
    {
      id: "termin",
      label: "Termin",
      count: dalamGudang.filter((purchase) => purchase.status_pelunasan === "BELUM_LUNAS" && (purchase.nominal_belum_lunas || 0) > 0).length,
    },
  ]

  return (
    <>
      {dialog}
      {toastHost}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xl" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[var(--radius-lg)] border shadow-[0_32px_90px_rgba(15,23,42,0.28)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="section-eyebrow">Bukti transfer</span>
                <p className="mt-0.5 text-sm font-black text-slate-950">{preview.title}</p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="btn-netral premium-button grid h-9 w-9 place-items-center !rounded-full"
                aria-label="Tutup preview bukti transfer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative h-[72vh] w-full p-3" style={{ background: "var(--surface-sunken)" }}>
              <Image
                src={preview.src}
                alt="Bukti Transfer"
                fill
                unoptimized
                sizes="(min-width: 768px) 42rem, 100vw"
                className="rounded-[var(--radius-md)] bg-white object-contain shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {purchases.length > 0 && (
          <div className="section section-body flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="section-eyebrow">Antrean pembayaran</span>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--muted)" }}>
                Prioritaskan bukti transfer dan termin yang belum lunas.
              </p>
            </div>
            {/* Kontrol ini dulu menyusun ulang tampilan .segmented dengan
                tangan, lengkap dengan bayangan dan warna aktifnya sendiri.
                Bentuknya jadi mirip tapi tidak sama dengan penyaring di
                layar lain. */}
            <div className="flex flex-wrap items-center gap-3">
            {warehouses && warehouses.length > 0 && (
              <ElegantSelect
                value={gudangTerpilih}
                options={[{ value: "all", label: "Semua Gudang" }, ...warehouses.map((w) => ({ value: w.id, label: w.nama }))]}
                onChange={setGudangTerpilih}
                ariaLabel="Pilih gudang"
                className="w-44"
              />
            )}
            <div className="segmented flex-wrap">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveFilter(option.id)}
                  className={activeFilter === option.id ? "active" : ""}
                >
                  {/* Dulu "Semua" dan "1" menempel jadi "Semua1": keduanya
                      item flex terpisah, dan spasi di antaranya diciutkan.
                      Kurung membuat angkanya terbaca sebagai jumlah, bukan
                      sambungan kata. */}
                  <span>{option.label}</span>
                  <span style={{ color: activeFilter === option.id ? "var(--brand)" : "var(--muted-faint)" }}>
                    ({option.count})
                  </span>
                </button>
              ))}
            </div>
            </div>
          </div>
        )}

        {purchases.length === 0 && (
          <div className="section section-body p-12 text-center text-sm font-medium" style={{ color: "var(--muted-faint)" }}>
            Belum ada transaksi yang sudah disetujui.
          </div>
        )}

        {purchases.length > 0 && filteredPurchases.length === 0 && (
          <div className="section section-body p-12 text-center">
            <ReceiptText className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--muted-faint)" }} />
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
            /* Kartu yang sudah ditransfer dulu diberi tepi dan latar hijau
               tipis. Karena hampir semua nota lama berakhir di keadaan itu,
               daftarnya berangsur jadi hijau seluruhnya dan warnanya tidak
               lagi membedakan apa pun -- sementara nota yang justru perlu
               dikerjakan tenggelam di antaranya. Keadaannya sudah dinyatakan
               lencana di dalam kartu. */
            <article key={p.id} className="section overflow-hidden p-0">
              <div className="grid gap-px lg:grid-cols-[minmax(0,1fr)_260px]" style={{ background: "var(--border)" }}>
                <div className="p-5" style={{ background: "var(--surface)" }}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                          style={isTransferred
                            ? { background: "var(--success-soft)", color: "var(--success)" }
                            : { background: "var(--warning-soft)", color: "var(--warning)" }}
                        >
                          {isTransferred ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                          {isTransferred ? "Sudah Transfer" : "Menunggu Transfer"}
                        </span>
                        {/* Sisa termin adalah uang yang masih kurang dibayar
                            ke lapak. Dulu abu netral, sewarna dengan
                            keterangan biasa. */}
                        {isPendingTermin && (
                          <span
                            className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
                            style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
                          >
                            Kurang {formatRp(p.nominal_belum_lunas || 0)}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 truncate text-lg font-black tracking-[-0.02em]" style={{ color: "var(--foreground)" }}>{p.supplier.nama}</h3>
                      <p className="mt-1 text-xs font-semibold" style={{ color: "var(--muted-faint)" }}>
                        {p.warehouse ? `${p.warehouse.nama} \u00b7 ` : ""}
                        {formatDate(p.createdAt)} &middot; {p.items.length} jenis barang
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="field-label" style={{ marginBottom: 2 }}>Nilai Transfer</span>
                      <p className="whitespace-nowrap text-xl font-black tracking-[-0.03em]" style={{ color: "var(--foreground)" }}>{formatRp(total)}</p>
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

                <div className="flex flex-col justify-between p-5" style={{ background: "var(--surface)" }}>
                  {isTransferred && buktiTransfer ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => setPreview({ src: buktiTransfer, title: p.supplier.nama })}
                        className="group/preview relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-md)] border shadow-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.16)]"
                        style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
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
                      {/* Dua aksi sebaris. Keduanya sama-sama membetulkan
                          catatan pembayaran nota ini, jadi berdiri
                          berdampingan; kolom kanan ini sempit, jadi tiap
                          tombol mengambil separuhnya dan labelnya dipendekkan
                          supaya tidak patah. */}
                      <div className="flex gap-2">
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
                          className="btn-netral premium-button flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm disabled:opacity-60"
                        >
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          {isUploading ? "Mengupload..." : "Ganti Bukti"}
                        </button>
                        {bolehKoreksi && !isPendingTermin && (
                          <KoreksiKekurangan
                            purchaseId={p.id}
                            kewajiban={kewajibanKeLapak(p)}
                            namaLapak={p.supplier.nama}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-44 flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed p-5 text-center" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}>
                      <div className="grid h-12 w-12 place-items-center rounded-[var(--radius-sm)] shadow-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                      </div>
                      <p className="mt-3 text-sm font-black" style={{ color: "var(--foreground)" }}>{isUploading ? "Mengupload bukti..." : "Upload Bukti Transfer"}</p>
                      <p className="mt-1 text-xs font-medium leading-5" style={{ color: "var(--muted-faint)" }}>Maksimal 2 MB. Format gambar.</p>
                      <button
                        onClick={() => fileRefs.current[p.id]?.click()}
                        disabled={isUploading}
                        className="btn-primer premium-button mt-4 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold disabled:opacity-60"
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
    <div className="rounded-[var(--radius-sm)] border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}>
      <span className="field-label" style={{ marginBottom: 2 }}>{label}</span>
      <p className="truncate text-sm font-black" style={{ color: emphasize ? "var(--warning)" : "var(--foreground)" }}>{value}</p>
    </div>
  )
}
