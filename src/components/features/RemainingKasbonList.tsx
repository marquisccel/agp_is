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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse space-y-4">
        <div className="h-5 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm">
        Peringatan: {error}
      </div>
    )
  }

  // Calculate total outstanding kasbon
  const totalOutstanding = data.reduce((sum, item) => sum + item.remaining, 0)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shadow-rose-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base md:text-lg">Kontrol Kasbon Lapak</h3>
            <p className="text-xs text-slate-500">Daftar lapak yang masih memiliki saldo sisa kasbon aktif.</p>
          </div>
        </div>

        {data.length > 0 && (
          <div className="bg-gradient-to-r from-rose-50 to-red-50 border border-rose-100 rounded-xl px-4 py-2 text-right">
            <span className="text-xs font-semibold text-slate-500 block">Total Sisa Kasbon</span>
            <span className="text-base font-extrabold text-rose-600">{fmtRp(totalOutstanding)}</span>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <svg className="mx-auto h-10 w-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500 font-semibold text-sm">Semua Kasbon Lunas!</p>
          <p className="text-slate-400 text-xs mt-0.5">Tidak ada sisa kasbon menggantung dari lapak saat ini.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Nama Lapak</th>
                <th className="py-3 px-4 text-right">Total Kasbon</th>
                <th className="py-3 px-4 text-right">Telah Dipakai</th>
                <th className="py-3 px-4 text-right">Sisa Kasbon</th>
                <th className="py-3 px-4 text-center">Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.map((item) => (
                <tr
                  key={item.supplierId}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-slate-800">{item.supplierNama}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{fmtRp(item.totalApproved)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{fmtRp(item.totalUsed)}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-rose-600 bg-rose-50/30">
                    {fmtRp(item.remaining)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
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
  )
}
