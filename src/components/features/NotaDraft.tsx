"use client"

import { useRef, useState } from "react"
import { fmtAngka } from "@/lib/format"
import { Download, X, CheckCircle } from "lucide-react"

interface NotaItem {
  sku_name: string
  spec?: string
  berat_estimasi: number
  harga_per_kg: number
}

interface NotaData {
  supplierNama: string
  supplierKontakWa?: string | null
  gudangNama: string
  items: NotaItem[]
  tanggal: string
  nomorDraft: string
  potonganSampah: number
  beratPotonganSampah: number
  hargaPotonganSampah: number
  potonganSusut: number
  beratPotonganSusut: number
  hargaPotonganSusut: number
  potonganAir: number
  beratPotonganAir: number
  hargaPotonganAir: number
  potonganKarung: number
  beratPotonganKarung: number
  hargaPotonganKarung: number
}

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
}

// Renders the nota HTML using only inline styles to avoid html2canvas "lab" color bugs from Tailwind.
function NotaContent({ data }: { data: NotaData }) {
  const totalEstimasi = data.items.reduce((sum, i) => sum + i.berat_estimasi * i.harga_per_kg, 0)
  const totalBerat = data.items.reduce((sum, i) => sum + i.berat_estimasi, 0)
  const totalDeductions = (data.potonganSampah || 0) + (data.potonganSusut || 0) + (data.potonganAir || 0) + (data.potonganKarung || 0)
  const totalEstimasiSetelahPotongan = Math.max(totalEstimasi - totalDeductions, 0)

  return (
    <div style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", border: "1px solid #edf0f4", borderRadius: 28, padding: "22px 18px", width: "100%", maxWidth: "400px", margin: "0 auto", boxSizing: "border-box", boxShadow: "0 18px 50px rgba(15,23,42,0.08)" }}>
      {/* Header */}
      <div style={{ textAlign: "left", paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: "#007a73", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
          Nota Timbangan - Draft
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#020617", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
          {data.gudangNama}
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 8 }}>
          DOKUMEN DRAFT - Belum Final
        </div>
      </div>

      {/* Meta Info */}
      <table style={{ width: "100%", fontSize: 11, marginBottom: 16, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ color: "#64748b", paddingBottom: 3, width: "45%" }}>Tanggal</td>
            <td style={{ fontWeight: 600, textAlign: "right", color: "#1e293b" }}>{data.tanggal}</td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", paddingBottom: 3 }}>No. Draft</td>
            <td style={{ fontFamily: "monospace", fontWeight: 700, textAlign: "right", color: "#1e293b" }}>#{data.nomorDraft}</td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", paddingBottom: 3 }}>Lapak / Supplier</td>
            <td style={{ fontWeight: 700, textAlign: "right", color: "#1e293b" }}>{data.supplierNama}</td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table style={{ width: "100%", fontSize: 9.5, borderCollapse: "separate", borderSpacing: "0 6px", marginBottom: 14 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "0 4px 4px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>SKU</th>
            <th style={{ textAlign: "right", padding: "0 4px 4px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Berat</th>
            <th style={{ textAlign: "right", padding: "0 4px 4px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Harga</th>
            <th style={{ textAlign: "right", padding: "0 4px 4px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} style={{ backgroundColor: "#f8fafc" }}>
              <td style={{ padding: "9px 8px", fontWeight: 700, color: "#0f172a", borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                {item.sku_name}{item.spec ? ` (${item.spec})` : ""}
              </td>
              <td style={{ padding: "9px 6px", textAlign: "right", color: "#334155" }}>{fmtAngka(item.berat_estimasi)} KG</td>
              <td style={{ padding: "9px 6px", textAlign: "right", color: "#334155" }}>{formatRp(item.harga_per_kg)}</td>
              <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: 800, color: "#0f172a", borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>{formatRp(item.berat_estimasi * item.harga_per_kg)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Box */}
      <div style={{ backgroundColor: "#f8fafc", borderRadius: 18, padding: "14px 16px", fontSize: 11, border: "1px solid #eef2f7" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: 6 }}>
          <span>Total Berat Estimasi</span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>{fmtAngka(totalBerat)} KG</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", marginBottom: 6 }}>
          <span>Total Nilai Estimasi (Kotor)</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{formatRp(totalEstimasi)}</span>
        </div>

        {data.potonganSampah > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444", marginBottom: 6 }}>
            <span>
              Potongan Sampah
              <span style={{ fontSize: 9.5, color: "#64748b", display: "block" }}>
                ({fmtAngka(data.beratPotonganSampah)} KG @ {formatRp(data.hargaPotonganSampah)})
              </span>
            </span>
            <span style={{ fontWeight: 600, alignSelf: "flex-end" }}>-{formatRp(data.potonganSampah)}</span>
          </div>
        )}
        {data.potonganSusut > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444", marginBottom: 6 }}>
            <span>
              Potongan Susut Timbangan
              <span style={{ fontSize: 9.5, color: "#64748b", display: "block" }}>
                ({fmtAngka(data.beratPotonganSusut)} KG @ {formatRp(data.hargaPotonganSusut)})
              </span>
            </span>
            <span style={{ fontWeight: 600, alignSelf: "flex-end" }}>-{formatRp(data.potonganSusut)}</span>
          </div>
        )}
        {data.potonganAir > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444", marginBottom: 6 }}>
            <span>
              Potongan Air
              <span style={{ fontSize: 9.5, color: "#64748b", display: "block" }}>
                ({fmtAngka(data.beratPotonganAir)} KG @ {formatRp(data.hargaPotonganAir)})
              </span>
            </span>
            <span style={{ fontWeight: 600, alignSelf: "flex-end" }}>-{formatRp(data.potonganAir)}</span>
          </div>
        )}
        {data.potonganKarung > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444", marginBottom: 6 }}>
            <span>
              Potongan Karung
              <span style={{ fontSize: 9.5, color: "#64748b", display: "block" }}>
                ({fmtAngka(data.beratPotonganKarung)} KG @ {formatRp(data.hargaPotonganKarung)})
              </span>
            </span>
            <span style={{ fontWeight: 600, alignSelf: "flex-end" }}>-{formatRp(data.potonganKarung)}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          <span style={{ color: "#64748b" }}>Estimasi Total Net Payout</span>
          <span style={{ fontWeight: 900, color: "#0891b2", fontSize: 13 }}>{formatRp(totalEstimasiSetelahPotongan)}</span>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px dashed #cbd5e1", textAlign: "center" }}>
        <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2 }}>Nota ini adalah draft estimasi timbangan lapak.</p>
        <p style={{ fontSize: 9, color: "#94a3b8", marginBottom: 16 }}>Berat & nilai final ditentukan setelah double check Admin.</p>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 44, borderBottom: "1px solid #94a3b8", width: 96, marginBottom: 4 }}></div>
            <div>Petugas Gudang</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 44, borderBottom: "1px solid #94a3b8", width: 96, marginBottom: 4 }}></div>
            <div>Penerima / Lapak</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NotaDraft({ data, onClose }: { data: NotaData; onClose: () => void }) {
  // visibleRef = shown in modal preview
  const visibleRef = useRef<HTMLDivElement>(null)
  // hiddenRef = off-screen, clean DOM without Tailwind classes, used for html2canvas capture
  const hiddenRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [saved, setSaved] = useState<"idle" | "downloaded">("idle")

  const handleDownload = async () => {
    if (!hiddenRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")

      const canvas = await html2canvas(hiddenRef.current, {
        scale: 2.5,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.tagName === "LINK" && (el as HTMLLinkElement).rel === "stylesheet",
      })

      const imgData = canvas.toDataURL("image/jpeg", 0.95)
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`nota-draft-${data.nomorDraft}.pdf`)

      setSaved("downloaded")
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  const handleShareWa = () => {
    const nomor = data.supplierKontakWa
    if (!nomor) {
      alert("Nomor WA supplier tidak tersedia.")
      return
    }

    const totalEstimasi = data.items.reduce((sum, i) => sum + i.berat_estimasi * i.harga_per_kg, 0)
    const totalDeductions = (data.potonganSampah || 0) + (data.potonganSusut || 0) + (data.potonganAir || 0) + (data.potonganKarung || 0)
    const totalEstimasiSetelahPotongan = Math.max(totalEstimasi - totalDeductions, 0)

    const itemLines = data.items
      .map((i) => `  • ${i.sku_name}${i.spec ? ` (${i.spec})` : ""}: ${i.berat_estimasi} KG × ${formatRp(i.harga_per_kg)} = ${formatRp(i.berat_estimasi * i.harga_per_kg)}`)
      .join("\n")

    const msg = [
      `*DRAFT NOTA TIMBANGAN LAPAK*`,
      `${data.gudangNama} - ${data.tanggal}`,
      `No. Draft: #${data.nomorDraft}`,
      ``,
      `*Detail:*`,
      itemLines,
      ``,
      data.potonganSampah > 0 ? `  • Potongan Sampah: -${formatRp(data.potonganSampah)}` : "",
      data.potonganSusut > 0 ? `  • Potongan Susut: -${formatRp(data.potonganSusut)}` : "",
      data.potonganAir > 0 ? `  • Potongan Air: -${formatRp(data.potonganAir)}` : "",
      data.potonganKarung > 0 ? `  • Potongan Karung: -${formatRp(data.potonganKarung)}` : "",
      totalDeductions > 0 ? `` : "",
      `*ESTIMASI TOTAL NET PAYOUT: ${formatRp(totalEstimasiSetelahPotongan)}*`,
      `_(Menunggu double check & approval harga)_`,
      ``,
      `Terima kasih`,
    ].filter(Boolean).join("\n")

    const waUrl = `https://wa.me/${nomor.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, "_blank")
  }

  // Success state
  if (saved === "downloaded") {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-xl mb-2">Nota Berhasil Diunduh!</h3>
          <p className="text-slate-500 text-sm mb-1">
            File <span className="font-mono font-semibold">nota-draft-{data.nomorDraft}.pdf</span> telah diunduh.
          </p>
          <p className="text-slate-400 text-xs mb-6">
            Data siap divalidasi oleh Admin.
          </p>
          <button
            onClick={onClose}
            className="premium-button w-full rounded-xl bg-slate-950 py-3 font-bold text-white hover:bg-slate-800"
          >
            Selesai
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Hidden capture target, absolutely positioned off-screen with no Tailwind classes */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          zIndex: -1,
          pointerEvents: "none",
          width: 520,
        }}
      >
        <div ref={hiddenRef}>
          <NotaContent data={data} />
        </div>
      </div>

      {/* Visible modal */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Nota Draft Pembelian</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Periksa detail draft timbangan lapak di bawah ini.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Visible preview */}
          <div className="overflow-auto px-5 py-4 flex-1" ref={visibleRef}>
            <NotaContent data={data} />
          </div>

          {/* Action Buttons */}
          <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-3">
            <p className="text-[11px] text-center text-slate-400">
              Draft berhasil disimpan. Silakan pilih opsi di bawah ini:
            </p>

            <div className="space-y-2">
              {/* Download PDF */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="premium-button flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Membuat PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Unduh PDF Nota
                  </>
                )}
              </button>

              {/* Share to WA */}
              {data.supplierKontakWa && (
                <button
                  onClick={handleShareWa}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold text-sm hover:from-emerald-400 hover:to-green-400 transition-all shadow-md shadow-emerald-500/10"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.107 1.523 5.83L.057 23.891a.5.5 0 0 0 .624.625l6.066-1.466A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.013-1.375l-.36-.214-3.73.902.918-3.729-.234-.382A9.818 9.818 0 1 1 12 21.818z"/>
                  </svg>
                  Share ke WhatsApp
                </button>
              )}

              {/* Skip */}
              <button
                onClick={onClose}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 hover:text-slate-700 transition-all disabled:opacity-50"
              >
                Lewati - Simpan Tanpa Unduh
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
