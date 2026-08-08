"use client"

import { PDFDownloadLink } from "@react-pdf/renderer"
import NotaPDF from "./NotaPDF"
import { useState, useEffect } from "react"
import type { PurchaseDTO } from "@/types/purchase"

export default function DownloadNotaButton({ purchase, qrCodeUrl }: { purchase: PurchaseDTO, qrCodeUrl: string }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return <button className="px-4 py-2 bg-slate-200 rounded animate-pulse">Loading PDF...</button>

  return (
    <PDFDownloadLink
      document={<NotaPDF purchase={purchase} qrCodeUrl={qrCodeUrl} />}
      fileName={`Nota-${purchase.nomor_nota || purchase.id}.pdf`}
    >
      {({ loading }: { loading: boolean }) =>
        loading ? (
          <button className="px-6 py-3 bg-cyan-100 text-cyan-600 rounded-xl font-medium animate-pulse cursor-wait">
            Menyiapkan PDF...
          </button>
        ) : (
          <button className="premium-button rounded-xl bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800">
            Download PDF Nota
          </button>
        )
      }
    </PDFDownloadLink>
  )
}
