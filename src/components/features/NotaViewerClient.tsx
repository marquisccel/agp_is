"use client"

import { useRef, useState, useEffect } from "react"
import { PDFDownloadLink } from "@react-pdf/renderer"
import NotaPDF from "./NotaPDF"

// ── Format helpers ──
function fmtRp(n: number) {
  return "Rp " + (n || 0).toLocaleString("id-ID")
}
function fmtKg(n: number) {
  return (n || 0).toFixed(2) + " KG"
}
function fmtTgl(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"
  })
}

// ── Nota visual card (dirender untuk screenshot JPG) ──
function NotaCard({ purchase, notaRef }: { purchase: any; notaRef: React.RefObject<HTMLDivElement | null> }) {
  const items = purchase.items || []
  const returs = purchase.returs || []
  const totalBeratBruto = items.reduce((s: number, i: any) =>
    s + (purchase.metode_pembayaran_terpilih === "TIMBANGAN_LAPAK" ? (i.berat_lapak ?? i.berat_final_item) : i.berat_final_item), 0)

  return (
    <div
      ref={notaRef}
      style={{
        backgroundColor: "#ffffff",
        fontFamily: "Arial, sans-serif",
        width: "100%",
        maxWidth: 400,
        padding: 18,
        borderRadius: 28,
        border: "1px solid #edf0f4",
        boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "left", paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: "#007a73", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Nota Pembelian PET Final
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#020617", marginTop: 2, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
          {purchase.warehouse?.nama || "—"}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
          No. {purchase.nomor_nota || purchase.id.split("-")[0].toUpperCase()}
        </div>
      </div>

      {/* Meta */}
      <table style={{ width: "100%", fontSize: 11, marginBottom: 14, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ color: "#64748b", paddingBottom: 4, width: "45%" }}>Tanggal:</td>
            <td style={{ fontWeight: 700, color: "#0f172a", textAlign: "right" }}>
              {fmtTgl(purchase.approvedAt || purchase.createdAt)}
            </td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", paddingBottom: 4 }}>Supplier / Lapak:</td>
            <td style={{ fontWeight: 700, color: "#0f172a", textAlign: "right" }}>{purchase.supplier?.nama}</td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", paddingBottom: 4 }}>Timbangan:</td>
            <td style={{ fontWeight: 700, color: "#0f172a", textAlign: "right", fontSize: 10 }}>
              {purchase.metode_pembayaran_terpilih === "TIMBANGAN_LAPAK" ? "Timbangan Lapak" : "Timbangan Gudang"}
            </td>
          </tr>
          <tr>
            <td style={{ color: "#64748b" }}>Total Berat Bruto:</td>
            <td style={{ fontWeight: 700, color: "#0f172a", textAlign: "right" }}>{fmtKg(totalBeratBruto)}</td>
          </tr>
        </tbody>
      </table>

      {/* Items */}
      <div style={{ marginBottom: 14 }}>
        <table style={{ width: "100%", fontSize: 10, borderCollapse: "separate", borderSpacing: "0 6px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0 4px 4px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>SKU</th>
              <th style={{ textAlign: "right", padding: "0 4px 4px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Berat</th>
              <th style={{ textAlign: "right", padding: "0 4px 4px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Harga</th>
              <th style={{ textAlign: "right", padding: "0 4px 4px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => {
              const berat = purchase.metode_pembayaran_terpilih === "TIMBANGAN_LAPAK"
                ? (item.berat_lapak ?? item.berat_final_item) : item.berat_final_item
              return (
                <tr key={i} style={{ backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "9px 8px", fontWeight: 700, color: "#0f172a", borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
                    {item.sku_name}{item.spec ? ` (${item.spec})` : ""}
                  </td>
                  <td style={{ padding: "9px 6px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>{fmtKg(berat)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                    {fmtRp(item.harga_per_kg)}/kg
                  </td>
                  <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                    {fmtRp(item.subtotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Returs */}
      {returs.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 12px", backgroundColor: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>Potongan / Retur</div>
          {returs.map((r: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
              <span style={{ color: "#64748b" }}>{r.sku_name} — {fmtKg(r.berat_retur)} ({r.alasan || "—"})</span>
              <span style={{ color: "#dc2626", fontWeight: 700 }}>-{fmtRp(r.potongan_nilai)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 11 }}>
        {[
          { label: "Subtotal", value: purchase.total_nilai_sebelum_retur || 0, red: false },
          ...(purchase.total_potongan_retur > 0 ? [{ label: "Potongan Retur", value: -(purchase.total_potongan_retur), red: true }] : []),
          ...(purchase.potongan_sampah > 0 ? [{ label: `Potongan Sampah (${fmtKg(purchase.berat_potongan_sampah)})`, value: -(purchase.potongan_sampah), red: true }] : []),
          ...(purchase.potongan_susut > 0 ? [{ label: `Potongan Susut (${fmtKg(purchase.berat_potongan_susut)})`, value: -(purchase.potongan_susut), red: true }] : []),
          ...(purchase.potongan_air > 0 ? [{ label: `Potongan Air (${fmtKg(purchase.berat_potongan_air)})`, value: -(purchase.potongan_air), red: true }] : []),
          ...(purchase.potongan_karung > 0 ? [{ label: `Potongan Karung (${fmtKg(purchase.berat_potongan_karung)})`, value: -(purchase.potongan_karung), red: true }] : []),
          ...(purchase.dp_yang_digunakan > 0 ? [{ label: "Gunakan DP", value: -(purchase.dp_yang_digunakan), red: true }] : []),
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>{row.label}:</span>
            <span style={{ fontWeight: 600, color: row.red ? "#dc2626" : "#0f172a" }}>
              {row.value < 0 ? `-${fmtRp(Math.abs(row.value))}` : fmtRp(row.value)}
            </span>
          </div>
        ))}

        {/* Grand total */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc", padding: "12px 14px", borderRadius: 18, marginLeft: -12, marginRight: -12
        }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>TOTAL DIBAYAR</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#007a73" }}>{fmtRp(purchase.total_dibayar || 0)}</span>
        </div>

        {/* Pelunasan info */}
        {purchase.status_pelunasan === "BELUM_LUNAS" && (
          <div style={{ marginTop: 10, padding: "8px 12px", backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, fontSize: 10 }}>
            <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 2 }}>⚠️ Pembayaran Bertahap</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ color: "#78716c" }}>Pembayaran Awal ({purchase.persentase_pembayaran || 80}%):</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>{fmtRp(purchase.nominal_pembayaran_awal || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#78716c" }}>Sisa Belum Lunas:</span>
              <span style={{ fontWeight: 700, color: "#dc2626" }}>{fmtRp(purchase.nominal_belum_lunas || 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 9, color: "#94a3b8" }}>
          PET Final • {purchase.warehouse?.nama} • {fmtTgl(purchase.approvedAt || purchase.createdAt)}
        </div>
        <div style={{ fontSize: 9, color: "#cbd5e1", marginTop: 2 }}>
          ID: {purchase.id.split("-")[0].toUpperCase()}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──
export default function NotaViewerClient({
  purchase,
  qrCodeUrl,
}: {
  purchase: any
  qrCodeUrl: string
}) {
  const notaRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [phase, setPhase] = useState<"preview" | "done">("preview")
  const [jpgLoading, setJpgLoading] = useState(false)
  const [jpgUrl, setJpgUrl] = useState<string | null>(null)

  useEffect(() => { setIsClient(true) }, [])

  // ── Capture JPG using html2canvas ──
  const captureJpg = async (): Promise<string | null> => {
    if (!notaRef.current) return null
    const originalWidth = notaRef.current.style.width
    try {
      // Force width to 400px temporarily so html2canvas renders full desktop scale for clean image export
      notaRef.current.style.width = "400px"
      
      const { default: html2canvas } = await import("html2canvas")
      const canvas = await html2canvas(notaRef.current, {
        scale: 3,           // High resolution for mobile
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 400,
        windowWidth: 400,
      })
      
      notaRef.current.style.width = originalWidth
      return canvas.toDataURL("image/jpeg", 0.92)
    } catch (e) {
      console.error("html2canvas error", e)
      if (notaRef.current) {
        notaRef.current.style.width = originalWidth
      }
      return null
    }
  }

  // ── Download JPG ──
  const handleDownloadJpg = async () => {
    setJpgLoading(true)
    const url = jpgUrl || await captureJpg()
    if (url) {
      setJpgUrl(url)
      const a = document.createElement("a")
      a.href = url
      a.download = `Nota-${purchase.nomor_nota || purchase.id}.jpg`
      a.click()
    }
    setJpgLoading(false)
  }

  // ── Share to WA ──
  const handleShareWa = async () => {
    const nomor = purchase.supplier?.kontak_wa
    if (!nomor) {
      alert("Nomor WA supplier tidak tersedia.")
      return
    }

    // Build text summary
    const totalDibayar = fmtRp(purchase.total_dibayar || 0)
    const tanggal = fmtTgl(purchase.approvedAt || purchase.createdAt)
    const itemLines = (purchase.items || [])
      .map((i: any) => `  • ${i.sku_name}: ${fmtKg(i.berat_final_item)} × ${fmtRp(i.harga_per_kg)}/kg = ${fmtRp(i.subtotal)}`)
      .join("\n")

    const msg = [
      `*NOTA PEMBELIAN PET FINAL*`,
      `${purchase.warehouse?.nama || ""} — ${tanggal}`,
      `No. Nota: ${purchase.nomor_nota || "—"}`,
      ``,
      `*Detail:*`,
      itemLines,
      ``,
      purchase.total_potongan_retur > 0 ? `  • Potongan Retur: -${fmtRp(purchase.total_potongan_retur)}` : "",
      purchase.potongan_sampah > 0 ? `  • Potongan Sampah: -${fmtRp(purchase.potongan_sampah)}` : "",
      purchase.potongan_susut > 0 ? `  • Potongan Susut: -${fmtRp(purchase.potongan_susut)}` : "",
      purchase.potongan_air > 0 ? `  • Potongan Air: -${fmtRp(purchase.potongan_air)}` : "",
      purchase.potongan_karung > 0 ? `  • Potongan Karung: -${fmtRp(purchase.potongan_karung)}` : "",
      purchase.dp_yang_digunakan > 0 ? `  • Gunakan DP: -${fmtRp(purchase.dp_yang_digunakan)}` : "",
      (purchase.total_potongan_retur > 0 || purchase.potongan_sampah > 0 || purchase.potongan_susut > 0 || purchase.potongan_air > 0 || purchase.potongan_karung > 0 || purchase.dp_yang_digunakan > 0) ? `` : "",
      `*TOTAL DIBAYAR: ${totalDibayar}*`,
      purchase.status_pelunasan === "BELUM_LUNAS"
        ? `_(Pembayaran ${purchase.persentase_pembayaran || 80}% dahulu: ${fmtRp(purchase.nominal_pembayaran_awal || 0)}, sisa: ${fmtRp(purchase.nominal_belum_lunas || 0)})_`
        : `_(Lunas)_`,
      ``,
      `Terima kasih ✅`,
    ].filter(val => val !== "").join("\n")

    const waUrl = `https://wa.me/${nomor.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30 p-4 sm:p-8 flex flex-col items-center">
      {/* Page header */}
      <div className="w-full max-w-md mb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Transaksi Disetujui!</h1>
        <p className="text-slate-500 text-sm mt-1">
          Periksa nota di bawah sebelum mengunduh atau berbagi.
        </p>
      </div>

      {/* ── NOTA PREVIEW ── */}
      <div className="mb-6 w-full max-w-[400px] px-1 flex justify-center">
        <NotaCard purchase={purchase} notaRef={notaRef} />
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="w-full max-w-md space-y-3">

        {/* Download JPG */}
        <button
          onClick={handleDownloadJpg}
          disabled={jpgLoading}
          className="premium-button flex w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-950 py-3.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {jpgLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Menyiapkan Gambar...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Download Foto Nota (JPG)
            </>
          )}
        </button>

        {/* Share to WA */}
        <button
          onClick={handleShareWa}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-green-400 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.107 1.523 5.83L.057 23.891a.5.5 0 0 0 .624.625l6.066-1.466A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.013-1.375l-.36-.214-3.73.902.918-3.729-.234-.382A9.818 9.818 0 1 1 12 21.818z"/>
          </svg>
          Share Ringkasan ke WhatsApp
        </button>

        {/* Download PDF */}
        {isClient && (
          <PDFDownloadLink
            document={<NotaPDF purchase={purchase} qrCodeUrl={qrCodeUrl} />}
            fileName={`Nota-${purchase.nomor_nota || purchase.id}.pdf`}
            className="block"
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <button
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60"
              >
                {loading ? (
                  "Menyiapkan PDF..."
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    Download PDF Nota
                  </>
                )}
              </button>
            )}
          </PDFDownloadLink>
        )}

        {/* Lewati */}
        <button
          onClick={() => window.history.back()}
          className="w-full py-3 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
        >
          Lewati — Tutup halaman ini
        </button>
      </div>

      {/* Info */}
      <p className="text-xs text-slate-400 text-center mt-6 max-w-xs">
        Foto nota sudah dioptimalkan untuk layar mobile. Download JPG untuk simpan di galeri atau kirim langsung via WA.
      </p>
    </div>
  )
}
