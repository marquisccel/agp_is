"use client"

import { useState, useEffect } from "react"
import { fmtRp } from "@/lib/format"

interface DPSummaryItem {
  supplierId: string
  supplierNama: string
  kontakWa: string | null
  totalApproved: number
  totalUsed: number
  remaining: number
  totalDeliveries: number
}

export default function RemainingKasbonList() {
  const [data, setData] = useState<DPSummaryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dp/summary")
        if (!res.ok) throw new Error("Gagal mengambil data rekap kasbon")
        const json = await res.json()
        // Filter only those with outstanding remaining kasbon
        setData(json.filter((item: DPSummaryItem) => item.remaining > 0))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="section">
        <div className="section-body animate-pulse space-y-3">
          <div className="h-5 w-1/3 rounded-[var(--radius-sm)]" style={{ background: "var(--border)" }} />
          <div className="h-10 rounded-[var(--radius-sm)]" style={{ background: "var(--bg-tint)" }} />
          <div className="h-10 rounded-[var(--radius-sm)]" style={{ background: "var(--bg-tint)" }} />
          <div className="h-10 rounded-[var(--radius-sm)]" style={{ background: "var(--bg-tint)" }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="notice tone-warning">
        <span className="notice-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        <div>
          <h3 className="notice-title">Kasbon gagal dimuat</h3>
          <p className="notice-body">{error}</p>
        </div>
      </div>
    )
  }

  // Calculate total outstanding kasbon
  const totalOutstanding = data.reduce((sum, item) => sum + item.remaining, 0)

  return (
    <div className="section">
      <div className="section-shell-head">
        <div className="flex items-center gap-3">
          {/* Ikon dulu berlatar merah pekat dengan bayangan berwarna,
              padahal kartu ini cuma menampilkan daftar -- bukan
              peringatan. Warnanya disamakan dengan ikon judul bagian di
              layar lain: brand-soft dengan ikon brand-strong. */}
          <span
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px]"
            style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </span>
          <div>
            <span className="section-eyebrow">Kasbon</span>
            <h3 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Kontrol Kasbon Lapak</h3>
          </div>
        </div>

        {data.length > 0 && (
          <div className="text-right">
            <span className="field-label" style={{ marginBottom: 2 }}>Total Sisa Kasbon</span>
            <span
              className="text-base font-extrabold"
              style={{ color: "var(--warning)", fontVariantNumeric: "tabular-nums" }}
            >
              {fmtRp(totalOutstanding)}
            </span>
          </div>
        )}
      </div>

      <div className="section-body">
        <p className="text-xs" style={{ color: "var(--muted-faint)" }}>
          Daftar lapak yang masih memiliki saldo sisa kasbon aktif.
        </p>

        {data.length === 0 ? (
          <div
            className="mt-4 rounded-[var(--radius-md)] border border-dashed py-8 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-sunken)" }}
          >
            <svg className="mx-auto mb-2 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--success)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Semua kasbon lunas</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--muted-faint)" }}>
              Tidak ada sisa kasbon menggantung dari lapak saat ini.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase tracking-wider" style={{ background: "var(--surface-sunken)", borderColor: "var(--border)", color: "var(--muted)" }}>
                  <th className="px-4 py-3">Nama Lapak</th>
                  <th className="px-4 py-3 text-right">Total Kasbon</th>
                  <th className="px-4 py-3 text-right">Telah Dipakai</th>
                  <th className="px-4 py-3 text-right">Sisa Kasbon</th>
                  <th className="px-4 py-3 text-center">Pengiriman</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
                {data.map((item) => (
                  <tr key={item.supplierId} className="transition-colors hover:bg-[var(--bg-tint)]">
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--foreground)" }}>{item.supplierNama}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{fmtRp(item.totalApproved)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{fmtRp(item.totalUsed)}</td>
                    {/* Sisa kasbon dinilai perhatian, bukan kesalahan --
                        amber, senada dengan nada "belum tercapai" di layar
                        target. */}
                    <td className="px-4 py-3 text-right font-extrabold" style={{ color: "var(--warning)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtRp(item.remaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: "var(--bg-tint)", color: "var(--muted)" }}
                      >
                        {item.totalDeliveries}x kirim
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
